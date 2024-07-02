import { Request, Response, NextFunction } from 'express';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    (req as any).isAuthenticated = true;
  } else {
    (req as any).isAuthenticated = false;
  }
  next();
};

