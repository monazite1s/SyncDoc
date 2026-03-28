import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
    sub: string;
    email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly _configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                // 优先从 cookie 读取
                (request: { cookies?: Record<string, string> }) => {
                    return request?.cookies?.access_token ?? null;
                },
                // 兼容：也支持 Authorization header（用于 WebSocket 等）
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: _configService.get<string>('jwt.secret')!,
        });
    }

    async validate(payload: JwtPayload) {
        if (!payload.sub || !payload.email) {
            throw new UnauthorizedException('无效的认证凭证');
        }

        return { userId: payload.sub, email: payload.email };
    }
}
