import { useState } from "react";
import { Eye, EyeOff, Key, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useApiKey } from "@/lib/store";
import { fetchModels } from "@/lib/openrouter";

export default function Settings() {
  const { apiKey, setApiKey } = useApiKey();
  const [inputValue, setInputValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = async () => {
    const trimmed = inputValue.trim();
    setApiKey(trimmed);
    if (!trimmed) return;
    setStatus("testing");
    setErrorMsg("");
    try {
      await fetchModels(trimmed);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleClear = () => {
    setInputValue("");
    setApiKey("");
    setStatus("idle");
    setErrorMsg("");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure your OpenRouter API connection</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">API Key</h2>
              <p className="text-xs text-muted-foreground">Your OpenRouter API key for authentication</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                data-testid="input-api-key"
                type={showKey ? "text" : "password"}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                placeholder="sk-or-v1-..."
                className="w-full px-4 py-2.5 pr-12 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
              <button
                data-testid="toggle-show-key"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {status === "success" && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                API key verified successfully
              </div>
            )}
            {status === "error" && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg || "Failed to verify API key"}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                data-testid="button-save-key"
                onClick={handleSave}
                disabled={status === "testing" || !inputValue.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "testing" ? "Verifying..." : "Save & Verify"}
              </button>
              {apiKey && (
                <button
                  data-testid="button-clear-key"
                  onClick={handleClear}
                  className="px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-get-key"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Get your API key at openrouter.ai
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-6 bg-card border border-card-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-3">About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This dashboard connects directly to the OpenRouter API from your browser. Your API key is stored locally in your browser and never sent to any server other than openrouter.ai.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Endpoint</span>
              <p className="font-mono text-xs mt-0.5 text-foreground">openrouter.ai/api/v1</p>
            </div>
            <div>
              <span className="text-muted-foreground">Key storage</span>
              <p className="text-xs mt-0.5 text-foreground">Browser localStorage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
