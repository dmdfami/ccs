/**
 * React Query hooks for Rotation Dashboard
 *
 * Fetches account client status and rotation strategy from CLIProxyAPIPlus
 * via CCS backend proxy routes.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Per-pool status for geminicli dual-pool accounts */
export interface PoolStatus {
  name: string;
  rpm_used: number;
  rpm_limit: number;
  active: boolean;
  cooling_until?: string | null;
}

/** Account status returned by management/clients endpoint */
export interface ClientAccount {
  id: string;
  provider: string;
  email: string;
  status: 'idle' | 'in-use' | 'cooldown' | 'banned';
  cooldown_until?: string | null;
  pools?: PoolStatus[];
}

/** Response from management/clients */
export interface ClientsResponse {
  clients: ClientAccount[];
  collected_at: string;
}

/** Rotation strategy state */
export interface RoutingStrategyState {
  strategy: 'round-robin' | 'fill-first' | 'priority';
  source: 'live' | 'config';
  target: 'local' | 'remote';
  reachable: boolean;
  message?: string;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchClientsStatus(): Promise<ClientsResponse> {
  const res = await fetch('/api/cliproxy/rotation/clients');
  if (!res.ok) {
    throw new Error(`Failed to fetch clients: ${res.status}`);
  }
  return res.json() as Promise<ClientsResponse>;
}

async function fetchRoutingStrategy(): Promise<RoutingStrategyState> {
  const res = await fetch('/api/cliproxy/routing/strategy');
  if (!res.ok) {
    throw new Error(`Failed to fetch routing strategy: ${res.status}`);
  }
  return res.json() as Promise<RoutingStrategyState>;
}

async function updateRoutingStrategy(
  strategy: 'round-robin' | 'fill-first' | 'priority'
): Promise<RoutingStrategyState> {
  const res = await fetch('/api/cliproxy/routing/strategy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: strategy }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(
      (err as { error?: string }).error ?? `Failed to update strategy: ${res.status}`
    );
  }
  return res.json() as Promise<RoutingStrategyState>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Poll account client status every 5s */
export function useRotationClients() {
  return useQuery({
    queryKey: ['rotation-clients'],
    queryFn: fetchClientsStatus,
    refetchInterval: 5000,
    retry: 1,
    staleTime: 3000,
  });
}

/** Fetch current routing strategy */
export function useRoutingStrategy() {
  return useQuery({
    queryKey: ['routing-strategy'],
    queryFn: fetchRoutingStrategy,
    refetchInterval: 10000,
    retry: 1,
    staleTime: 5000,
  });
}

/** Mutation to update routing strategy */
export function useUpdateRoutingStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateRoutingStrategy,
    onSuccess: (data) => {
      queryClient.setQueryData(['routing-strategy'], data);
    },
  });
}
