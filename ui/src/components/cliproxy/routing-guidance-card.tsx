import { useState } from 'react';
import { ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CliproxyRoutingState, RoutingStrategy } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface RoutingGuidanceCardProps {
  className?: string;
  compact?: boolean;
  state?: CliproxyRoutingState;
  isLoading: boolean;
  isSaving: boolean;
  error?: Error | null;
  onApply: (strategy: RoutingStrategy) => void;
}

const STRATEGY_COPY: Record<RoutingStrategy, { title: string; description: string }> = {
  'round-robin': {
    title: 'Round Robin',
    description: 'Spread requests across matching accounts for even usage.',
  },
  'fill-first': {
    title: 'Fill First',
    description: 'Drain one healthy account first and keep backups untouched until needed.',
  },
};

export function RoutingGuidanceCard({
  className,
  compact = false,
  state,
  isLoading,
  isSaving,
  error,
  onApply,
}: RoutingGuidanceCardProps) {
  const currentStrategy = state?.strategy ?? 'round-robin';
  const [selected, setSelected] = useState<RoutingStrategy>(currentStrategy);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const sourceLabel = state?.source === 'live' ? 'Live CLIProxy' : 'Saved startup default';
  const saveDisabled = isLoading || isSaving || !state || selected === currentStrategy;
  const detailToggleLabel = detailsOpen ? 'Hide details' : 'Show details';

  if (compact) {
    const statusLine = selected === 'fill-first' ? 'One account first' : 'Balanced usage';

    return (
      <section className={cn('border-t border-border/60 pt-3', className)}>
        <div className="space-y-2.5 rounded-xl border border-border/70 bg-background/90 p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/80 text-primary transition-transform duration-200 hover:scale-105">
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Routing
                  </span>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {currentStrategy}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{statusLine}</p>
              </div>
            </div>

            {!state?.reachable ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                Saved default
              </Badge>
            ) : null}
          </div>

          <div className="relative grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/30 p-1">
            <div
              className={cn(
                'absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-lg bg-background shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_6px_16px_rgba(15,23,42,0.06)] transition-transform duration-300 ease-out',
                selected === 'fill-first' ? 'translate-x-[calc(100%+0.25rem)]' : 'translate-x-0'
              )}
            />
            {(
              Object.entries(STRATEGY_COPY) as Array<
                [RoutingStrategy, { title: string; description: string }]
              >
            ).map(([strategy, copy]) => {
              const active = selected === strategy;
              return (
                <button
                  key={strategy}
                  type="button"
                  className={cn(
                    'relative z-10 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors duration-200 active:scale-[0.98]',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setSelected(strategy)}
                  disabled={isLoading || isSaving || !!error}
                  title={copy.description}
                >
                  {copy.title}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>Proxy-wide</span>
              {state?.source === 'config' ? (
                <>
                  <span className="text-border">•</span>
                  <span>Local</span>
                </>
              ) : null}
            </div>
            <Button
              size="sm"
              className="h-7 px-2.5 text-[11px] transition-transform duration-200 hover:-translate-y-px active:translate-y-0"
              onClick={() => onApply(selected)}
              disabled={saveDisabled || !!error}
            >
              {isSaving ? 'Saving...' : 'Apply'}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('rounded-xl border border-border/70 bg-background', className)}>
      <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-primary">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div className="text-sm font-medium">Routing strategy</div>
            <Badge variant="secondary">{currentStrategy}</Badge>
            {state ? <Badge variant="outline">{sourceLabel}</Badge> : null}
            {state ? <Badge variant="outline">{state.target}</Badge> : null}
          </div>
          <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
            Proxy-wide account rotation. CCS keeps round-robin as the default until you explicitly
            change it.
          </p>
        </div>

        <div className="flex flex-col gap-2 xl:items-end">
          <div className="inline-flex flex-wrap rounded-lg border border-border/70 bg-muted/35 p-1">
            {(
              Object.entries(STRATEGY_COPY) as Array<
                [RoutingStrategy, { title: string; description: string }]
              >
            ).map(([strategy, copy]) => {
              const active = selected === strategy;
              return (
                <button
                  key={strategy}
                  type="button"
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => setSelected(strategy)}
                  disabled={isLoading || isSaving || !!error}
                >
                  {copy.title}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? (
                <ChevronUp className="mr-1 h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="mr-1 h-3.5 w-3.5" />
              )}
              {detailToggleLabel}
            </Button>
            <Button size="sm" onClick={() => onApply(selected)} disabled={saveDisabled || !!error}>
              {isSaving ? 'Saving...' : `Use ${selected}`}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground xl:col-span-2">
          <span>Round robin spreads usage.</span>
          <span className="hidden text-border sm:inline">•</span>
          <span>Fill first keeps backup accounts cold until they are needed.</span>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm xl:col-span-2">
            {error.message}
          </div>
        ) : null}
        {!error && state?.message ? (
          <div className="rounded-lg border border-border/70 bg-muted/35 px-3 py-2 text-xs text-muted-foreground xl:col-span-2">
            {state.message}
          </div>
        ) : null}

        {detailsOpen ? (
          <div className="grid gap-4 border-t border-border/60 pt-3 md:grid-cols-2 xl:col-span-2">
            {(
              Object.entries(STRATEGY_COPY) as Array<
                [RoutingStrategy, { title: string; description: string }]
              >
            ).map(([strategy, copy]) => {
              const current = currentStrategy === strategy;
              return (
                <div key={strategy} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium">{copy.title}</div>
                    {current ? <Badge variant="secondary">Current</Badge> : null}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{copy.description}</p>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
