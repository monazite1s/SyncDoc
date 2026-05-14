import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
    private readonly _logger = new Logger(AuthService.name);

    constructor(
        private readonly _prisma: PrismaService,
        private readonly _jwtService: JwtService,
        private readonly _configService: ConfigService
    ) {}

    /**
     * 用户注册
     */
    async register(dto: RegisterDto) {
        // 检查邮箱和用户名是否已存在
        const existingUser = await this._prisma.user.findFirst({
            where: {
                OR: [{ email: dto.email }, { username: dto.username }],
            },
        });

        if (existingUser) {
            if (existingUser.email === dto.email) {
                throw new ConflictException('该邮箱已被注册');
            }
            throw new ConflictException('该用户名已被使用');
        }

        // 哈希密码
        const hashedPassword = await bcrypt.hash(dto.password, 12);

        // 创建用户
        const user = await this._prisma.user.create({
            data: {
                email: dto.email,
                username: dto.username,
                password: hashedPassword,
                nickname: dto.nickname,
            },
            select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                avatar: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // 生成 token
        const { token, refreshToken } = await this._generateTokens(user.id, user.email);

        this._logger.log(`用户注册成功: ${user.username}`);

        return { user, token, refreshToken };
    }

    /**
     * 用户登录
     */
    async login(dto: LoginDto) {
        const user = await this._validateUser(dto.email, dto.password);

        const { token, refreshToken } = await this._generateTokens(user.id, user.email);

        this._logger.log(`用户登录成功: ${user.username}`);

        // 返回不含密码的用户信息
        const { password: _, ...result } = user;
        return { user: result, token, refreshToken };
    }

    /**
     * 用户登出 - 失效 refresh token
     */
    async logout(userId: string, refreshToken?: string) {
        if (refreshToken) {
            await this._prisma.session.deleteMany({
                where: { userId, refreshToken },
            });
        }

        this._logger.log(`用户登出: ${userId}`);
        return { success: true };
    }

    /**
     * 刷新 access token（refresh 轮换：旧 session 作废后签发新对，降低被盗用窗口）
     */
    async refreshToken(oldRefreshToken: string) {
        // 按 refresh 查库，与登录时写入的 Session 行对应
        const session = await this._prisma.session.findUnique({
            where: { refreshToken: oldRefreshToken },
            include: { user: true },
        });

        if (!session) {
            throw new UnauthorizedException('无效的 refresh token');
        }

        // 服务端以 expiresAt 为准，过期则清理并要求重新登录
        if (new Date() > session.expiresAt) {
            await this._prisma.session.delete({ where: { id: session.id } });
            throw new UnauthorizedException('refresh token 已过期，请重新登录');
        }

        // 轮换：删旧 Session → 新 access + 新 refresh；控制器再 Set-Cookie 写回浏览器
        await this._prisma.session.delete({ where: { id: session.id } });
        const { token, refreshToken } = await this._generateTokens(
            session.user.id,
            session.user.email
        );

        const { password: _, ...userResult } = session.user;
        return { user: userResult, token, refreshToken };
    }

    /**
     * 获取当前用户信息
     */
    async findById(userId: string) {
        const user = await this._prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                avatar: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('用户不存在');
        }

        return user;
    }

    /**
     * 更新当前用户资料（昵称、头像）
     */
    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const user = await this._prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.nickname !== undefined ? { nickname: dto.nickname.trim() || null } : {}),
                ...(dto.avatar !== undefined ? { avatar: dto.avatar.trim() || null } : {}),
            },
            select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                avatar: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return user;
    }

    /**
     * 验证用户凭证
     */
    private async _validateUser(email: string, password: string) {
        const user = await this._prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException('邮箱或密码错误');
        }

        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException('账号已被禁用，请联系管理员');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('邮箱或密码错误');
        }

        return user;
    }

    /**
     * 生成 JWT token 和 refresh token
     */
    private async _generateTokens(userId: string, email: string) {
        const jwtSecret = this._configService.get<string>('jwt.secret')!;
        const expiresIn = this._configService.get<string>('jwt.expiresIn', '7d');

        // 生成 access token
        const token = this._jwtService.sign(
            { sub: userId, email },
            { secret: jwtSecret, expiresIn: expiresIn as unknown as number }
        );

        // 生成 refresh token (30 天有效期)
        const refreshToken = this._jwtService.sign(
            { sub: userId, email, type: 'refresh' },
            { secret: jwtSecret, expiresIn: '30d' as unknown as number }
        );

        // 计算过期时间
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // 存储 session
        await this._prisma.session.create({
            data: {
                userId,
                token,
                refreshToken,
                expiresAt,
            },
        });

        return { token, refreshToken };
    }

    /**
     * 搜索用户（按 username 或 email 模糊匹配）
     */
    async searchUsers(keyword: string, field?: 'username' | 'email') {
        const searchField = field ?? 'username';
        const where =
            searchField === 'email'
                ? { email: { contains: keyword, mode: 'insensitive' as const } }
                : {
                      OR: [
                          { username: { contains: keyword, mode: 'insensitive' as const } },
                          { nickname: { contains: keyword, mode: 'insensitive' as const } },
                      ],
                  };

        const users = await this._prisma.user.findMany({
            where: {
                ...where,
                status: 'ACTIVE',
            },
            select: {
                id: true,
                username: true,
                nickname: true,
                avatar: true,
            },
            take: 10,
        });

        return users;
    }
}
