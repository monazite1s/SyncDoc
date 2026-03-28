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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

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
    async logout(
        @Req() req: { user: { userId: string } },
        @Body() body: { refreshToken?: string },
        @Res({ passthrough: true }) res: Response
    ) {
        await this._authService.logout(req.user.userId, body.refreshToken);
        this._clearTokenCookies(res);
        return { success: true };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() dto: RefreshTokenDto, @Res({ passthrough: true }) res: Response) {
        const result = await this._authService.refreshToken(dto.refreshToken);
        this._setTokenCookies(res, result.token, result.refreshToken);
        return { user: result.user };
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async me(@Req() req: { user: { userId: string } }) {
        return this._authService.findById(req.user.userId);
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
