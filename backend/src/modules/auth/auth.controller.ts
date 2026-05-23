import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Req,
    Res,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AuthGuard } from '@nestjs/passport';
import { ThrottleGuard } from '../../common/guards/throttle.guard';
import { Throttle } from '../../common/decorators/throttle.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Request, Response } from 'express';
import type { RequestUser } from '@collab/types';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const uploadDir = join(process.cwd(), 'uploads', 'avatars');
if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
}

const avatarStorage = diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `${uuidv4()}${ext}`);
    },
});

interface AuthRequest extends Request {
    user: RequestUser;
}

@Controller('auth')
export class AuthController {
    constructor(private readonly _authService: AuthService) {}

    @Public()
    @Post('register')
    @UseGuards(ThrottleGuard)
    @Throttle(3, 60)
    async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        const result = await this._authService.register(dto);
        this._setTokenCookies(res, result.token, result.refreshToken);
        return { user: result.user };
    }

    @Public()
    @Post('login')
    @UseGuards(ThrottleGuard)
    @Throttle(5, 60)
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this._authService.login(dto);
        this._setTokenCookies(res, result.token, result.refreshToken);
        return { user: result.user };
    }

    @Post('logout')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
        // 从 cookie 提取 refresh token
        const refreshToken = req.cookies.refresh_token as string | undefined;
        await this._authService.logout(req.user.userId, refreshToken);
        this._clearTokenCookies(res);
        return { success: true };
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(
        @Body() dto: RefreshTokenDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ) {
        // 优先从 cookie 提取，兼容 body 传入
        const refreshToken = dto.refreshToken || req.cookies.refresh_token;

        if (!refreshToken) {
            throw new UnauthorizedException('缺少 refresh token');
        }

        const result = await this._authService.refreshToken(refreshToken);
        this._setTokenCookies(res, result.token, result.refreshToken);
        return { user: result.user };
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async me(@Req() req: AuthRequest) {
        return this._authService.findById(req.user.userId);
    }

    @Patch('profile')
    @UseGuards(AuthGuard('jwt'))
    async updateProfile(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) {
        return this._authService.updateProfile(req.user.userId, dto);
    }

    @Post('profile/avatar')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: avatarStorage,
            limits: { fileSize: MAX_FILE_SIZE },
            fileFilter: (_req, file, cb) => {
                if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                    cb(new BadRequestException('仅支持 JPG、PNG、WebP 格式'), false);
                    return;
                }
                cb(null, true);
            },
        })
    )
    async uploadAvatar(@Req() req: AuthRequest, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('请选择要上传的图片');
        }
        const avatarUrl = `/uploads/avatars/${file.filename}`;
        return this._authService.updateAvatar(req.user.userId, avatarUrl);
    }

    /**
     * 获取 WebSocket 认证 token
     * HttpOnly cookie 无法被 JS 读取，通过此端点将当前 JWT 暴露给前端用于 WS 握手
     */
    @Get('ws-token')
    @UseGuards(AuthGuard('jwt'))
    getWsToken(@Req() req: AuthRequest) {
        const token = (req as Request & { cookies: Record<string, string | undefined> }).cookies
            .access_token;
        if (!token) {
            throw new UnauthorizedException('缺少认证 token');
        }
        return { token };
    }

    // 搜索用户（限流保护）
    @Get('search')
    @UseGuards(ThrottleGuard)
    @Throttle(10, 60)
    async searchUsers(
        @Query('keyword') keyword: string,
        @Query('field') field?: 'username' | 'email'
    ) {
        if (!keyword || keyword.trim().length < 2) {
            return [];
        }
        return this._authService.searchUsers(keyword, field);
    }

    /**
     * HttpOnly：JS 不可读，降 XSS 窃 token；业务 API 带 access，刷新专用收窄 path
     */
    private _setTokenCookies(res: Response, token: string, refreshToken: string) {
        const isProduction = process.env.NODE_ENV === 'production';

        // 短效访问令牌，全站 path，JWT Strategy 从 Cookie 优先取
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
            path: '/',
        });

        // 长效刷新令牌仅刷新接口可见，缩小泄露面（非 /api/auth/refresh 请求不携带）
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
            path: '/api/auth/refresh',
        });
    }

    /**
     * 清除认证 cookie
     */
    private _clearTokenCookies(res: Response) {
        res.clearCookie('access_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
    }
}
