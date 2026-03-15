import { useQuery } from '@tanstack/react-query';
import { withApiBase } from '@/lib/api-client';

export interface ClaudeExtensionProfileOption {
  name: string;
  profileType: string;
  label: string;
  description: string;
}

export interface ClaudeExtensionHostOption {
  id: 'vscode' | 'cursor' | 'windsurf';
  label: string;
  settingsKey: string;
  disableLoginPromptKey?: string;
  settingsTargetLabel: string;
  description: string;
}

export interface ClaudeExtensionSetupPayload {
  profile: {
    requestedProfile: string;
    resolvedProfileName: string;
    profileType: string;
    label: string;
    description: string;
  };
  host: ClaudeExtensionHostOption;
  env: Array<{ name: string; value: string }>;
  warnings: string[];
  notes: string[];
  removeEnvKeys: string[];
  sharedSettings: {
    path: string;
    command: string;
    json: string;
  };
  ideSettings: {
    targetLabel: string;
    json: string;
  };
}

async function requestJson<T>(url: string): Promise<T> {
  const res = await fetch(withApiBase(url));
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function useClaudeExtensionOptions() {
  return useQuery({
    queryKey: ['claude-extension-options'],
    queryFn: () =>
      requestJson<{ profiles: ClaudeExtensionProfileOption[]; hosts: ClaudeExtensionHostOption[] }>(
        '/claude-extension/profiles'
      ),
  });
}

export function useClaudeExtensionSetup(profile?: string, host: string = 'vscode') {
  return useQuery({
    queryKey: ['claude-extension-setup', profile, host],
    enabled: Boolean(profile),
    queryFn: () =>
      requestJson<ClaudeExtensionSetupPayload>(
        `/claude-extension/setup?profile=${encodeURIComponent(profile || '')}&host=${encodeURIComponent(host)}`
      ),
  });
}
