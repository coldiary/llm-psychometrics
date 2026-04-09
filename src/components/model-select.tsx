import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import TextInput from "ink-text-input";
import type { ORModel } from "../types.js";

interface Props {
  models: ORModel[];
  onSubmit: (selected: ORModel[]) => void;
}

const PAGE_SIZE = 15;

export function ModelSelect({ models, onSubmit }: Props) {
  const [filter, setFilter] = useState("");
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isFiltering, setIsFiltering] = useState(true);

  const filtered = filter
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(filter.toLowerCase()) ||
          m.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : models;

  const pageStart = Math.max(
    0,
    Math.min(cursor - Math.floor(PAGE_SIZE / 2), filtered.length - PAGE_SIZE),
  );
  const visible = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useInput((input, key) => {
    if (isFiltering) {
      if (key.return) {
        setIsFiltering(false);
        setCursor(0);
      }
      return;
    }

    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
    } else if (key.downArrow) {
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    } else if (input === " ") {
      const model = filtered[cursor];
      if (model) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(model.id)) {
            next.delete(model.id);
          } else {
            next.add(model.id);
          }
          return next;
        });
      }
    } else if (input === "/" || key.escape) {
      setIsFiltering(true);
    } else if (key.return) {
      if (selected.size > 0) {
        const selectedModels = models.filter((m) => selected.has(m.id));
        onSubmit(selectedModels);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Select models to evaluate</Text>
      <Box marginTop={1}>
        <Text dimColor>Search: </Text>
        {isFiltering ? (
          <TextInput
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setCursor(0);
            }}
            onSubmit={() => {
              setIsFiltering(false);
              setCursor(0);
            }}
          />
        ) : (
          <Text>{filter || "(all)"}</Text>
        )}
      </Box>
      <Text dimColor>
        {filtered.length} models
        {selected.size > 0 ? ` | ${selected.size} selected` : ""}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {visible.map((model) => {
          const index = filtered.indexOf(model);
          const isCursor = !isFiltering && index === cursor;
          const isSelected = selected.has(model.id);
          return (
            <Box key={model.id}>
              <Text
                color={isCursor ? "cyan" : undefined}
                bold={isCursor}
              >
                {isSelected ? "[x]" : "[ ]"}{" "}
                {isCursor ? ">" : " "} {model.name}
              </Text>
              <Text dimColor> ({model.id})</Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          {isFiltering
            ? "Type to filter, Enter to navigate list"
            : "Space: toggle | /: search | Enter: confirm"}
        </Text>
      </Box>
    </Box>
  );
}
