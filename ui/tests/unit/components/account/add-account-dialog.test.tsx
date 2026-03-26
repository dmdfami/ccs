import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/lib/i18n';
import { AddAccountDialog } from '@/components/account/add-account-dialog';
import { render, screen, userEvent, waitFor } from '@tests/setup/test-utils';

const authMocks = vi.hoisted(() => ({
  startAuth: vi.fn(),
  cancelAuth: vi.fn(),
  submitCallback: vi.fn(),
}));

const kiroImportMocks = vi.hoisted(() => ({
  mutate: vi.fn(),
}));

vi.mock('@/hooks/use-cliproxy-auth-flow', () => ({
  useCliproxyAuthFlow: () => ({
    provider: null,
    isAuthenticating: false,
    error: null,
    authUrl: null,
    oauthState: null,
    isSubmittingCallback: false,
    isDeviceCodeFlow: false,
    startAuth: authMocks.startAuth,
    cancelAuth: authMocks.cancelAuth,
    submitCallback: authMocks.submitCallback,
  }),
}));

vi.mock('@/hooks/use-cliproxy', () => ({
  useKiroImport: () => ({
    isPending: false,
    mutate: kiroImportMocks.mutate,
  }),
}));

function createJsonResponse(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AddAccountDialog Gemini power user mode', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips the Gemini typed acknowledgement when power user mode is enabled', async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ antigravityAckBypass: true }));

    render(
      <AddAccountDialog open onClose={vi.fn()} provider="gemini" displayName="Gemini" />
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/settings/auth/antigravity-risk')
    );

    const authenticateButton = screen.getByRole('button', { name: 'Authenticate' });
    await waitFor(() => expect(authenticateButton).toBeEnabled());

    expect(screen.getByText('Power user mode enabled')).toBeInTheDocument();
    expect(screen.queryByText(/Type exact phrase to continue/i)).not.toBeInTheDocument();

    await userEvent.click(authenticateButton);

    expect(authMocks.startAuth).toHaveBeenCalledWith(
      'gemini',
      expect.objectContaining({
        riskAcknowledgement: undefined,
      })
    );
  });

  it('keeps the Gemini typed acknowledgement when power user mode is disabled', async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ antigravityAckBypass: false }));

    render(
      <AddAccountDialog open onClose={vi.fn()} provider="gemini" displayName="Gemini" />
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/settings/auth/antigravity-risk')
    );

    const authenticateButton = screen.getByRole('button', { name: 'Authenticate' });
    await waitFor(() => expect(authenticateButton).toBeDisabled());

    expect(screen.getByText(/Type exact phrase to continue/i)).toBeInTheDocument();
    expect(screen.queryByText('Power user mode enabled')).not.toBeInTheDocument();
    expect(authMocks.startAuth).not.toHaveBeenCalled();
  });
});
