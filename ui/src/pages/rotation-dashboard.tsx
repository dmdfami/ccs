/**
 * Rotation Dashboard Page
 *
 * Visualizes per-provider account rotation status and strategy selector.
 * Data sourced from CLIProxyAPIPlus management API via CCS backend proxy.
 */

import { useTranslation } from 'react-i18next';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccountStatusCard } from '@/components/rotation/account-status-card';
import {
  useRotationClients,
  useRoutingStrategy,
  useUpdateRoutingStrategy,
  type ClientAccount,
} from '@/hooks/use-rotation-dashboard';
import { toast } from 'sonner';

// ─── Strategy Selector ────────────────────────────────────────────────────────

function StrategySelectorSection() {
  const { t } = useTranslation();
  const { data: strategyData, isLoading } = useRoutingStrategy();
  const updateMutation = useUpdateRoutingStrategy();

  function handleStrategyChange(value: string) {
    const strategy = value as 'round-robin' | 'fill-first' | 'priority';
    updateMutation.mutate(strategy, {
      onSuccess: () => {
        toast.success(t('rotationDashboard.strategyUpdated'));
      },
      onError: (err) => {
        toast.error((err as Error).message);
      },
    });
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{t('rotationDashboard.strategy')}:</span>
      {isLoading ? (
        <Skeleton className="h-8 w-36" />
      ) : (
        <Select
          value={strategyData?.strategy ?? 'round-robin'}
          onValueChange={handleStrategyChange}
          disabled={updateMutation.isPending}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="round-robin">{t('rotationDashboard.strategyRoundRobin')}</SelectItem>
            <SelectItem value="fill-first">{t('rotationDashboard.strategyFillFirst')}</SelectItem>
            <SelectItem value="priority">{t('rotationDashboard.strategyPriority')}</SelectItem>
          </SelectContent>
        </Select>
      )}
      {strategyData?.message && (
        <span className="text-xs text-muted-foreground">{strategyData.message}</span>
      )}
    </div>
  );
}

// ─── Provider Group ───────────────────────────────────────────────────────────

interface ProviderGroupProps {
  provider: string;
  accounts: ClientAccount[];
}

function ProviderGroup({ provider, accounts }: ProviderGroupProps) {
  const { t } = useTranslation();

  const counts = accounts.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-2">
      {/* Provider header */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold capitalize text-foreground">{provider}</h3>
        <span className="text-xs text-muted-foreground">
          {accounts.length} {t('rotationDashboard.accountsCount')}
        </span>
        {counts['in-use'] ? (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {counts['in-use']} {t('rotationDashboard.statusInUse')}
          </span>
        ) : null}
        {counts['cooldown'] ? (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {counts['cooldown']} {t('rotationDashboard.statusCooldown')}
          </span>
        ) : null}
        {counts['banned'] ? (
          <span className="text-xs text-red-600 dark:text-red-400">
            {counts['banned']} {t('rotationDashboard.statusBanned')}
          </span>
        ) : null}
      </div>

      {/* Account cards grid */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <AccountStatusCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RotationDashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, isFetching } = useRotationClients();

  // Group accounts by provider
  const byProvider = (data?.clients ?? []).reduce(
    (acc, account) => {
      const key = account.provider || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(account);
      return acc;
    },
    {} as Record<string, ClientAccount[]>
  );

  const providerKeys = Object.keys(byProvider).sort();
  const isEmpty = !isLoading && providerKeys.length === 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t('rotationDashboard.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('rotationDashboard.subtitle')}</p>
          {data?.collected_at && (
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              {t('rotationDashboard.lastUpdated')}{' '}
              {new Date(data.collected_at).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <StrategySelectorSection />
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            {t('rotationDashboard.refresh')}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading && <LoadingSkeleton />}

      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {t('rotationDashboard.errorLoading')}: {(error as Error).message}
        </div>
      )}

      {isEmpty && !error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <RotateCcw className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('rotationDashboard.noAccounts')}</p>
          <p className="text-xs text-muted-foreground/70">
            {t('rotationDashboard.noAccountsHint')}
          </p>
        </div>
      )}

      {!isLoading && providerKeys.length > 0 && (
        <div className="space-y-8">
          {providerKeys.map((provider) => (
            <ProviderGroup key={provider} provider={provider} accounts={byProvider[provider]} />
          ))}
        </div>
      )}
    </div>
  );
}
