import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SearchableSelectGroup {
  key: string;
  label?: React.ReactNode;
}

export interface SearchableSelectOption {
  value: string;
  searchText: string;
  itemContent: React.ReactNode;
  triggerContent?: React.ReactNode;
  keywords?: string[];
  groupKey?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  groups?: SearchableSelectGroup[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function SearchableSelect({
  value,
  onChange,
  options,
  groups,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  className,
  triggerClassName,
  contentClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      [option.searchText, ...(option.keywords ?? [])].some((candidate) =>
        normalizeSearch(candidate).includes(normalizedQuery)
      )
    );
  }, [options, query]);

  const groupedOptions = React.useMemo(() => {
    const knownGroups = new Map((groups ?? []).map((group) => [group.key, group]));
    const ungrouped = filteredOptions.filter(
      (option) => !option.groupKey || !knownGroups.has(option.groupKey)
    );
    const grouped = (groups ?? [])
      .map((group) => ({
        ...group,
        options: filteredOptions.filter((option) => option.groupKey === group.key),
      }))
      .filter((group) => group.options.length > 0);

    if (ungrouped.length === 0) return grouped;

    return [{ key: '__default', options: ungrouped }, ...grouped];
  }, [filteredOptions, groups]);

  const selectedContent = selectedOption?.triggerContent ?? selectedOption?.itemContent;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            className,
            triggerClassName,
            !selectedContent && 'text-muted-foreground'
          )}
        >
          <div className="min-w-0 flex-1 text-left">
            {selectedContent ?? <span>{placeholder}</span>}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn('w-[var(--radix-popover-trigger-width)] p-0', contentClassName)}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const focusInput = () => searchInputRef.current?.focus();
          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(focusInput);
            return;
          }
          setTimeout(focusInput, 0);
        }}
      >
        <div className="border-b p-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
            />
          </div>
        </div>

        <ScrollArea className="max-h-72">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            <div role="listbox" aria-label={placeholder} className="p-1">
              {groupedOptions.map((group) => (
                <div key={group.key}>
                  {group.label && (
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {group.label}
                    </div>
                  )}
                  {group.options.map((option) => {
                    const isSelected = option.value === value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={option.disabled}
                        onClick={() => {
                          onChange(option.value);
                          handleOpenChange(false);
                        }}
                        className={cn(
                          'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none',
                          'focus-visible:ring-ring focus-visible:ring-1',
                          isSelected && 'bg-accent text-accent-foreground',
                          option.disabled && 'pointer-events-none opacity-50'
                        )}
                      >
                        <div className="min-w-0 flex-1">{option.itemContent}</div>
                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
