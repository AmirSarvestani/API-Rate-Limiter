import { Request, Response, NextFunction } from 'express';
import redisClient from './redisClient';

export const overrideRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const overrideKey = `override:${ip}`;
  const overrideLimit = await redisClient.get(overrideKey);

  if (overrideLimit) {
    (req as any).rateLimitOverride = parseInt(overrideLimit);
  }

  next();
};

export const setTemporaryRateLimit = async (ip: string, limit: number, durationInSeconds: number) => {
  const overrideKey = `override:${ip}`;
  await redisClient.set(overrideKey, limit.toString(), { EX: durationInSeconds });
};
