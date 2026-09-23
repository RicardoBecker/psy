import { buildCorsOptions } from './cors.config';

type OriginFn = (
  requestOrigin: string | undefined,
  callback: (err: Error | null, allow?: any) => void,
) => void;

function decide(env: NodeJS.ProcessEnv, origin: string | undefined): Promise<boolean> {
  const options = buildCorsOptions(env);
  const originFn = options.origin as OriginFn;
  return new Promise((resolve, reject) => {
    originFn(origin, (err, allow) => {
      if (err) {
        resolve(false);
        return;
      }
      resolve(Boolean(allow));
    });
  });
}

describe('buildCorsOptions (CR-05.3)', () => {
  describe('desenvolvimento', () => {
    const devEnv = { NODE_ENV: 'development' } as NodeJS.ProcessEnv;

    it('permite localhost em qualquer porta', async () => {
      await expect(decide(devEnv, 'http://localhost:3000')).resolves.toBe(true);
      await expect(decide(devEnv, 'http://localhost:5173')).resolves.toBe(true);
    });

    it('permite IP de rede local (192.168.x, 10.x, 172.16-31.x)', async () => {
      await expect(decide(devEnv, 'http://192.168.1.50:3000')).resolves.toBe(true);
      await expect(decide(devEnv, 'http://10.0.0.5:3000')).resolves.toBe(true);
      await expect(decide(devEnv, 'http://172.20.0.10:3000')).resolves.toBe(true);
    });

    it('rejeita origem pública não listada', async () => {
      await expect(decide(devEnv, 'https://evil.com')).resolves.toBe(false);
    });

    it('permite requisição sem Origin (não-navegador)', async () => {
      await expect(decide(devEnv, undefined)).resolves.toBe(true);
    });

    it('não exige CORS_ALLOWED_ORIGINS para construir as opções', () => {
      expect(() => buildCorsOptions(devEnv)).not.toThrow();
    });
  });

  describe('produção', () => {
    it('lança ao construir sem CORS_ALLOWED_ORIGINS configurado (falha segura)', () => {
      const env = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;
      expect(() => buildCorsOptions(env)).toThrow(/CORS_ALLOWED_ORIGINS/);
    });

    it('permite exatamente as origens listadas em CORS_ALLOWED_ORIGINS', async () => {
      const env = {
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.example.com, https://admin.example.com',
      } as NodeJS.ProcessEnv;

      await expect(decide(env, 'https://app.example.com')).resolves.toBe(true);
      await expect(decide(env, 'https://admin.example.com')).resolves.toBe(true);
    });

    it('rejeita origem não listada', async () => {
      const env = {
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      } as NodeJS.ProcessEnv;

      await expect(decide(env, 'https://evil.com')).resolves.toBe(false);
    });

    it('NÃO permite IP de rede local automaticamente (diferente do dev)', async () => {
      const env = {
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      } as NodeJS.ProcessEnv;

      await expect(decide(env, 'http://192.168.1.50:3000')).resolves.toBe(false);
    });

    it('nunca usa wildcard: origin é uma função de validação, nunca "*"', () => {
      const env = {
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://app.example.com',
      } as NodeJS.ProcessEnv;

      const options = buildCorsOptions(env);
      expect(options.origin).not.toBe('*');
      expect(typeof options.origin).toBe('function');
    });
  });

  it('define métodos e headers explícitos (não deixa no default irrestrito)', () => {
    const options = buildCorsOptions({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(options.methods).toEqual(expect.arrayContaining(['GET', 'POST', 'PATCH', 'DELETE']));
    expect(options.allowedHeaders).toEqual(expect.arrayContaining(['Authorization', 'Content-Type']));
  });
});
