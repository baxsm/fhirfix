import { Redis } from "ioredis";
import { env } from "./env";

// bullmq requires maxRetriesPerRequest: null on its connection.
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

// shared, Redis-backed fixed-window rate limiter primitive.
// used by the demo endpoint (phase 3) and the public REST API (phase 5).
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetSeconds: number }> {
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }
  const ttl = await redis.ttl(redisKey);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetSeconds: ttl < 0 ? windowSeconds : ttl,
  };
}
