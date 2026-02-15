/**
 * Hooks for Auth Monitor data aggregation and state management
 */

import { useState, useMemo, useEffect } from 'react';
import { useCliproxyAuth } from '@/hooks/use-cliproxy';
import { useCliproxyStats, type AccountUsageStats } from '@/hooks/use-cliproxy-stats';
import { getProviderDisplayName } from '@/lib/provider-config';
import type { AuthStatus, OAuthAccount } from '@/lib/api-client';
import type { AccountRow, ProviderStats } from './types';
import { ACCOUNT_COLORS } from './utils';

export interface AuthMonitorData {
  accounts: AccountRow[];
  totalSuccess: number;
  totalFailure: number;
  totalRequests: number;
  unmappedRequests: number;
  providerStats: ProviderStats[];
  overallSuccessRate: number;
  isLoading: boolean;
  error: Error | null;
  timeSinceUpdate: string;
}

/** Hook for computing auth monitor data from CLIProxy auth and stats */
export function useAuthMonitorData(): AuthMonitorData {
  const { data, isLoading, error } = useCliproxyAuth();
  const { data: statsData, isLoading: statsLoading, dataUpdatedAt } = useCliproxyStats();
  const [timeSinceUpdate, setTimeSinceUpdate] = useState('');

  // Live countdown showing time since last data update
  useEffect(() => {
    if (!dataUpdatedAt) return;
    const updateTime = () => {
      const diff = Math.floor((Date.now() - dataUpdatedAt) / 1000);
      if (diff < 60) {
        setTimeSinceUpdate(`${diff}s ago`);
      } else {
        setTimeSinceUpdate(`${Math.floor(diff / 60)}m ago`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  // Build lookup maps for account stats from CLIProxy
  const {
    accountStatsMap,
    accountStatsByProviderAccountId,
    unmappedRequests,
    unmappedSuccess,
    unmappedFailure,
  } = useMemo(() => {
    const byKey = new Map<string, AccountUsageStats>();
    const byProviderAndId = new Map<string, AccountUsageStats>();

    if (statsData?.accountStats) {
      for (const [key, value] of Object.entries(statsData.accountStats)) {
        byKey.set(key, value);
        if (value.provider && value.accountId) {
          byProviderAndId.set(`${value.provider}:${value.accountId}`, value);
        }
      }
    }

    return {
      accountStatsMap: byKey,
      accountStatsByProviderAccountId: byProviderAndId,
      unmappedRequests: statsData?.unmapped?.totalRequests ?? 0,
      unmappedSuccess: statsData?.unmapped?.successCount ?? 0,
      unmappedFailure: statsData?.unmapped?.failureCount ?? 0,
    };
  }, [
    statsData?.accountStats,
    statsData?.unmapped?.failureCount,
    statsData?.unmapped?.successCount,
    statsData?.unmapped?.totalRequests,
  ]);

  // Transform auth status data into account rows
  const { accounts, totalSuccess, totalFailure, totalRequests, providerStats } = useMemo(() => {
    if (!data?.authStatus) {
      return {
        accounts: [] as AccountRow[],
        totalSuccess: 0,
        totalFailure: 0,
        totalRequests: 0,
        providerStats: [] as ProviderStats[],
      };
    }

    const accountsList: AccountRow[] = [];
    const providerMap = new Map<
      string,
      { success: number; failure: number; accounts: AccountRow[] }
    >();
    let tSuccess = 0;
    let tFailure = 0;
    let colorIndex = 0;

    data.authStatus.forEach((status: AuthStatus) => {
      const providerKey = status.provider;
      if (!providerMap.has(providerKey)) {
        providerMap.set(providerKey, { success: 0, failure: 0, accounts: [] });
      }
      const providerData = providerMap.get(providerKey);
      if (!providerData) return;

      status.accounts?.forEach((account: OAuthAccount) => {
        const accountEmail = account.email || account.id;
        const accountProviderKey = `${status.provider}:${account.id}`;
        const realStats =
          accountStatsMap.get(accountEmail) ??
          accountStatsByProviderAccountId.get(accountProviderKey);
        const success = realStats?.successCount ?? 0;
        const failure = realStats?.failureCount ?? 0;
        tSuccess += success;
        tFailure += failure;
        providerData.success += success;
        providerData.failure += failure;

        const row: AccountRow = {
          id: account.id,
          email: account.email || account.id,
          provider: status.provider,
          displayName: status.displayName,
          isDefault: account.isDefault,
          successCount: success,
          failureCount: failure,
          lastUsedAt: realStats?.lastUsedAt ?? account.lastUsedAt,
          color: ACCOUNT_COLORS[colorIndex % ACCOUNT_COLORS.length],
          projectId: account.projectId,
          paused: account.paused,
          tier: account.tier,
        };
        accountsList.push(row);
        providerData.accounts.push(row);
        colorIndex++;
      });
    });

    // Build provider stats array
    const providerStatsArr: ProviderStats[] = [];
    providerMap.forEach((pData, provider) => {
      if (pData.accounts.length === 0) return;
      providerStatsArr.push({
        provider,
        displayName: getProviderDisplayName(provider),
        totalRequests: pData.success + pData.failure,
        successCount: pData.success,
        failureCount: pData.failure,
        accountCount: pData.accounts.length,
        accounts: pData.accounts,
      });
    });
    providerStatsArr.sort((a, b) => b.totalRequests - a.totalRequests);

    const totalSuccessWithUnmapped = tSuccess + unmappedSuccess;
    const totalFailureWithUnmapped = tFailure + unmappedFailure;

    return {
      accounts: accountsList,
      totalSuccess: totalSuccessWithUnmapped,
      totalFailure: totalFailureWithUnmapped,
      totalRequests: totalSuccessWithUnmapped + totalFailureWithUnmapped,
      providerStats: providerStatsArr,
    };
  }, [
    accountStatsByProviderAccountId,
    accountStatsMap,
    data?.authStatus,
    unmappedFailure,
    unmappedSuccess,
  ]);

  const overallSuccessRate =
    totalRequests > 0 ? Math.round((totalSuccess / totalRequests) * 100) : 100;

  return {
    accounts,
    totalSuccess,
    totalFailure,
    totalRequests,
    unmappedRequests,
    providerStats,
    overallSuccessRate,
    isLoading: isLoading || statsLoading,
    error: error ?? null,
    timeSinceUpdate,
  };
}
