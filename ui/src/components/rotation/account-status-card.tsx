/**
 * Account Status Card - Per-account rotation status display
 *
 * Shows account identifier, status badge (idle/in-use/cooldown/banned),
 * and optional dual-pool bars for geminicli accounts.
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PoolStatusBar } from './pool-status-bar';
import type { ClientAccount } from '@/hooks/use-rotation-dashboard';
import { useTranslation } from 'react-i18next';

interface AccountStatusCardProps {
  account: ClientAccount;
}

type StatusConfig = {
  label: string;
  dot: string;
  badge: string;
};

function useStatusConfig(status: ClientAccount['status'], t: (k: string) => string): StatusConfig {
  switch (status) {
    case 'in-use':
      return {
        label: t('rotationDashboard.statusInUse'),
        dot: 'bg-blue-500 animate-pulse',
        badge:
          'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      };
    case 'cooldown':
      return {
        label: t('rotationDashboard.statusCooldown'),
        dot: 'bg-amber-400',
        badge:
          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    case 'banned':
      return {
        label: t('rotationDashboard.statusBanned'),
        dot: 'bg-red-500',
        badge:
          'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
      };
    default:
      return {
        label: t('rotationDashboard.statusIdle'),
        dot: 'bg-muted-foreground/40',
        badge: 'bg-muted text-muted-foreground border-border',
      };
  }
}

/** Format cooldown expiry as relative time */
function formatCooldownUntil(until: string): string {
  const remaining = Math.max(0, new Date(until).getTime() - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  if (totalSeconds <= 0) return '';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function AccountStatusCard({ account }: AccountStatusCardProps) {
  const { t } = useTranslation();
  const config = useStatusConfig(account.status, t);
  const hasPools = Array.isArray(account.pools) && account.pools.length > 0;
  const displayId = account.email || account.id;

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 space-y-2 transition-colors',
        account.status === 'banned' && 'opacity-60'
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', config.dot)} />
          <span className="truncate text-sm font-medium text-foreground" title={displayId}>
            {displayId}
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn('flex-shrink-0 text-[11px] px-1.5 py-0', config.badge)}
        >
          {config.label}
        </Badge>
      </div>

      {/* Cooldown timer */}
      {account.status === 'cooldown' && account.cooldown_until && (
        <p className="text-xs text-amber-600 dark:text-amber-400 pl-4">
          {t('rotationDashboard.cooldownUntil')} {formatCooldownUntil(account.cooldown_until)}
        </p>
      )}

      {/* Dual-pool bars (geminicli) */}
      {hasPools && (
        <div className="space-y-2 pt-1 pl-4 border-l-2 border-muted ml-1">
          {(account.pools ?? []).map((pool) => (
            <PoolStatusBar key={pool.name} pool={pool} />
          ))}
        </div>
      )}
    </div>
  );
}
