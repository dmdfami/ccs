import { parseFlag, detectShell, formatExportLine } from '../../commands/env-command';
import { fail, info, ok } from '../../utils/ui';
import type { ToolAdapter } from '../types';
import droidRoutes from '../../web-server/routes/droid-routes';
import {
  checkDroidHealth,
  createDefaultDroidConfig,
  getDroidConfigPath,
  getDroidDir,
  readDroidConfig,
  validateDroidEndpoint,
  writeDroidConfigAtomic,
  type DroidConfig,
} from './droid-config';
import {
  parseBooleanFlag,
  parseSetupFlags,
  validateSetupFlags,
  type ParsedSetupFlags,
} from './droid-tool-flags';

const DROID_SUBCOMMANDS = ['setup', 'env', 'doctor', 'help', '--help', '-h'] as const;
const VALID_SHELL_INPUTS = ['auto', 'bash', 'zsh', 'fish', 'powershell'] as const;

function isValidShellInput(value: string): boolean {
  return VALID_SHELL_INPUTS.includes(value as (typeof VALID_SHELL_INPUTS)[number]);
}

function isPromptCancelled(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /cancel|canceled|cancelled|force closed|aborted|sigint/i.test(error.message);
}

async function promptWithDefault(label: string, fallback: string): Promise<string> {
  const { input } = await import('@inquirer/prompts');
  return input({
    message: label,
    default: fallback,
  });
}

async function promptApiKey(existingApiKey: string): Promise<string> {
  const { password } = await import('@inquirer/prompts');
  const entered = await password({
    message: existingApiKey
      ? 'Droid API key (leave blank to keep current key)'
      : 'Droid API key (optional)',
    mask: '*',
  });

  if (entered.trim().length === 0) {
    return existingApiKey;
  }
  return entered;
}

function normalizeSetupConfig(
  existing: DroidConfig,
  flags: ParsedSetupFlags,
  values: { profile?: string; endpoint?: string; apiKey?: string }
): DroidConfig {
  const profile = values.profile ?? flags.profile.value ?? existing.profile;
  const endpoint = values.endpoint ?? flags.endpoint.value ?? existing.endpoint;
  const apiKey = values.apiKey ?? flags.key.value ?? existing.apiKey;

  return {
    profile: profile.trim() || createDefaultDroidConfig().profile,
    endpoint: endpoint.trim() || createDefaultDroidConfig().endpoint,
    apiKey: apiKey.trim(),
    updatedAt: new Date().toISOString(),
  };
}

function showHelp(): number {
  console.log('Factory Droid Adapter');
  console.log('');
  console.log('Usage: ccs tool droid <subcommand>');
  console.log('');
  console.log('Subcommands:');
  console.log('  setup        Initialize droid config under ~/.ccs/tools/droid');
  console.log('  env          Print shell exports for droid integration');
  console.log('  doctor       Check droid config health');
  console.log('  help         Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  ccs tool droid setup');
  console.log('  eval "$(ccs tool droid env)"');
  console.log('  eval "$(ccs tool droid env --include-secrets)"');
  console.log('  ccs tool droid doctor');
  console.log('');
  console.log('Env options:');
  console.log('  --shell <auto|bash|zsh|fish|powershell>  Output shell syntax');
  console.log('  --include-secrets                         Export DROID_API_KEY when configured');
  console.log('');
  return 0;
}

async function handleSetup(args: string[]): Promise<number> {
  const flags = parseSetupFlags(args);
  const validation = validateSetupFlags(flags);
  if (validation.errors.length > 0) {
    for (const error of validation.errors) {
      console.error(fail(error));
    }
    return 1;
  }

  const existing = await readDroidConfig();
  let promptValues: { profile?: string; endpoint?: string; apiKey?: string } = {};

  const shouldPrompt =
    process.stdin.isTTY === true &&
    process.stdout.isTTY === true &&
    (!flags.profile.provided || !flags.endpoint.provided || !flags.key.provided);

  if (shouldPrompt) {
    try {
      promptValues = {
        profile: await promptWithDefault('Droid profile', flags.profile.value ?? existing.profile),
        endpoint: await promptWithDefault(
          'Droid endpoint',
          flags.endpoint.value ?? existing.endpoint
        ),
        apiKey: await promptApiKey(flags.key.value ?? existing.apiKey),
      };
    } catch (error) {
      if (isPromptCancelled(error)) {
        console.error(fail('Droid setup cancelled; no changes written.'));
        return 1;
      }
      throw error;
    }
  }

  const config = normalizeSetupConfig(existing, flags, promptValues);
  const endpointError = validateDroidEndpoint(config.endpoint);
  if (endpointError) {
    console.error(fail(endpointError));
    return 1;
  }
  await writeDroidConfigAtomic(config);

  console.log(ok(`Droid config ready: ${getDroidConfigPath()}`));
  return 0;
}

async function handleEnv(args: string[]): Promise<number> {
  const shellInput = parseFlag(args, 'shell') || 'auto';
  const includeSecrets = parseBooleanFlag(args, 'include-secrets', ['with-api-key']);

  if (!isValidShellInput(shellInput)) {
    console.error(fail(`Invalid shell: ${shellInput}. Use: auto, bash, zsh, fish, powershell`));
    return 1;
  }

  if (args.includes('--with-api-key') || parseFlag(args, 'with-api-key') !== undefined) {
    console.error(info('`--with-api-key` is deprecated. Use `--include-secrets` instead.'));
  }

  const shell = detectShell(shellInput === 'zsh' ? 'bash' : shellInput);
  const droidDir = getDroidDir();
  const configPath = getDroidConfigPath();
  const config = await readDroidConfig();

  const exportsMap: Record<string, string> = {
    DROID_HOME: droidDir,
    DROID_CONFIG: configPath,
    DROID_ENDPOINT: config.endpoint,
    DROID_PROFILE: config.profile,
  };

  if (includeSecrets && config.apiKey) {
    exportsMap['DROID_API_KEY'] = config.apiKey;
  } else if (config.apiKey) {
    console.error(info('DROID_API_KEY omitted by default. Use --include-secrets to export it.'));
  }

  for (const [key, value] of Object.entries(exportsMap)) {
    console.log(formatExportLine(shell, key, value));
  }

  return 0;
}

async function handleDoctor(): Promise<number> {
  console.log(info('Running droid diagnostics...'));
  const config = await readDroidConfig();
  const health = await checkDroidHealth(config);

  if (health.checks.directoryExists) {
    console.log(ok(`Directory exists: ${getDroidDir()}`));
  } else {
    console.error(fail(`Directory missing: ${getDroidDir()}`));
  }

  if (health.checks.configExists) {
    console.log(ok(`Config exists: ${getDroidConfigPath()}`));
  } else {
    console.error(fail(`Config missing: ${getDroidConfigPath()}`));
  }

  if (health.checks.endpointConfigured) {
    console.log(ok(`Endpoint configured: ${config.endpoint}`));
  } else {
    console.error(fail('Endpoint is empty in droid config'));
  }

  if (health.checks.profileConfigured) {
    console.log(ok(`Profile configured: ${config.profile}`));
  } else {
    console.error(fail('Profile is empty in droid config'));
  }

  if (health.checks.endpointReachable) {
    console.log(ok(health.details.endpointMessage));
  } else {
    console.error(fail(health.details.endpointMessage));
  }

  if (health.checks.apiKeyValid === true) {
    console.log(ok(health.details.apiKeyMessage));
  } else if (health.checks.apiKeyValid === false) {
    console.error(fail(health.details.apiKeyMessage));
  } else {
    console.log(info(health.details.apiKeyMessage));
  }

  if (health.checks.modelsAvailable === true) {
    console.log(ok(health.details.modelsMessage));
  } else if (health.checks.modelsAvailable === false) {
    console.error(fail(health.details.modelsMessage));
  } else {
    console.log(info(health.details.modelsMessage));
  }

  return health.healthy ? 0 : 1;
}

async function handleDroidCommand(args: string[]): Promise<number> {
  const subcommand = args[0];

  switch (subcommand) {
    case 'setup':
      return handleSetup(args.slice(1));
    case 'env':
      return handleEnv(args.slice(1));
    case 'doctor':
      return handleDoctor();
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      return showHelp();
    default:
      console.error(fail(`Unknown droid subcommand: ${subcommand}`));
      console.error('');
      console.error(`Use one of: ${DROID_SUBCOMMANDS.join(', ')}`);
      return 1;
  }
}

export const droidToolAdapter: ToolAdapter = {
  id: 'droid',
  summary: 'Factory droid integration commands',
  subcommands: DROID_SUBCOMMANDS,
  routes: [
    {
      path: '/',
      auth: 'required',
      router: droidRoutes,
    },
  ],
  run: handleDroidCommand,
};
