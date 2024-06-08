import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';

const redisClient = new Redis();

export interface RateLimiterRule {
  rateLimit: {
    time: number;
    limit: number;
  };
  endpoint?: string;
}

export const rateLimiter = (rule: RateLimiterRule) => {
  const { endpoint, rateLimit } = rule;
  return async (req: Request, res: Response, next: NextFunction) => {
    const { ip: ipAddress } = req;
    const redisId = `${endpoint}/${ipAddress}`;

    try {
      const requests = await redisClient.incr(redisId);
      if (requests === 1) {
        await redisClient.expire(redisId, rateLimit.time);
      }

      if (requests > rateLimit.limit) {
        return res.status(429).json({ message: 'Too many requests' });
      }
    } catch (error) {
      console.error('Rate limiter error:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    next();
  };
};
