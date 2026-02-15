import type {
  ProviderCatalogEntry,
  ProviderOAuthFlowType as ApiProviderOAuthFlowType,
  CLIProxyProvider as ApiCLIProxyProvider,
} from './api-client';
import {
  FALLBACK_PROVIDER_CATALOG,
  KNOWN_PROVIDER_IDS,
  LEGACY_PROVIDER_COLORS,
  LEGACY_PROVIDER_DISPLAY_NAMES,
  UI_PROVIDER_METADATA,
  type UiProviderMetadataInput,
} from './provider-config-data';

export const CLIPROXY_PROVIDERS = KNOWN_PROVIDER_IDS;

export type CLIProxyProvider = ApiCLIProxyProvider;
export type ProviderOAuthFlowType = ApiProviderOAuthFlowType;

interface ProviderMetadata {
  displayName: string;
  setupName: string;
  setupDescription: string;
  deviceCodeDisplayName: string;
  color: string;
  assetPath: string | null;
  oauthFlow: ProviderOAuthFlowType;
  nicknameRequired: boolean;
  logoFallbackTextClass: string;
  logoFallbackLetter: string;
  wizardOrder: number;
}

function normalizeProviderKey(value: string): string {
  return value.trim().toLowerCase();
}

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
}

function sanitizeCatalogEntry(entry: unknown): ProviderCatalogEntry | null {
  const entryRecord = asObjectRecord(entry);
  if (!entryRecord) {
    return null;
  }

  const normalizedId = normalizeProviderKey(
    typeof entryRecord['id'] === 'string' ? entryRecord['id'] : String(entryRecord['id'] ?? '')
  );
  if (!normalizedId) {
    return null;
  }

  const displayName =
    typeof entryRecord['displayName'] === 'string' && entryRecord['displayName'].trim().length > 0
      ? entryRecord['displayName'].trim()
      : normalizedId;

  const oauthFlowValue = entryRecord['oauthFlow'];
  const oauthFlow: ProviderOAuthFlowType =
    oauthFlowValue === 'device_code' ? 'device_code' : 'authorization_code';

  const aliases = Array.isArray(entryRecord['aliases'])
    ? [
        ...new Set(
          entryRecord['aliases']
            .map((alias) => (typeof alias === 'string' ? normalizeProviderKey(alias) : ''))
            .filter(Boolean)
        ),
      ]
    : [];

  const logoAssetPathValue = entryRecord['logoAssetPath'];
  const logoAssetPath =
    typeof logoAssetPathValue === 'string' && logoAssetPathValue.trim().length > 0
      ? logoAssetPathValue
      : null;

  const features = asObjectRecord(entryRecord['features']);

  return {
    id: normalizedId,
    displayName,
    oauthFlow,
    aliases,
    logoAssetPath,
    features: {
      supportsQuota: features?.['supportsQuota'] === true,
      requiresNickname: features?.['requiresNickname'] === true,
      supportsImageAnalysis: features?.['supportsImageAnalysis'] === true,
    },
  };
}

function buildAliasMap(entries: readonly ProviderCatalogEntry[]): Map<string, string> {
  const sortedEntries = [...entries].sort((left, right) =>
    normalizeProviderKey(left.id).localeCompare(normalizeProviderKey(right.id))
  );
  const aliasMap = new Map<string, string>();
  for (const entry of sortedEntries) {
    const canonicalId = normalizeProviderKey(entry.id);
    if (!canonicalId) {
      continue;
    }
    const names = [
      canonicalId,
      ...entry.aliases.map((alias) => normalizeProviderKey(alias)),
    ].sort();
    for (const name of names) {
      const normalized = normalizeProviderKey(name);
      if (normalized) {
        // Keep first deterministic winner for collisions.
        if (!aliasMap.has(normalized)) {
          aliasMap.set(normalized, canonicalId);
        }
      }
    }
  }
  return aliasMap;
}

let runtimeCatalogById = new Map<string, ProviderCatalogEntry>();
let runtimeAliasMap = new Map<string, string>();
const fallbackAliasMap = buildAliasMap(Object.values(FALLBACK_PROVIDER_CATALOG));

export function applyProviderCatalog(entries: readonly ProviderCatalogEntry[] | unknown): void {
  const catalogEntries = Array.isArray(entries) ? entries : [];
  const nextCatalog = new Map<string, ProviderCatalogEntry>();
  for (const entry of catalogEntries) {
    const normalizedEntry = sanitizeCatalogEntry(entry);
    if (!normalizedEntry) {
      continue;
    }
    nextCatalog.set(normalizedEntry.id, normalizedEntry);
  }

  runtimeCatalogById = nextCatalog;
  runtimeAliasMap = buildAliasMap([...nextCatalog.values()]);
}

export function resetProviderCatalogForTests(): void {
  runtimeCatalogById = new Map();
  runtimeAliasMap = new Map();
}

function getCatalogEntry(providerId: string): ProviderCatalogEntry | null {
  const normalized = normalizeProviderKey(providerId);
  return runtimeCatalogById.get(normalized) ?? FALLBACK_PROVIDER_CATALOG[normalized] ?? null;
}

function getMergedCatalogEntries(): ProviderCatalogEntry[] {
  const merged = new Map<string, ProviderCatalogEntry>();
  for (const [id, entry] of Object.entries(FALLBACK_PROVIDER_CATALOG)) {
    const normalizedId = normalizeProviderKey(id);
    if (!normalizedId) {
      continue;
    }
    const normalizedEntry = sanitizeCatalogEntry(entry);
    if (normalizedEntry) {
      merged.set(normalizedId, normalizedEntry);
    }
  }
  for (const [id, entry] of runtimeCatalogById.entries()) {
    merged.set(id, entry);
  }
  return [...merged.values()];
}

function getCanonicalProvider(provider: string): string | null {
  const normalized = normalizeProviderKey(provider);
  if (!normalized) {
    return null;
  }

  if (runtimeCatalogById.has(normalized) || FALLBACK_PROVIDER_CATALOG[normalized]) {
    return normalized;
  }

  const mappedRuntime = runtimeAliasMap.get(normalized);
  if (mappedRuntime) {
    return mappedRuntime;
  }

  return fallbackAliasMap.get(normalized) ?? null;
}

function getUiMetadata(provider: string): UiProviderMetadataInput {
  if (provider in UI_PROVIDER_METADATA) {
    return UI_PROVIDER_METADATA[provider as keyof typeof UI_PROVIDER_METADATA];
  }

  return {
    color: '#6b7280',
    setupDescription: `${provider} models`,
    deviceCodeDisplayName: provider,
    logoFallbackTextClass: 'text-gray-600',
    logoFallbackLetter: provider[0]?.toUpperCase() || '?',
    wizardOrder: 99,
  };
}

export function isValidProvider(provider: string): boolean {
  return getCanonicalProvider(provider) !== null;
}

export function getProviderMetadata(provider: string): ProviderMetadata | null {
  const canonicalProvider = getCanonicalProvider(provider);
  if (!canonicalProvider) {
    return null;
  }

  const catalogEntry = getCatalogEntry(canonicalProvider);
  if (!catalogEntry) {
    return null;
  }
  const ui = getUiMetadata(canonicalProvider);

  return {
    displayName: catalogEntry.displayName,
    setupName: catalogEntry.displayName,
    setupDescription: ui.setupDescription,
    deviceCodeDisplayName: ui.deviceCodeDisplayName ?? catalogEntry.displayName,
    color: ui.color,
    assetPath: catalogEntry.logoAssetPath,
    oauthFlow: catalogEntry.oauthFlow,
    nicknameRequired: catalogEntry.features.requiresNickname,
    logoFallbackTextClass: ui.logoFallbackTextClass,
    logoFallbackLetter: ui.logoFallbackLetter,
    wizardOrder: ui.wizardOrder,
  };
}

function createDynamicRecord(builder: () => Record<string, string>): Record<string, string> {
  return new Proxy({} as Record<string, string>, {
    get(_target, prop: string | symbol): string | undefined {
      if (typeof prop !== 'string') {
        return undefined;
      }
      return builder()[prop];
    },
    has(_target, prop: string | symbol): boolean {
      if (typeof prop !== 'string') {
        return false;
      }
      return prop in builder();
    },
    ownKeys(): ArrayLike<string | symbol> {
      return Reflect.ownKeys(builder());
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol): PropertyDescriptor | undefined {
      if (typeof prop !== 'string') {
        return undefined;
      }
      const value = builder()[prop];
      if (value === undefined) {
        return undefined;
      }
      return {
        configurable: true,
        enumerable: true,
        value,
      };
    },
  });
}

export function getProviderIds(): string[] {
  return getMergedCatalogEntries()
    .map((entry) => entry.id)
    .sort((left, right) => {
      const orderDiff =
        (getUiMetadata(left).wizardOrder ?? 99) - (getUiMetadata(right).wizardOrder ?? 99);
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return left.localeCompare(right);
    });
}

export function getProviderAssets(): Record<string, string> {
  return getProviderIds().reduce(
    (assets, provider) => {
      const metadata = getProviderMetadata(provider);
      if (metadata?.assetPath) {
        assets[provider] = metadata.assetPath;
      }
      return assets;
    },
    {} as Record<string, string>
  );
}

export function getProviderAsset(provider: string): string | null {
  return getProviderMetadata(provider)?.assetPath ?? null;
}

export function getProviderColors(): Record<string, string> {
  return {
    ...getProviderIds().reduce(
      (colors, provider) => {
        const metadata = getProviderMetadata(provider);
        if (metadata) {
          colors[provider] = metadata.color;
        }
        return colors;
      },
      {} as Record<string, string>
    ),
    ...LEGACY_PROVIDER_COLORS,
  };
}

export function getProviderColor(provider: string): string {
  const metadata = getProviderMetadata(provider);
  if (metadata) {
    return metadata.color;
  }
  return LEGACY_PROVIDER_COLORS[normalizeProviderKey(provider)] ?? '#6b7280';
}

export const PROVIDER_ASSETS: Record<string, string> = createDynamicRecord(getProviderAssets);

export const PROVIDER_COLORS: Record<string, string> = createDynamicRecord(getProviderColors);

export function getProviderDisplayName(provider: string): string {
  const metadata = getProviderMetadata(provider);
  if (metadata) {
    return metadata.displayName;
  }

  return LEGACY_PROVIDER_DISPLAY_NAMES[provider.toLowerCase()] || provider;
}

export function getProviderDeviceCodeDisplayName(provider: string): string {
  const metadata = getProviderMetadata(provider);
  if (metadata) {
    return metadata.deviceCodeDisplayName;
  }

  return getProviderDisplayName(provider);
}

export function getProviderSetupInfo(provider: string): {
  name: string;
  description: string;
} {
  const metadata = getProviderMetadata(provider);
  if (metadata) {
    return {
      name: metadata.setupName,
      description: metadata.setupDescription,
    };
  }

  return {
    name: provider,
    description: `${provider} models`,
  };
}

export function getProviderLogoMetadata(provider: string): {
  assetPath: string | null;
  textClass: string;
  letter: string;
} {
  const metadata = getProviderMetadata(provider);
  if (metadata) {
    return {
      assetPath: metadata.assetPath,
      textClass: metadata.logoFallbackTextClass,
      letter: metadata.logoFallbackLetter,
    };
  }

  return {
    assetPath: null,
    textClass: 'text-gray-600',
    letter: provider[0]?.toUpperCase() || '?',
  };
}

export function getDeviceCodeProviders(): string[] {
  return getProviderIds().filter(
    (provider) => getProviderMetadata(provider)?.oauthFlow === 'device_code'
  );
}

export function getWizardProviderOrder(): string[] {
  return getProviderIds();
}

export function isDeviceCodeProvider(provider: string): boolean {
  return getProviderMetadata(provider)?.oauthFlow === 'device_code';
}

export function getNicknameRequiredProviders(): string[] {
  return getProviderIds().filter(
    (provider) => getProviderMetadata(provider)?.nicknameRequired ?? false
  );
}

export function isNicknameRequiredProvider(provider: string): boolean {
  return getProviderMetadata(provider)?.nicknameRequired ?? false;
}

export const KIRO_AUTH_METHODS = ['aws', 'aws-authcode', 'google', 'github'] as const;
export type KiroAuthMethod = (typeof KIRO_AUTH_METHODS)[number];

export type KiroFlowType = 'authorization_code' | 'device_code';
export type KiroStartEndpoint = 'start' | 'start-url';

export interface KiroAuthMethodOption {
  id: KiroAuthMethod;
  label: string;
  description: string;
  flowType: KiroFlowType;
  startEndpoint: KiroStartEndpoint;
}

export const DEFAULT_KIRO_AUTH_METHOD: KiroAuthMethod = 'aws';

export const KIRO_AUTH_METHOD_OPTIONS: readonly KiroAuthMethodOption[] = [
  {
    id: 'aws',
    label: 'AWS Builder ID (Recommended)',
    description: 'Device code flow for AWS organizations and Builder ID accounts.',
    flowType: 'device_code',
    startEndpoint: 'start',
  },
  {
    id: 'aws-authcode',
    label: 'AWS Builder ID (Auth Code)',
    description: 'Authorization code flow via CLI binary.',
    flowType: 'authorization_code',
    startEndpoint: 'start',
  },
  {
    id: 'google',
    label: 'Google OAuth',
    description: 'Social OAuth flow with callback URL support.',
    flowType: 'authorization_code',
    startEndpoint: 'start-url',
  },
  {
    id: 'github',
    label: 'GitHub OAuth',
    description: 'Social OAuth flow via management API callback.',
    flowType: 'authorization_code',
    startEndpoint: 'start-url',
  },
];

export function getKiroAuthMethodOption(method: KiroAuthMethod): KiroAuthMethodOption {
  const match = KIRO_AUTH_METHOD_OPTIONS.find((option) => option.id === method);
  return match ?? KIRO_AUTH_METHOD_OPTIONS[0];
}
