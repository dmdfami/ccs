import { parseFlag } from '../../commands/env-command';

interface ParsedSetupFlag {
  value: string | undefined;
  provided: boolean;
  missingValue: boolean;
}

export interface ParsedSetupFlags {
  profile: ParsedSetupFlag;
  endpoint: ParsedSetupFlag;
  key: ParsedSetupFlag;
}

export interface SetupValidationResult {
  errors: string[];
}

function parseSetupFlag(args: string[], name: 'profile' | 'endpoint' | 'key'): ParsedSetupFlag {
  const exactFlag = `--${name}`;
  const prefixedFlag = `${exactFlag}=`;
  const exactIndex = args.findIndex((arg) => arg === exactFlag);
  if (exactIndex !== -1) {
    const next = args[exactIndex + 1];
    if (!next || next.startsWith('--')) {
      return { value: undefined, provided: true, missingValue: true };
    }
    return { value: next, provided: true, missingValue: false };
  }

  const prefixedArg = args.find((arg) => arg.startsWith(prefixedFlag));
  if (!prefixedArg) {
    return { value: undefined, provided: false, missingValue: false };
  }

  const value = prefixedArg.slice(prefixedFlag.length);
  if (value.length === 0) {
    return { value: undefined, provided: true, missingValue: true };
  }

  return { value, provided: true, missingValue: false };
}

export function parseSetupFlags(args: string[]): ParsedSetupFlags {
  return {
    profile: parseSetupFlag(args, 'profile'),
    endpoint: parseSetupFlag(args, 'endpoint'),
    key: parseSetupFlag(args, 'key'),
  };
}

export function validateSetupFlags(flags: ParsedSetupFlags): SetupValidationResult {
  const errors: string[] = [];

  if (flags.profile.missingValue) {
    errors.push('--profile requires a value');
  }
  if (flags.endpoint.missingValue) {
    errors.push('--endpoint requires a value');
  }
  if (flags.key.missingValue) {
    errors.push('--key requires a value');
  }

  if (flags.endpoint.provided && !flags.profile.provided) {
    errors.push('--endpoint requires --profile');
  }
  if (flags.key.provided && !flags.profile.provided) {
    errors.push('--key requires --profile');
  }

  return { errors };
}

export function parseBooleanFlag(
  args: string[],
  name: string,
  aliases: readonly string[] = []
): boolean {
  const keys = [name, ...aliases];
  for (const key of keys) {
    if (args.includes(`--${key}`)) {
      return true;
    }

    const parsed = parseFlag(args, key);
    if (parsed === undefined) {
      continue;
    }

    const normalized = parsed.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
  }

  return false;
}
