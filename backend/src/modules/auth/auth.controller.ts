import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Req,
    Res,
    HttpCode,
    HttpStatus,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import type { RequestUser } from '@collab/types';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

interface AuthRequest extends Request {
    user: RequestUser;
}

@Controller('auth')
export class AuthController {
    constructor(private readonly _authService: AuthService) {}

    @Post('register')
    async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        const result = await this._authService.register(dto);
        this._setTokenCookies(res, result.token, result.refreshToken);
        return { user: result.user };
    }

    @Post('login')
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

    /**
     * 设置 HttpOnly cookie
     */
    private _setTokenCookies(res: Response, token: string, refreshToken: string) {
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('access_token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
            path: '/',
        });

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
