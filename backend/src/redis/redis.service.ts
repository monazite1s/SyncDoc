import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly _client: Redis;

    constructor(private _configService: ConfigService) {
        this._client = new Redis({
            host: this._configService.get<string>('redis.host', 'localhost'),
            port: this._configService.get<number>('redis.port', 6379),
            password: this._configService.get<string>('redis.password') || undefined,
            maxRetriesPerRequest: 3,
        });
    }

    get client(): Redis {
        return this._client;
    }

    async get(key: string): Promise<string | null> {
        return this._client.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this._client.set(key, value, 'EX', ttlSeconds);
        } else {
            await this._client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this._client.del(key);
    }

    /**
     * 滑动窗口限流：返回当前窗口内的请求数
     */
    async slidingWindowCount(key: string, windowSeconds: number): Promise<number> {
        const now = Date.now();
        const windowStart = now - windowSeconds * 1000;
        const pipeline = this._client.pipeline();
        pipeline.zremrangebyscore(key, 0, windowStart);
        pipeline.zadd(key, now, `${now}:${Math.random()}`);
        pipeline.zcard(key);
        pipeline.expire(key, windowSeconds);
        const results = await pipeline.exec();
        return (results?.[2]?.[1] as number) ?? 0;
    }

    async onModuleDestroy() {
        await this._client.quit();
    }
}
