import { Redis } from "ioredis";
export declare const redis: Redis;
export declare function rateLimit(key: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetSeconds: number;
}>;
