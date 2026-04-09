import React, { useState } from "react";
import { Text, Box } from "ink";
import TextInput from "ink-text-input";

interface Props {
  onSubmit: (rounds: number) => void;
}

export function RoundsInput({ onSubmit }: Props) {
  const [value, setValue] = useState("3");
  const [error, setError] = useState("");

  const handleSubmit = (val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) {
      setError("Please enter a positive integer");
      return;
    }
    if (n > 50) {
      setError("Maximum 50 rounds");
      return;
    }
    onSubmit(n);
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">How many evaluation rounds per test?</Text>
      <Box marginTop={1}>
        <Text>Rounds: </Text>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      </Box>
      {error && (
        <Text color="red">{error}</Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>More rounds = more reliable results but higher cost</Text>
      </Box>
    </Box>
  );
}
