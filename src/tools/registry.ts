import { copilotToolAdapter } from './adapters/copilot-tool-adapter';
import { cursorToolAdapter } from './adapters/cursor-tool-adapter';
import { droidToolAdapter } from './adapters/droid-tool-adapter';
import type { ToolAdapter, ToolRouteAuthMode, ToolRouteBinding } from './types';

const BUILTIN_TOOL_ADAPTERS: readonly ToolAdapter[] = [
  droidToolAdapter,
  cursorToolAdapter,
  copilotToolAdapter,
];

const toolAdapterMap = new Map<string, ToolAdapter>();

for (const adapter of BUILTIN_TOOL_ADAPTERS) {
  toolAdapterMap.set(adapter.id.toLowerCase(), adapter);
}

function normalizeToolId(id: string): string {
  return id.trim().toLowerCase();
}

function normalizeRoutePath(path: string): `/${string}` {
  const trimmed = path.trim();
  if (trimmed === '') {
    throw new Error('Tool route path cannot be empty');
  }
  if (!trimmed.startsWith('/')) {
    throw new Error(`Tool route path must start with '/': ${path}`);
  }
  const normalized = trimmed.replace(/\/+$/, '');
  return (normalized === '' ? '/' : normalized) as `/${string}`;
}

function validateAuthMode(mode: ToolRouteAuthMode | undefined, context: string): ToolRouteAuthMode {
  if (mode === 'required' || mode === 'optional') {
    return mode;
  }
  throw new Error(`Tool route is missing auth mode (${context})`);
}

function validateRouteBinding(binding: ToolRouteBinding, adapter: ToolAdapter): ToolRouteBinding {
  const normalizedPath = normalizeRoutePath(binding.path);
  const auth = validateAuthMode(binding.auth, `${adapter.id}:${binding.path}`);

  return {
    ...binding,
    path: normalizedPath,
    auth,
  };
}

export interface RegisteredToolRouteBinding extends ToolRouteBinding {
  toolId: string;
}

export function listToolAdapters(): ToolAdapter[] {
  return [...toolAdapterMap.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function getToolAdapter(id: string): ToolAdapter | undefined {
  return toolAdapterMap.get(normalizeToolId(id));
}

export function listToolRouteBindings(): RegisteredToolRouteBinding[] {
  const bindings: RegisteredToolRouteBinding[] = [];

  for (const adapter of listToolAdapters()) {
    for (const binding of adapter.routes ?? []) {
      const validatedBinding = validateRouteBinding(binding, adapter);
      bindings.push({
        ...validatedBinding,
        toolId: adapter.id,
      });
    }
  }

  return bindings;
}

export function hasToolSubcommand(toolId: string, subcommand: string | undefined): boolean {
  if (!subcommand) {
    return false;
  }

  const adapter = getToolAdapter(toolId);
  if (!adapter) {
    return false;
  }

  return adapter.subcommands.includes(subcommand);
}

export async function dispatchToolAdapter(toolId: string, args: string[]): Promise<number> {
  const adapter = getToolAdapter(toolId);
  if (!adapter) {
    throw new Error(`Unknown tool adapter: ${toolId}`);
  }

  const exitCode = await adapter.run(args);
  return typeof exitCode === 'number' ? exitCode : 0;
}
