import { RateLimitMetricsService } from './rate-limit-metrics.service';

describe('RateLimitMetricsService — in-process counters (KAN-18/KAN-80)', () => {
  let service: RateLimitMetricsService;

  beforeEach(() => {
    service = new RateLimitMetricsService();
  });

  it('starts empty', () => {
    expect(service.getSnapshot()).toEqual([]);
  });

  it('counts blocks per (route, reason) independently', () => {
    service.recordBlock('/auth/login', 'ip');
    service.recordBlock('/auth/login', 'ip');
    service.recordBlock('/auth/login', 'identity');
    service.recordBlock('/auth/forgot-password', 'ip');

    const snapshot = service.getSnapshot();
    expect(snapshot).toEqual(
      expect.arrayContaining([
        { route: '/auth/login', reason: 'ip', count: 2 },
        { route: '/auth/login', reason: 'identity', count: 1 },
        { route: '/auth/forgot-password', reason: 'ip', count: 1 },
      ]),
    );
    expect(snapshot).toHaveLength(3);
  });
});
