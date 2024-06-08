import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { rateLimiter } from './rateLimiter';

jest.mock('ioredis');

const incrMock = jest.spyOn(Redis.prototype, 'incr');
const expireMock = jest.spyOn(Redis.prototype, 'expire');

describe('rateLimiter middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let json: jest.Mock;

  beforeEach(() => {
    req = { ip: '127.0.0.1' };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    json = res.json as jest.Mock;
    next = jest.fn();
    incrMock.mockClear();
    expireMock.mockClear();
  });

  it('should call next if the request count is within limit', async () => {
    incrMock.mockResolvedValue(1);
    const middleware = rateLimiter({
      endpoint: 'users',
      rateLimit: {
        time: 60 * 60 * 1000,
        limit: 200,
      },
    });

    await middleware(req as Request, res as Response, next);

    expect(incrMock).toHaveBeenCalledWith('users/127.0.0.1');
    expect(expireMock).toHaveBeenCalledWith('users/127.0.0.1', 3600000);
    expect(next).toHaveBeenCalled();
  });

  it('should return 429 if the request count exceeds limit', async () => {
    incrMock.mockResolvedValue(101);
    const middleware = rateLimiter({
      endpoint: 'users',
      rateLimit: {
        time: 60 * 60 * 1000,
        limit: 100,
      },
    });

    await middleware(req as Request, res as Response, next);

    expect(incrMock).toHaveBeenCalledWith('users/127.0.0.1');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({ message: 'Too many requests' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 500 if there is a Redis error', async () => {
    incrMock.mockRejectedValue(new Error('Redis error'));
    const middleware = rateLimiter({
      endpoint: 'users',
      rateLimit: {
        time: 60 * 60 * 1000,
        limit: 200,
      },
    });

    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    expect(next).not.toHaveBeenCalled();
  });
});
