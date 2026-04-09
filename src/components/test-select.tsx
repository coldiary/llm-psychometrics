import React, { useState } from "react";
import { Text, Box, useInput } from "ink";
import type { TestId } from "../types.js";

interface TestOption {
  id: TestId;
  name: string;
}

const tests: TestOption[] = [
  { id: "big-five", name: "Big Five (IPIP-50)" },
  { id: "enneagram", name: "Enneagram (OEPS v1)" },
  { id: "mbti", name: "MBTI (OEJTS 1.2)" },
];

interface Props {
  onSubmit: (selected: TestId[]) => void;
}

export function TestSelect({ onSubmit }: Props) {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<TestId>>(
    new Set(tests.map((t) => t.id)),
  );

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
    } else if (key.downArrow) {
      setCursor((c) => Math.min(tests.length - 1, c + 1));
    } else if (input === " ") {
      const test = tests[cursor];
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(test.id)) {
          next.delete(test.id);
        } else {
          next.add(test.id);
        }
        return next;
      });
    } else if (key.return) {
      if (selected.size > 0) {
        onSubmit([...selected]);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Select tests to run</Text>
      <Box flexDirection="column" marginTop={1}>
        {tests.map((test, i) => {
          const isCursor = i === cursor;
          const isSelected = selected.has(test.id);
          return (
            <Box key={test.id}>
              <Text color={isCursor ? "cyan" : undefined} bold={isCursor}>
                {isSelected ? "[x]" : "[ ]"} {isCursor ? ">" : " "} {test.name}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Space: toggle | Enter: confirm</Text>
      </Box>
    </Box>
  );
}
