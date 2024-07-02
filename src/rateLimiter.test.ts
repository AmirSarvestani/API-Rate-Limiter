import request from 'supertest';
import express from 'express';
import redisClient from './redisClient';
import { slidingLogRateLimiter } from './rateLimiter';
import { overrideRateLimit, setTemporaryRateLimit } from './overriderateLimit';
import { authenticate } from './authenticate';

const app = express();
const endpointConfigs = {
  '/api': { authenticated: 200, unauthenticated: 100 },
};

app.use('/api', authenticate, overrideRateLimit, (req, res, next) => {
  const ip = req.ip;
  const isAuthenticated = (req as any).isAuthenticated;
  const endpointConfig = endpointConfigs['/api'];
  const maxRequests =
    (req as any).rateLimitOverride || (isAuthenticated ? endpointConfig.authenticated : endpointConfig.unauthenticated);

  slidingLogRateLimiter('/api', {
    windowSizeInHours: 1,
    maximumRequestsInWindow: maxRequests,
  })(req, res, next);
});

app.get('/api', (req, res) => {
  res.send('Rate-limited API route.');
});

beforeAll(async () => {
  await redisClient.flushDb();
});

afterEach(async () => {
  await redisClient.flushDb();
});

afterAll(() => {
  redisClient.quit();
});

describe('rateLimiter middleware', () => {
  it('should allow up to the limit of unauthenticated requests', async () => {
    for (let i = 0; i < 100; i++) {
      const response = await request(app).get('/api');
      expect(response.status).toBe(200);
    }
  });

  it('should block unauthenticated requests over the limit', async () => {
    for (let i = 0; i < 100; i++) {
      await request(app).get('/api');
    }
    const response = await request(app).get('/api');
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many requests, please try again later.');
  });

  it('should allow up to the limit of authenticated requests', async () => {
    for (let i = 0; i < 200; i++) {
      const response = await request(app).get('/api').set('Authorization', 'Bearer token');
      expect(response.status).toBe(200);
    }
  });

  it('should throw errro', async () => {
    for (let i = 0; i < 200; i++) {
      const response = await request(app).get('/api').set('Authorization', 'Bearer token');
      expect(response.status).toBe(200);
    }
  });

  it('should block authenticated requests over the limit', async () => {
    for (let i = 0; i < 200; i++) {
      await request(app).get('/api').set('Authorization', 'Bearer token');
    }
    const response = await request(app).get('/api').set('Authorization', 'Bearer token');
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many requests, please try again later.');
  });

  it('should allow up to the limit of requests for IP with temporary override', async () => {
    await setTemporaryRateLimit('::ffff:127.0.0.1', 300, 3600);
    for (let i = 0; i < 300; i++) {
      const response = await request(app).get('/api');
      expect(response.status).toBe(200);
    }
  });

  it('should block requests over the limit for IP with temporary override', async () => {
    await setTemporaryRateLimit('::ffff:127.0.0.1', 400, 3600);
    for (let i = 0; i < 400; i++) {
      await request(app).get('/api');
    }
    const response = await request(app).get('/api');
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many requests, please try again later.');
  });
});
