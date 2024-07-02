import { NextFunction, Request, Response } from 'express';
import redisClient from './redisClient';

interface LimitOptions {
  windowSizeInHours: number;
  maximumRequestsInWindow: number;
}

export const slidingLogRateLimiter = (endpoint: string, options: LimitOptions) => {
  const { windowSizeInHours, maximumRequestsInWindow } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ip: ipAddress } = req;
      const currentTimestamp = Date.now();
      const windowStart = Date.now() - windowSizeInHours * 60 * 60 * 1000;

      const logsKey = `${endpoint}:${ipAddress}`;
      const count = await redisClient.lLen(logsKey);

      if (count >= maximumRequestsInWindow) {
        const oldestTimestamp = await redisClient.lIndex(logsKey, 0);
        if (oldestTimestamp && parseInt(oldestTimestamp) >= windowStart) {
          return res.status(429).json({ error: 'Too many requests, please try again later.' });
        }
      }

      await redisClient.rPush(logsKey, currentTimestamp.toString());
      await redisClient.lTrim(logsKey, -maximumRequestsInWindow, -1);
      await redisClient.expire(logsKey, windowSizeInHours * 60 * 60);

      next();
    } catch (error) {
      console.log(error.message);
    }
  };
};
