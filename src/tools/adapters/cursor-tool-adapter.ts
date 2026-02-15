import { CURSOR_SUBCOMMANDS, handleCursorCommandLegacy } from '../../commands/cursor-command';
import cursorRoutes from '../../web-server/routes/cursor-routes';
import type { ToolAdapter } from '../types';

export const cursorToolAdapter: ToolAdapter = {
  id: 'cursor',
  summary: 'Cursor IDE integration commands',
  subcommands: CURSOR_SUBCOMMANDS,
  routes: [
    {
      path: '/',
      auth: 'required',
      router: cursorRoutes,
    },
  ],
  run: handleCursorCommandLegacy,
};
