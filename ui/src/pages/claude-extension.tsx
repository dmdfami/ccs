import { useState } from 'react';
import { AlertTriangle, Code2, Copy, FolderCog, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClaudeExtensionOptions, useClaudeExtensionSetup } from '@/hooks/use-claude-extension';

function CodeBlockCard({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: string;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <CopyButton value={value} label={`Copy ${title}`} />
        </div>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-md border bg-muted/40 p-4 text-xs leading-6 text-foreground">
          {value}
        </pre>
      </CardContent>
    </Card>
  );
}

export function ClaudeExtensionPage() {
  const optionsQuery = useClaudeExtensionOptions();
  const [profile, setProfile] = useState<string>('');
  const [host, setHost] = useState<string>('vscode');
  const selectedProfile = profile || optionsQuery.data?.profiles?.[0]?.name || '';
  const setupQuery = useClaudeExtensionSetup(selectedProfile, host);
  const activeError = (optionsQuery.error as Error | null) ?? (setupQuery.error as Error | null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Native setup
            </Badge>
            <Badge variant="outline">VS Code first</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Claude IDE Extension</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Generate the correct Claude extension configuration for CCS API profiles, account
            instances, CLIProxy modes, Copilot, and default/native Claude flows.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Target selection</CardTitle>
          <CardDescription>
            Choose the CCS profile and IDE host you want to configure.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">CCS profile</div>
            <Select
              value={selectedProfile}
              onValueChange={setProfile}
              disabled={optionsQuery.isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a profile" />
              </SelectTrigger>
              <SelectContent>
                {optionsQuery.data?.profiles.map((option) => (
                  <SelectItem key={option.name} value={option.name}>
                    {option.label} ({option.profileType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {
                optionsQuery.data?.profiles.find((option) => option.name === selectedProfile)
                  ?.description
              }
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">IDE host</div>
            <Select value={host} onValueChange={setHost} disabled={optionsQuery.isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a host" />
              </SelectTrigger>
              <SelectContent>
                {optionsQuery.data?.hosts.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {optionsQuery.data?.hosts.find((option) => option.id === host)?.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {optionsQuery.isLoading || (selectedProfile && setupQuery.isLoading) ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Resolving extension setup...
        </div>
      ) : null}

      {activeError ? (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-3 pt-6 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{activeError.message}</div>
          </CardContent>
        </Card>
      ) : null}

      {setupQuery.data ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Code2 className="h-4 w-4" />
                  Resolved profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{setupQuery.data.profile.label}</div>
                <div className="text-muted-foreground">{setupQuery.data.profile.description}</div>
                <Badge variant="outline">{setupQuery.data.profile.profileType}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderCog className="h-4 w-4" />
                  Shared settings path
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-mono text-xs break-all">
                  {setupQuery.data.sharedSettings.path}
                </div>
                <div className="text-muted-foreground">
                  Preferred when you want Claude Code CLI and the IDE extension to share one CCS
                  profile.
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Copy className="h-4 w-4" />
                  IDE target
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{setupQuery.data.host.label}</div>
                <div className="font-mono text-xs">{setupQuery.data.host.settingsKey}</div>
                <div className="text-muted-foreground">
                  {setupQuery.data.ideSettings.targetLabel}
                </div>
              </CardContent>
            </Card>
          </div>

          {setupQuery.data.warnings.length > 0 ? (
            <Card className="border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/10">
              <CardContent className="space-y-2 pt-6 text-sm">
                {setupQuery.data.warnings.map((warning) => (
                  <div key={warning} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>{warning}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <CodeBlockCard
              title="Preferred shared Claude settings"
              description={`Run ${setupQuery.data.sharedSettings.command}, or copy the JSON shape shown here for manual edits.`}
              value={setupQuery.data.sharedSettings.json}
            />
            <CodeBlockCard
              title="IDE-local settings.json snippet"
              description={`Replace the full ${setupQuery.data.host.settingsKey} value in ${setupQuery.data.ideSettings.targetLabel}.`}
              value={setupQuery.data.ideSettings.json}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">CLI shortcut</CardTitle>
                  <CardDescription>
                    Use the native shared-settings path directly from the terminal.
                  </CardDescription>
                </div>
                <CopyButton
                  value={setupQuery.data.sharedSettings.command}
                  label="Copy persist command"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="overflow-x-auto rounded-md border bg-muted/40 p-4 text-xs">
                {setupQuery.data.sharedSettings.command}
              </pre>
              {setupQuery.data.notes.length > 0 ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  {setupQuery.data.notes.map((note) => (
                    <div key={note}>- {note}</div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
