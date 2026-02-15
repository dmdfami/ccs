import { afterEach, describe, expect, it } from 'vitest';
import {
  applyProviderCatalog,
  getProviderDisplayName,
  getProviderIds,
  getProviderMetadata,
  isValidProvider,
  resetProviderCatalogForTests,
} from '@/lib/provider-config';
import type { ProviderCatalogEntry } from '@/lib/api-client';

describe('provider-config catalog hydration', () => {
  afterEach(() => {
    resetProviderCatalogForTests();
  });

  it('uses API catalog metadata after hydration', () => {
    expect(getProviderDisplayName('gemini')).toBe('Google Gemini');

    applyProviderCatalog([
      {
        id: 'gemini',
        displayName: 'Gemini Runtime',
        oauthFlow: 'authorization_code',
        aliases: ['gemini-runtime'],
        logoAssetPath: '/assets/providers/gemini-runtime.svg',
        features: {
          supportsQuota: false,
          requiresNickname: false,
          supportsImageAnalysis: true,
        },
      },
    ]);

    expect(isValidProvider('gemini-runtime')).toBe(true);
    expect(getProviderDisplayName('gemini')).toBe('Gemini Runtime');
    expect(getProviderMetadata('gemini-runtime')?.displayName).toBe('Gemini Runtime');
  });

  it('ignores malformed catalog entries and keeps fallback metadata', () => {
    applyProviderCatalog([
      {
        id: '',
        displayName: 'invalid',
        oauthFlow: 'authorization_code',
        aliases: [],
        logoAssetPath: null,
        features: {
          supportsQuota: false,
          requiresNickname: false,
          supportsImageAnalysis: false,
        },
      } as unknown as ProviderCatalogEntry,
      {
        id: 'new-provider',
        displayName: '',
        oauthFlow: 'device_code',
        aliases: ['NEW-PROVIDER'],
        logoAssetPath: '',
        features: {
          supportsQuota: true,
          requiresNickname: false,
          supportsImageAnalysis: true,
        },
      },
    ]);

    expect(getProviderDisplayName('gemini')).toBe('Google Gemini');
    expect(isValidProvider('new-provider')).toBe(true);
    expect(isValidProvider('NEW-PROVIDER')).toBe(true);
    expect(getProviderMetadata('new-provider')?.displayName).toBe('new-provider');
    expect(getProviderIds().includes('new-provider')).toBe(true);
  });

  it('ignores non-array catalog payloads without crashing', () => {
    applyProviderCatalog(null);
    applyProviderCatalog({ providers: [] });
    applyProviderCatalog('invalid');

    expect(getProviderDisplayName('gemini')).toBe('Google Gemini');
    expect(isValidProvider('gemini')).toBe(true);
  });
});
