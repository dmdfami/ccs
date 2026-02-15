import type { ProviderCatalogEntry } from './api-client';

export const KNOWN_PROVIDER_IDS: readonly string[] = [
  'gemini',
  'codex',
  'agy',
  'qwen',
  'iflow',
  'kiro',
  'ghcp',
  'claude',
];

export interface UiProviderMetadataInput {
  color: string;
  setupDescription: string;
  deviceCodeDisplayName?: string;
  logoFallbackTextClass: string;
  logoFallbackLetter: string;
  wizardOrder: number;
}

export const LEGACY_PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  vertex: 'Vertex AI',
};

export const LEGACY_PROVIDER_COLORS: Record<string, string> = {
  vertex: '#4285F4',
};

export const FALLBACK_PROVIDER_CATALOG: Record<string, ProviderCatalogEntry> = {
  gemini: {
    id: 'gemini',
    displayName: 'Google Gemini',
    oauthFlow: 'authorization_code',
    aliases: ['gemini-cli'],
    logoAssetPath: '/assets/providers/gemini-color.svg',
    features: {
      supportsQuota: false,
      requiresNickname: false,
      supportsImageAnalysis: true,
    },
  },
  codex: {
    id: 'codex',
    displayName: 'Codex',
    oauthFlow: 'authorization_code',
    aliases: [],
    logoAssetPath: '/assets/providers/openai.svg',
    features: {
      supportsQuota: false,
      requiresNickname: false,
      supportsImageAnalysis: true,
    },
  },
  agy: {
    id: 'agy',
    displayName: 'AntiGravity',
    oauthFlow: 'authorization_code',
    aliases: ['antigravity'],
    logoAssetPath: '/assets/providers/agy.png',
    features: {
      supportsQuota: true,
      requiresNickname: false,
      supportsImageAnalysis: true,
    },
  },
  qwen: {
    id: 'qwen',
    displayName: 'Qwen',
    oauthFlow: 'device_code',
    aliases: [],
    logoAssetPath: '/assets/providers/qwen-color.svg',
    features: {
      supportsQuota: false,
      requiresNickname: false,
      supportsImageAnalysis: true,
    },
  },
  iflow: {
    id: 'iflow',
    displayName: 'iFlow',
    oauthFlow: 'authorization_code',
    aliases: [],
    logoAssetPath: '/assets/providers/iflow.png',
    features: {
      supportsQuota: false,
      requiresNickname: false,
      supportsImageAnalysis: true,
    },
  },
  kiro: {
    id: 'kiro',
    displayName: 'Kiro (AWS)',
    oauthFlow: 'device_code',
    aliases: ['codewhisperer'],
    logoAssetPath: '/assets/providers/kiro.png',
    features: {
      supportsQuota: false,
      requiresNickname: true,
      supportsImageAnalysis: true,
    },
  },
  ghcp: {
    id: 'ghcp',
    displayName: 'GitHub Copilot (OAuth)',
    oauthFlow: 'device_code',
    aliases: ['github-copilot', 'copilot'],
    logoAssetPath: '/assets/providers/copilot.svg',
    features: {
      supportsQuota: false,
      requiresNickname: true,
      supportsImageAnalysis: true,
    },
  },
  claude: {
    id: 'claude',
    displayName: 'Claude',
    oauthFlow: 'authorization_code',
    aliases: ['anthropic'],
    logoAssetPath: '/assets/providers/claude.svg',
    features: {
      supportsQuota: false,
      requiresNickname: false,
      supportsImageAnalysis: true,
    },
  },
};

export const UI_PROVIDER_METADATA: Record<string, UiProviderMetadataInput> = {
  gemini: {
    color: '#4285F4',
    setupDescription: 'Gemini Pro/Flash models',
    deviceCodeDisplayName: 'Gemini',
    logoFallbackTextClass: 'text-blue-600',
    logoFallbackLetter: 'G',
    wizardOrder: 3,
  },
  codex: {
    color: '#10a37f',
    setupDescription: 'GPT-4 and codex models',
    deviceCodeDisplayName: 'Codex',
    logoFallbackTextClass: 'text-emerald-600',
    logoFallbackLetter: 'X',
    wizardOrder: 4,
  },
  agy: {
    color: '#f3722c',
    setupDescription: 'Antigravity AI models',
    deviceCodeDisplayName: 'Antigravity',
    logoFallbackTextClass: 'text-violet-600',
    logoFallbackLetter: 'A',
    wizardOrder: 1,
  },
  qwen: {
    color: '#6236FF',
    setupDescription: 'Qwen Code models',
    deviceCodeDisplayName: 'Qwen Code',
    logoFallbackTextClass: 'text-cyan-600',
    logoFallbackLetter: 'Q',
    wizardOrder: 5,
  },
  iflow: {
    color: '#f94144',
    setupDescription: 'iFlow AI models',
    deviceCodeDisplayName: 'iFlow',
    logoFallbackTextClass: 'text-indigo-600',
    logoFallbackLetter: 'I',
    wizardOrder: 6,
  },
  kiro: {
    color: '#4d908e',
    setupDescription: 'AWS CodeWhisperer models',
    deviceCodeDisplayName: 'Kiro (AWS)',
    logoFallbackTextClass: 'text-teal-600',
    logoFallbackLetter: 'K',
    wizardOrder: 7,
  },
  ghcp: {
    color: '#43aa8b',
    setupDescription: 'GitHub Copilot via OAuth',
    deviceCodeDisplayName: 'GitHub Copilot',
    logoFallbackTextClass: 'text-green-600',
    logoFallbackLetter: 'C',
    wizardOrder: 8,
  },
  claude: {
    color: '#D97757',
    setupDescription: 'Claude Opus/Sonnet models',
    deviceCodeDisplayName: 'Claude',
    logoFallbackTextClass: 'text-orange-600',
    logoFallbackLetter: 'C',
    wizardOrder: 2,
  },
};
