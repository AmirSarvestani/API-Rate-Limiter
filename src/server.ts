import express, { Request, Response, NextFunction } from 'express';
import { slidingLogRateLimiter } from './rateLimiter';
import { overrideRateLimit } from './overrideRateLimit';
import { authenticate } from './authenticate';
import { configs } from './configs';
import { errorHandler } from './errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api', authenticate, overrideRateLimit, (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const isAuthenticated = (req as any).isAuthenticated;
  const endpointConfig = configs['/api'];
  const maxRequests =
    (req as any).rateLimitOverride || (isAuthenticated ? endpointConfig.authenticated : endpointConfig.unauthenticated);

  slidingLogRateLimiter('/api', {
    windowSizeInHours: 1,
    maximumRequestsInWindow: maxRequests,
  })(req, res, next);
});

app.use(errorHandler);

app.get('/api', (req: Request, res: Response) => {
  res.send('Returning response for get request');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
