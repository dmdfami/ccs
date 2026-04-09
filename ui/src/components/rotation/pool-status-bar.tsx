/**
 * Pool Status Bar - Dual-pool RPM visualization for geminicli accounts
 *
 * Renders a horizontal progress bar showing RPM used/remaining per pool,
 * with active/cooldown indicators.
 */

import { cn } from '@/lib/utils';
import type { PoolStatus } from '@/hooks/use-rotation-dashboard';
import { useTranslation } from 'react-i18next';

interface PoolStatusBarProps {
  pool: PoolStatus;
}

/** Format cooldown remaining time as MM:SS */
function formatCooldownRemaining(coolingUntil: string): string {
  const until = new Date(coolingUntil).getTime();
  const remaining = Math.max(0, until - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Compute fill percentage, clamped 0–100 */
function fillPercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/** Color class based on usage ratio */
function barColorClass(pct: number, isCooling: boolean): string {
  if (isCooling) return 'bg-amber-400 dark:bg-amber-500';
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-orange-400';
  return 'bg-emerald-500 dark:bg-emerald-400';
}

export function PoolStatusBar({ pool }: PoolStatusBarProps) {
  const { t } = useTranslation();
  const isCooling = !!pool.cooling_until && new Date(pool.cooling_until) > new Date();
  const pct = fillPercent(pool.rpm_used, pool.rpm_limit);
  const barColor = barColorClass(pct, isCooling);

  return (
    <div className="space-y-1">
      {/* Pool header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {/* Active indicator dot */}
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              pool.active && !isCooling
                ? 'bg-emerald-500 animate-pulse'
                : isCooling
                  ? 'bg-amber-400'
                  : 'bg-muted-foreground/40'
            )}
          />
          <span className="font-medium text-foreground">{pool.name}</span>
          {pool.active && !isCooling && (
            <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">
              {t('rotationDashboard.active')}
            </span>
          )}
          {isCooling && pool.cooling_until && (
            <span className="text-amber-600 dark:text-amber-400 text-[10px]">
              {t('rotationDashboard.cooldown')} {formatCooldownRemaining(pool.cooling_until)}
            </span>
          )}
        </div>
        <span className="tabular-nums text-muted-foreground">
          {pool.rpm_used}
          <span className="mx-0.5 text-muted-foreground/50">/</span>
          {pool.rpm_limit} {t('rotationDashboard.rpm')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
