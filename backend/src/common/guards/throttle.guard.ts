import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../redis/redis.service';
import { THROTTLE_KEY, ThrottleConfig } from '../decorators/throttle.decorator';

@Injectable()
export class ThrottleGuard implements CanActivate {
    constructor(
        private _reflector: Reflector,
        private _redis: RedisService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const config = this._reflector.get<ThrottleConfig>(THROTTLE_KEY, context.getHandler());
        if (!config) return true;

        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId ?? request.ip ?? 'anonymous';
        const key = `throttle:${context.getHandler().name}:${userId}`;

        const count = await this._redis.slidingWindowCount(key, config.windowSeconds);
        if (count > config.limit) {
            throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
        }

        return true;
    }
}
