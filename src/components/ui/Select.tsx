import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  group?: string; // Optional grouping e.g. region names
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  disabled = false,
  className,
  ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(opt => opt.value === value);

  // Group options if groups are present
  const groupedOptions = useMemo(() => {
    const groups: Record<string, SelectOption[]> = {};
    const ungrouped: SelectOption[] = [];

    options.forEach(opt => {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        ungrouped.push(opt);
      }
    });

    return { groups, ungrouped };
  }, [options]);

  // Flattened array for keyboard index mapping
  const flatOptions = useMemo(() => {
    const flat: SelectOption[] = [...groupedOptions.ungrouped];
    Object.values(groupedOptions.groups).forEach(grpOpts => {
      flat.push(...grpOpts);
    });
    return flat;
  }, [groupedOptions]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Set focus index to current selection
      const currentIdx = flatOptions.findIndex(opt => opt.value === value);
      setFocusedIndex(currentIdx >= 0 ? currentIdx : 0);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const currentIdx = flatOptions.findIndex(opt => opt.value === value);
        setFocusedIndex(currentIdx >= 0 ? currentIdx : 0);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (focusedIndex >= 0 && focusedIndex < flatOptions.length) {
          handleSelect(flatOptions[focusedIndex].value);
        }
      }
    }

    if (!isOpen) return;

    if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % flatOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 + flatOptions.length) % flatOptions.length);
    }
  };

  return (
    <div 
      className={cn("relative w-full", className)}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {/* Selector Button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          isOpen && "ring-2 ring-primary ring-offset-2 border-primary/50"
        )}
      >
        <span className={cn(selectedOption ? "text-foreground font-medium" : "text-muted-foreground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Options List */}
      {isOpen && (
        <div 
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none custom-scrollbar animate-fade-in"
        >
          {/* Ungrouped Options */}
          {groupedOptions.ungrouped.map((opt) => {
            const flatIdx = flatOptions.findIndex(f => f.value === opt.value);
            const isSelected = value === opt.value;
            const isFocused = focusedIndex === flatIdx;
            
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-4 text-sm outline-none transition-colors",
                  isFocused ? "bg-primary text-primary-foreground font-medium" : "text-foreground hover:bg-accent/40",
                  isSelected && !isFocused && "text-primary bg-primary/5 font-semibold"
                )}
              >
                {isSelected && (
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </span>
                )}
                <span>{opt.label}</span>
              </div>
            );
          })}

          {/* Grouped Options */}
          {Object.entries(groupedOptions.groups).map(([groupName, groupOpts]) => (
            <div key={groupName} className="mt-1 border-t border-border/30 first:border-none">
              <div className="px-3 py-1.5 text-xxs font-bold uppercase tracking-wider text-primary/60">
                {groupName}
              </div>
              {groupOpts.map((opt) => {
                const flatIdx = flatOptions.findIndex(f => f.value === opt.value);
                const isSelected = value === opt.value;
                const isFocused = focusedIndex === flatIdx;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-4 text-sm outline-none transition-colors",
                      isFocused ? "bg-primary text-primary-foreground font-medium" : "text-foreground hover:bg-accent/40",
                      isSelected && !isFocused && "text-primary bg-primary/5 font-semibold"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <span>{opt.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
          
          {options.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};
import { useMemo } from 'react';
