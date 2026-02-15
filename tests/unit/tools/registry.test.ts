import { describe, it, expect } from 'bun:test';
import {
  getToolAdapter,
  hasToolSubcommand,
  listToolAdapters,
  listToolRouteBindings,
} from '../../../src/tools/registry';

describe('tool registry', () => {
  it('registers built-in adapters', () => {
    const ids = listToolAdapters().map((adapter) => adapter.id);
    expect(ids).toEqual(['copilot', 'cursor', 'droid']);
  });

  it('resolves adapters case-insensitively', () => {
    expect(getToolAdapter('CuRsOr')?.id).toBe('cursor');
  });

  it('returns undefined for unknown adapter', () => {
    expect(getToolAdapter('unknown')).toBeUndefined();
  });

  it('reports known subcommands', () => {
    expect(hasToolSubcommand('droid', 'setup')).toBe(true);
    expect(hasToolSubcommand('droid', 'missing')).toBe(false);
  });

  it('exposes API route bindings for tools with web modules', () => {
    const bindings = listToolRouteBindings();
    const routeIds = bindings.map((binding) => binding.toolId);

    expect(routeIds).toContain('copilot');
    expect(routeIds).toContain('cursor');
    expect(routeIds).not.toContain('droid');
    expect(bindings.every((binding) => binding.auth === 'required' || binding.auth === 'optional')).toBe(
      true
    );
  });
});
