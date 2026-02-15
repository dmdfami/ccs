import { describe, expect, it, spyOn } from 'bun:test';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import * as providerCapabilities from '../../../src/cliproxy/provider-capabilities';

async function startApiServer(): Promise<{ server: Server; baseUrl: string }> {
  const app = express();
  const { apiRoutes } = await import('../../../src/web-server/routes');
  app.use('/api', apiRoutes);

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address() as AddressInfo;
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function stopServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

describe('provider-catalog-routes', () => {
  it('returns provider catalog metadata without secrets', async () => {
    const { server, baseUrl } = await startApiServer();

    try {
      const response = await fetch(`${baseUrl}/api/providers/catalog`);
      expect(response.status).toBe(200);

      const payload = (await response.json()) as {
        version: number;
        providers: Array<{
          id: string;
          displayName: string;
          oauthFlow: string;
          aliases: string[];
          logoAssetPath: string | null;
          features: {
            supportsQuota: boolean;
            requiresNickname: boolean;
            supportsImageAnalysis: boolean;
          };
        }>;
      };

      expect(payload.version).toBe(1);
      expect(payload.providers.length).toBeGreaterThan(0);
      const gemini = payload.providers.find((provider) => provider.id === 'gemini');
      expect(gemini).toBeDefined();
      expect(gemini?.displayName.length).toBeGreaterThan(0);
      expect(['authorization_code', 'device_code']).toContain(gemini?.oauthFlow);
      expect(gemini?.aliases).toBeArray();
      const providerIds = payload.providers.map((provider) => provider.id);
      expect(providerIds).toEqual([...providerIds].sort((left, right) => left.localeCompare(right)));
      expect('apiKey' in (gemini ?? {})).toBe(false);
      expect('token' in (gemini ?? {})).toBe(false);
    } finally {
      await stopServer(server);
    }
  });

  it('returns generic 500 error when provider capability resolution fails', async () => {
    const capabilitiesSpy = spyOn(providerCapabilities, 'getProviderCapabilities').mockImplementation(
      () => {
        throw new Error('sensitive internal details');
      }
    );
    const { server, baseUrl } = await startApiServer();

    try {
      const response = await fetch(`${baseUrl}/api/providers/catalog`);
      expect(response.status).toBe(500);

      const payload = (await response.json()) as { error: string };
      expect(payload.error).toBe('Failed to load provider catalog');
      expect(payload.error.includes('sensitive internal details')).toBe(false);
    } finally {
      capabilitiesSpy.mockRestore();
      await stopServer(server);
    }
  });
});
