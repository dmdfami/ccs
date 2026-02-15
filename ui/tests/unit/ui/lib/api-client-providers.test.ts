import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api-client';

describe('api.providers.catalog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches provider catalog via stable providers API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          version: 1,
          providers: [
            {
              id: 'gemini',
              displayName: 'Google Gemini',
              oauthFlow: 'authorization_code',
              aliases: ['gemini-cli'],
              logoAssetPath: '/assets/providers/gemini-color.svg',
              features: {
                supportsQuota: false,
                requiresNickname: false,
                supportsImageAnalysis: true,
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const payload = await api.providers.catalog();

    expect(payload.version).toBe(1);
    expect(payload.providers[0]?.id).toBe('gemini');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/providers/catalog',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
});
