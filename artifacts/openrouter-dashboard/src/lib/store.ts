import { useState, useEffect } from "react";

const API_KEY_STORAGE = "openrouter_api_key";
const SELECTED_MODEL_STORAGE = "openrouter_selected_model";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  });

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem(API_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  };

  return { apiKey, setApiKey };
}

export function useSelectedModel() {
  const [selectedModel, setSelectedModelState] = useState<string>(() => {
    return localStorage.getItem(SELECTED_MODEL_STORAGE) || "openai/gpt-4o-mini";
  });

  const setSelectedModel = (model: string) => {
    setSelectedModelState(model);
    localStorage.setItem(SELECTED_MODEL_STORAGE, model);
  };

  return { selectedModel, setSelectedModel };
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokens?: number;
  model?: string;
}

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setThemeState(t => t === "light" ? "dark" : "light");

  return { theme, toggleTheme };
}
