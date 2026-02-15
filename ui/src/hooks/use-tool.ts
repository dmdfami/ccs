import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type ToolDescriptor } from '@/lib/api-client';

interface ToolUiMetadata {
  label: string;
  path: string;
  legacyPaths: string[];
  iconKey?: 'github' | 'wrench';
  iconSrc?: string;
  hasDashboardPage: boolean;
}

export interface DashboardToolNavItem {
  id: string;
  label: string;
  path: string;
  legacyPaths: string[];
  iconKey?: 'github' | 'wrench';
  iconSrc?: string;
}

export interface ToolViewModel extends ToolDescriptor {
  label: string;
  path: string;
  legacyPaths: string[];
  iconKey?: 'github' | 'wrench';
  iconSrc?: string;
  hasDashboardPage: boolean;
}

const TOOL_UI_METADATA: Record<string, ToolUiMetadata> = {
  copilot: {
    label: 'GitHub Copilot',
    path: '/tools/copilot',
    legacyPaths: ['/copilot'],
    iconKey: 'github',
    hasDashboardPage: true,
  },
  cursor: {
    label: 'Cursor IDE',
    path: '/tools/cursor',
    legacyPaths: ['/cursor'],
    iconSrc: '/assets/sidebar/cursor.svg',
    hasDashboardPage: true,
  },
  droid: {
    label: 'Factory Droid',
    path: '/tools/droid',
    legacyPaths: [],
    iconKey: 'wrench',
    hasDashboardPage: false,
  },
};

const FALLBACK_TOOL_DESCRIPTORS: ToolDescriptor[] = [
  {
    id: 'copilot',
    summary: 'GitHub Copilot integration commands',
    subcommands: [],
    hasApiRoutes: true,
  },
  {
    id: 'cursor',
    summary: 'Cursor IDE integration commands',
    subcommands: [],
    hasApiRoutes: true,
  },
];

function toToolViewModel(tool: ToolDescriptor): ToolViewModel {
  const metadata = TOOL_UI_METADATA[tool.id] ?? {
    label: tool.id,
    path: `/tools/${tool.id}`,
    legacyPaths: [],
    iconKey: 'wrench' as const,
    hasDashboardPage: false,
  };

  return {
    ...tool,
    label: metadata.label,
    path: metadata.path,
    legacyPaths: metadata.legacyPaths,
    iconKey: metadata.iconKey,
    iconSrc: metadata.iconSrc,
    hasDashboardPage: metadata.hasDashboardPage && tool.hasApiRoutes,
  };
}

export function useToolRegistry() {
  return useQuery({
    queryKey: ['tools-registry'],
    queryFn: () => api.tools.list(),
    staleTime: 60000,
  });
}

export function useDashboardTools() {
  const query = useToolRegistry();

  const tools = useMemo(() => {
    const descriptors = query.data?.tools ?? FALLBACK_TOOL_DESCRIPTORS;
    return descriptors.map(toToolViewModel).filter((tool) => tool.hasDashboardPage);
  }, [query.data?.tools]);

  const navItems = useMemo<DashboardToolNavItem[]>(() => {
    return tools.map((tool) => ({
      id: tool.id,
      label: tool.label,
      path: tool.path,
      legacyPaths: tool.legacyPaths,
      iconKey: tool.iconKey,
      iconSrc: tool.iconSrc,
    }));
  }, [tools]);

  return {
    ...query,
    tools,
    navItems,
  };
}

export function useTool(toolId: string | undefined): ToolViewModel | null {
  const { data } = useToolRegistry();

  return useMemo(() => {
    if (!toolId) {
      return null;
    }
    const descriptors = data?.tools ?? FALLBACK_TOOL_DESCRIPTORS;
    const tool = descriptors.find((candidate) => candidate.id === toolId);
    return tool ? toToolViewModel(tool) : null;
  }, [data?.tools, toolId]);
}
