import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';
export interface ThrottleConfig {
    limit: number;
    windowSeconds: number;
}

export const Throttle = (limit: number, windowSeconds: number) =>
    SetMetadata(THROTTLE_KEY, { limit, windowSeconds } satisfies ThrottleConfig);
