/**
 * Rotation Dashboard Routes - Account client status proxy
 *
 * Proxies CLIProxyAPIPlus management/clients to the dashboard.
 * GET /api/cliproxy/rotation/clients
 */

import { Router, Request, Response } from 'express';
import {
  buildManagementHeaders,
  buildProxyUrl,
  getProxyTarget,
} from '../../cliproxy/proxy-target-resolver';
import { requireLocalAccessWhenAuthDisabled } from '../middleware/auth-middleware';

const router = Router();

router.use((req: Request, res: Response, next) => {
  if (
    requireLocalAccessWhenAuthDisabled(
      req,
      res,
      'Rotation dashboard endpoints require localhost access when dashboard auth is disabled.'
    )
  ) {
    next();
  }
});

/** Raw client entry from CLIProxyAPIPlus management/clients */
interface RawPoolStatus {
  name?: string;
  rpm_used?: number;
  rpm_limit?: number;
  active?: boolean;
  cooling_until?: string | null;
}

interface RawClient {
  id?: string;
  provider?: string;
  email?: string;
  status?: string;
  cooldown_until?: string | null;
  pools?: RawPoolStatus[];
}

interface RawClientsResponse {
  clients?: RawClient[];
  collected_at?: string;
}

/** Normalize status string to known union values */
function normalizeStatus(raw: string | undefined): 'idle' | 'in-use' | 'cooldown' | 'banned' {
  switch (raw?.toLowerCase()) {
    case 'in-use':
    case 'inuse':
    case 'active':
      return 'in-use';
    case 'cooldown':
    case 'cooling':
      return 'cooldown';
    case 'banned':
    case 'blocked':
      return 'banned';
    default:
      return 'idle';
  }
}

/**
 * GET /rotation/clients - Fetch all credential accounts with status
 */
router.get('/rotation/clients', async (_req: Request, res: Response): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const target = getProxyTarget();
    const url = buildProxyUrl(target, '/v0/management/clients');
    const headers = buildManagementHeaders(target);

    const upstream = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timeoutId);

    if (!upstream.ok) {
      // Engine may not have /clients endpoint — return empty list gracefully
      res.json({ clients: [], collected_at: new Date().toISOString() });
      return;
    }

    const raw = (await upstream.json()) as RawClientsResponse;

    const clients = (raw.clients ?? []).map((c) => ({
      id: c.id ?? c.email ?? 'unknown',
      provider: c.provider ?? 'unknown',
      email: c.email ?? '',
      status: normalizeStatus(c.status),
      cooldown_until: c.cooldown_until ?? null,
      pools: (c.pools ?? []).map((p) => ({
        name: p.name ?? 'pool',
        rpm_used: p.rpm_used ?? 0,
        rpm_limit: p.rpm_limit ?? 0,
        active: p.active ?? false,
        cooling_until: p.cooling_until ?? null,
      })),
    }));

    res.json({
      clients,
      collected_at: raw.collected_at ?? new Date().toISOString(),
    });
  } catch (error) {
    // If engine unreachable, return empty list rather than 500
    if ((error as Error).name === 'AbortError') {
      res.json({ clients: [], collected_at: new Date().toISOString() });
      return;
    }
    res.status(502).json({ error: (error as Error).message });
  }
});

export default router;
