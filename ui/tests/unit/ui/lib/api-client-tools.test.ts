import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api-client';

describe('api.tools.request', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses generic /api/tools path when available', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const payload = await api.tools.request<{ ok: boolean }>('copilot', '/status');

    expect(payload.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/tools/copilot/status',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('falls back to legacy path when generic route returns 404', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    const payload = await api.tools.request<{ success: boolean }>('cursor', '/status');

    expect(payload.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/tools/cursor/status');
    expect(fetchSpy.mock.calls[1]?.[0]).toBe('/api/cursor/status');
  });
});
