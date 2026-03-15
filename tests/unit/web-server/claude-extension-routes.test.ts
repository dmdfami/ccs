import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import express from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Server } from 'http';
import claudeExtensionRoutes from '../../../src/web-server/routes/claude-extension-routes';
import { createEmptyUnifiedConfig } from '../../../src/config/unified-config-types';
import { saveUnifiedConfig } from '../../../src/config/unified-config-loader';

describe('web-server claude-extension-routes', () => {
  let server: Server;
  let baseUrl = '';
  let tempHome = '';
  let originalCcsHome: string | undefined;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/claude-extension', claudeExtensionRoutes);

    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1');
      const handleError = (error: Error) => reject(error);
      server.once('error', handleError);
      server.once('listening', () => {
        server.off('error', handleError);
        resolve();
      });
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to resolve test server port');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-claude-extension-routes-'));
    originalCcsHome = process.env.CCS_HOME;
    process.env.CCS_HOME = tempHome;

    const ccsDir = path.join(tempHome, '.ccs');
    fs.mkdirSync(ccsDir, { recursive: true });
    fs.writeFileSync(
      path.join(ccsDir, 'glm.settings.json'),
      JSON.stringify(
        {
          env: {
            ANTHROPIC_BASE_URL: 'https://api.example.test',
            ANTHROPIC_API_KEY: 'sk-ant-test-123456',
            ANTHROPIC_MODEL: 'claude-sonnet-4-5',
          },
        },
        null,
        2
      ) + '\n'
    );

    const config = createEmptyUnifiedConfig();
    config.profiles.glm = {
      type: 'api',
      settings: path.join(ccsDir, 'glm.settings.json'),
    };
    config.accounts.work = {
      created: '2026-03-15T00:00:00.000Z',
      last_used: null,
      context_mode: 'isolated',
    };
    config.default = 'work';
    saveUnifiedConfig(config);
  });

  afterEach(() => {
    if (originalCcsHome !== undefined) process.env.CCS_HOME = originalCcsHome;
    else delete process.env.CCS_HOME;

    if (tempHome && fs.existsSync(tempHome)) {
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it('lists profile options and IDE host targets', async () => {
    const response = await fetch(`${baseUrl}/api/claude-extension/profiles`);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      profiles: Array<{ name: string }>;
      hosts: Array<{ id: string }>;
    };

    expect(payload.profiles.some((profile) => profile.name === 'default')).toBe(true);
    expect(payload.profiles.some((profile) => profile.name === 'glm')).toBe(true);
    expect(payload.profiles.some((profile) => profile.name === 'work')).toBe(true);
    expect(payload.profiles.some((profile) => profile.name === 'gemini')).toBe(true);
    expect(payload.hosts.map((host) => host.id)).toEqual(['vscode', 'cursor', 'windsurf']);
  });

  it('renders VS Code setup for API profiles with disableLoginPrompt', async () => {
    const response = await fetch(`${baseUrl}/api/claude-extension/setup?profile=glm&host=vscode`);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      host: { settingsKey: string; disableLoginPromptKey?: string };
      ideSettings: { json: string };
      sharedSettings: { command: string; json: string };
    };

    expect(payload.host.settingsKey).toBe('claudeCode.environmentVariables');
    expect(payload.host.disableLoginPromptKey).toBe('claudeCode.disableLoginPrompt');
    expect(payload.ideSettings.json).toContain('"claudeCode.disableLoginPrompt": true');
    expect(payload.ideSettings.json).toContain('"ANTHROPIC_API_KEY"');
    expect(payload.sharedSettings.command).toBe('ccs persist glm');
    expect(payload.sharedSettings.json).toContain('"env"');
  });

  it('renders Windsurf setup for default account resolution via CLAUDE_CONFIG_DIR', async () => {
    const response = await fetch(
      `${baseUrl}/api/claude-extension/setup?profile=default&host=windsurf`
    );
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      profile: { profileType: string; resolvedProfileName: string };
      host: { settingsKey: string };
      ideSettings: { json: string };
      sharedSettings: { command: string };
    };

    expect(payload.profile.profileType).toBe('account');
    expect(payload.profile.resolvedProfileName).toBe('work');
    expect(payload.host.settingsKey).toBe('claude-code.environmentVariables');
    expect(payload.ideSettings.json).toContain('"claude-code.environmentVariables"');
    expect(payload.ideSettings.json).toContain('"CLAUDE_CONFIG_DIR"');
    expect(payload.sharedSettings.command).toBe('ccs persist default');
  });
});
