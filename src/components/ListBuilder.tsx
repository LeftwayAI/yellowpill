"use client";

import { useState, useEffect } from "react";

interface ListField {
  key: string;
  placeholder: string;
  width?: string;
}

interface ListItem {
  id: string;
  [key: string]: string;
}

interface ListBuilderProps {
  fields: ListField[];
  addButtonText?: string;
  minItems?: number;
  maxItems?: number;
  value: ListItem[];
  onChange: (items: ListItem[]) => void;
}

export function ListBuilder({
  fields,
  addButtonText = "+ Add another",
  minItems = 0,
  maxItems = 10,
  value,
  onChange,
}: ListBuilderProps) {
  const [items, setItems] = useState<ListItem[]>(value);

  // Sync with parent
  useEffect(() => {
    setItems(value);
  }, [value]);

  // Initialize with one empty item if empty
  useEffect(() => {
    if (items.length === 0 && minItems > 0) {
      const emptyItem = createEmptyItem();
      setItems([emptyItem]);
      onChange([emptyItem]);
    }
  }, []);

  const createEmptyItem = (): ListItem => {
    const item: ListItem = { id: crypto.randomUUID() };
    fields.forEach((field) => {
      item[field.key] = "";
    });
    return item;
  };

  const addItem = () => {
    if (items.length >= maxItems) return;
    const newItems = [...items, createEmptyItem()];
    setItems(newItems);
    onChange(newItems);
  };

  const removeItem = (id: string) => {
    if (items.length <= minItems) return;
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    onChange(newItems);
  };

  const updateItem = (id: string, key: string, value: string) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, [key]: value } : item
    );
    setItems(newItems);
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="flex items-center gap-2 animate-fade-in"
        >
          <div className="flex-1 flex gap-2">
            {fields.map((field) => (
              <input
                key={field.key}
                type="text"
                value={item[field.key] || ""}
                onChange={(e) => updateItem(item.id, field.key, e.target.value)}
                placeholder={field.placeholder}
                className="flex-1"
                style={{ 
                  flex: field.width ? `0 0 ${field.width}` : 1,
                  minWidth: 0 
                }}
              />
            ))}
          </div>
          
          {/* Remove button (only if above minItems) */}
          {items.length > minItems && (
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-2 text-[var(--foreground-subtle)] hover:text-red-400 transition-colors"
              title="Remove"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {/* Add button */}
      {items.length < maxItems && (
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-[#FCC800] hover:text-[#FFD633] transition-colors"
        >
          {addButtonText}
        </button>
      )}
    </div>
  );
}

