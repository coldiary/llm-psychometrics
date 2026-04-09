import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import Spinner from "ink-spinner";
import { useApp } from "ink";
import { fetchModels } from "../api/openrouter.js";
import type { ORModel } from "../types.js";

interface Props {
  onSuccess: (models: ORModel[]) => void;
}

export function ApiKeyCheck({ onSuccess }: Props) {
  const { exit } = useApp();
  const [status, setStatus] = useState<"checking" | "loading" | "error">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      setStatus("error");
      setError("OPENROUTER_API_KEY environment variable is not set.");
      setTimeout(() => {
        process.exitCode = 1;
        exit();
      }, 100);
      return;
    }

    setStatus("loading");
    fetchModels(apiKey)
      .then((models) => {
        onSuccess(models);
      })
      .catch((err) => {
        setStatus("error");
        setError(
          `Failed to connect to OpenRouter: ${err instanceof Error ? err.message : String(err)}`,
        );
        setTimeout(() => {
          process.exitCode = 1;
          exit();
        }, 100);
      });
  }, []);

  if (status === "error") {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>Error: {error}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text>
        <Text color="green"><Spinner type="dots" /></Text>
        {" "}
        {status === "checking" ? "Checking API key..." : "Loading models from OpenRouter..."}
      </Text>
    </Box>
  );
}
