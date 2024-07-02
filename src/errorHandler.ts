import { Request, Response, NextFunction } from 'express';

export function errorHandler(err, req: Request, res: Response, next: NextFunction) {
  console.error(err.stack);

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err,
  });
}
