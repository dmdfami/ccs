/**
 * Constants for Quick Setup Wizard
 * Provider display info with custom ordering for wizard UI.
 * Provider IDs are derived from provider catalog runtime/fallback metadata.
 */

import type { ProviderOption } from './types';
import { getProviderSetupInfo, getWizardProviderOrder } from '@/lib/provider-config';

export function getProviders(): ProviderOption[] {
  return getWizardProviderOrder().map((id) => {
    const providerInfo = getProviderSetupInfo(id);
    return {
      id,
      name: providerInfo.name,
      description: providerInfo.description,
    };
  });
}

function createDynamicProviders(): ProviderOption[] {
  return new Proxy([] as ProviderOption[], {
    get(_target, prop: string | symbol): unknown {
      return Reflect.get(getProviders(), prop);
    },
    has(_target, prop: string | symbol): boolean {
      return Reflect.has(getProviders(), prop);
    },
    ownKeys(): ArrayLike<string | symbol> {
      return Reflect.ownKeys(getProviders());
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol): PropertyDescriptor | undefined {
      return Object.getOwnPropertyDescriptor(getProviders(), prop);
    },
  });
}

export const PROVIDERS: ProviderOption[] = createDynamicProviders();

export const ALL_STEPS = ['provider', 'auth', 'variant', 'success'];

export function getStepProgress(step: string): number {
  if (step === 'account') return 1; // Same as auth
  return ALL_STEPS.indexOf(step);
}
