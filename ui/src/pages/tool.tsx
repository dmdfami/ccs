import { Wrench } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { useTool } from '@/hooks/use-tool';
import { CopilotPage } from './copilot';
import { CursorPage } from './cursor';

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = useTool(toolId);

  if (!toolId) {
    return <Navigate to="/" replace />;
  }

  if (toolId === 'copilot') {
    return <CopilotPage />;
  }

  if (toolId === 'cursor') {
    return <CursorPage />;
  }

  if (!tool) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Wrench className="h-5 w-5" />
          <span>{tool.label}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          This tool is registered in CCS, but a dedicated dashboard module is not available yet.
        </p>
        <p className="text-sm text-muted-foreground">
          Use the CLI command: <code className="font-mono">ccs tool {tool.id} help</code>
        </p>
      </div>
    </div>
  );
}
