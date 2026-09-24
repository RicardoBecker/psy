import * as express from 'express';
import * as request from 'supertest';
import { resolveTrustProxySetting } from './trust-proxy.config';

describe('resolveTrustProxySetting — explicit, documented proxy trust (KAN-159, P2)', () => {
  it('returns undefined when TRUST_PROXY_HOPS is unset — keeps Express default (direct connection)', () => {
    expect(resolveTrustProxySetting({})).toBeUndefined();
  });

  it('returns undefined for an empty string (treated the same as unset)', () => {
    expect(resolveTrustProxySetting({ TRUST_PROXY_HOPS: '' })).toBeUndefined();
  });

  it('parses a numeric value as a hop count', () => {
    expect(resolveTrustProxySetting({ TRUST_PROXY_HOPS: '1' })).toBe(1);
    expect(resolveTrustProxySetting({ TRUST_PROXY_HOPS: '2' })).toBe(2);
  });

  it('passes through a non-numeric value as-is (Express understands "loopback", IPs, CIDRs)', () => {
    expect(resolveTrustProxySetting({ TRUST_PROXY_HOPS: 'loopback' })).toBe('loopback');
  });
});

// 🔒 Code review PR #20 (KAN-159, P2): prova, contra um Express real (não
// só a função pura acima), que req.ip se comporta como documentado nas
// duas topologias — sem isso, um mock poderia "provar" um comportamento
// que o Express de verdade não tem.
describe('trust proxy behavior against a real Express app (KAN-159, P2)', () => {
  function buildApp(trustProxy?: ReturnType<typeof resolveTrustProxySetting>) {
    const app = express();
    if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
    app.get('/ip', (req, res) => res.json({ ip: req.ip }));
    return app;
  }

  it('without trust proxy configured, ignores a forged X-Forwarded-For header (safe default for direct connections)', async () => {
    const app = buildApp(resolveTrustProxySetting({}));

    const res = await request(app).get('/ip').set('X-Forwarded-For', '9.9.9.9');

    expect(res.body.ip).not.toBe('9.9.9.9');
  });

  it('with trust proxy configured (1 hop), honors X-Forwarded-For from that single trusted hop', async () => {
    const app = buildApp(resolveTrustProxySetting({ TRUST_PROXY_HOPS: '1' }));

    const res = await request(app).get('/ip').set('X-Forwarded-For', '9.9.9.9');

    expect(res.body.ip).toBe('9.9.9.9');
  });

  it('with trust proxy configured, a header with an extra untrusted hop still resolves to the trusted one, not the attacker-controlled leftmost entry', async () => {
    // X-Forwarded-For é lido da direita para a esquerda: com 1 salto
    // confiável, só o valor mais próximo do nosso servidor é confiável —
    // o restante (à esquerda) pode ter sido forjado por qualquer um.
    const app = buildApp(resolveTrustProxySetting({ TRUST_PROXY_HOPS: '1' }));

    const res = await request(app)
      .get('/ip')
      .set('X-Forwarded-For', '9.9.9.9, 203.0.113.10'); // atacante, proxy-real

    expect(res.body.ip).toBe('203.0.113.10');
    expect(res.body.ip).not.toBe('9.9.9.9');
  });
});
