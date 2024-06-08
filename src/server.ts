import express from 'express';
import { rateLimiter, RateLimiterRule } from './rateLimiter';

const app = express();
const port = 3000;

const AUTHENTICATED_USER_LATE_LIMIT_RULE: RateLimiterRule = {
  rateLimit: {
    time: 60 * 60 * 1000,
    limit: 200,
  },
  endpoint: 'users',
};

const UNAUTHENTICATED_USER_LATE_LIMIT_RULE: RateLimiterRule = {
  rateLimit: {
    time: 60 * 60 * 1000,
    limit: 100,
  },
  endpoint: 'users',
};

app.use('/users', (req, res, next) => {
  const isAuthenticated = req.headers.authorization; // Simple auth check
  if (isAuthenticated) {
    return rateLimiter(AUTHENTICATED_USER_LATE_LIMIT_RULE);
  }
  return rateLimiter(UNAUTHENTICATED_USER_LATE_LIMIT_RULE);
});

app.get('/', (req, res) => {
  res.send('Returning response for get request');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
