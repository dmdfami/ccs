import { COPILOT_SUBCOMMANDS, handleCopilotCommandLegacy } from '../../commands/copilot-command';
import copilotRoutes from '../../web-server/routes/copilot-routes';
import type { ToolAdapter } from '../types';

export const copilotToolAdapter: ToolAdapter = {
  id: 'copilot',
  summary: 'GitHub Copilot integration commands',
  subcommands: COPILOT_SUBCOMMANDS,
  routes: [
    {
      path: '/',
      auth: 'required',
      router: copilotRoutes,
    },
  ],
  run: handleCopilotCommandLegacy,
};
