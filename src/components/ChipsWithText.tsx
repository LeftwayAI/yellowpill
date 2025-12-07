"use client";

import { useState, useEffect } from "react";

interface ChipsWithTextProps {
  chips: string[];
  placeholder?: string;
  value: string[];
  customValue: string;
  onChange: (selected: string[], custom: string) => void;
  maxChips?: number;
}

export function ChipsWithText({
  chips,
  placeholder = "Anything else?",
  value,
  customValue,
  onChange,
  maxChips = 8,
}: ChipsWithTextProps) {
  const [selected, setSelected] = useState<string[]>(value);
  const [custom, setCustom] = useState(customValue);

  // Sync with parent
  useEffect(() => {
    setSelected(value);
    setCustom(customValue);
  }, [value, customValue]);

  const toggleChip = (chip: string) => {
    let newSelected: string[];
    if (selected.includes(chip)) {
      newSelected = selected.filter((c) => c !== chip);
    } else {
      if (selected.length >= maxChips) return;
      newSelected = [...selected, chip];
    }
    setSelected(newSelected);
    onChange(newSelected, custom);
  };

  const handleCustomChange = (text: string) => {
    setCustom(text);
    onChange(selected, text);
  };

  return (
    <div className="space-y-4">
      {/* Chips grid */}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isSelected = selected.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggleChip(chip)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? "bg-[#FCC800] text-black"
                  : "bg-[#1a1a1a] text-[var(--foreground-muted)] border border-[#333] hover:border-[#444] hover:text-white"
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      <input
        type="text"
        value={custom}
        onChange={(e) => handleCustomChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />

      {/* Selection count */}
      {selected.length > 0 && (
        <p className="text-xs text-[var(--foreground-subtle)]">
          {selected.length} selected{maxChips && ` (max ${maxChips})`}
        </p>
      )}
    </div>
  );
}

