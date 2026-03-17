import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchableSelect } from '@/components/ui/searchable-select';
import { render, screen, userEvent, waitFor } from '@tests/setup/test-utils';

function SearchableSelectHarness() {
  const [value, setValue] = useState<string | undefined>();

  return (
    <SearchableSelect
      value={value}
      onChange={setValue}
      placeholder="Select model"
      searchPlaceholder="Search models..."
      emptyText="No results found."
      groups={[
        { key: 'core', label: 'Core Models' },
        { key: 'other', label: 'Other Models' },
      ]}
      options={[
        {
          value: 'claude-sonnet-4',
          groupKey: 'core',
          searchText: 'Claude Sonnet 4 claude-sonnet-4',
          itemContent: <span>Claude Sonnet 4</span>,
        },
        {
          value: 'gpt-5.3-codex',
          groupKey: 'core',
          searchText: 'GPT-5.3 Codex gpt-5.3-codex',
          itemContent: <span>GPT-5.3 Codex</span>,
        },
        {
          value: 'gemini-2.5-pro',
          groupKey: 'other',
          searchText: 'Gemini 2.5 Pro gemini-2.5-pro',
          itemContent: <span>Gemini 2.5 Pro</span>,
        },
      ]}
    />
  );
}

describe('SearchableSelect', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn(() => false),
    });
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('autofocuses the search input, filters options, and updates the selection', async () => {
    render(<SearchableSelectHarness />);

    await userEvent.click(screen.getByRole('combobox'));

    const searchInput = await screen.findByPlaceholderText('Search models...');
    await waitFor(() => {
      expect(searchInput).toHaveFocus();
    });

    await userEvent.type(searchInput, 'gpt');

    expect(screen.getByText('GPT-5.3 Codex')).toBeInTheDocument();
    expect(screen.queryByText('Claude Sonnet 4')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: 'GPT-5.3 Codex' }));

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('GPT-5.3 Codex');
    });
  });

  it('shows the empty state when the search query has no matches', async () => {
    render(<SearchableSelectHarness />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.type(await screen.findByPlaceholderText('Search models...'), 'no-match');

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });
});
