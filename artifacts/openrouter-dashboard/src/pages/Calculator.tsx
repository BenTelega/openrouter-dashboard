import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, X, Calculator, AlertCircle, Info } from "lucide-react";
import { useApiKey, useSelectedModel } from "@/lib/store";
import { fetchModels, formatContextLength, type OpenRouterModel } from "@/lib/openrouter";
import { useLocation } from "wouter";
import { encode } from "gpt-tokenizer";

function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.000001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

function parsePricePerToken(priceStr: string): number {
  const val = parseFloat(priceStr);
  return isNaN(val) ? 0 : val;
}

function ModelSelector({
  models,
  selectedId,
  onSelect,
}: {
  models: OpenRouterModel[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? models.filter(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      : models;
  }, [models, search]);

  const current = models.find(m => m.id === selectedId);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      window.addEventListener("keydown", handleKey);
      window.addEventListener("mousedown", handleClick);
    }
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        data-testid="button-model-selector"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl border border-card-border bg-card hover:border-primary/50 transition-colors text-left"
      >
        {current ? (
          <>
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase flex-shrink-0">
              {current.id.split("/")[0]?.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{current.name}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{current.id}</p>
            </div>
          </>
        ) : (
          <span className="text-sm text-muted-foreground flex-1">Select a model...</span>
        )}
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-40 bg-popover border border-popover-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                data-testid="input-model-search-dropdown"
                autoFocus
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No models found</div>
            ) : (
              filtered.map(m => (
                <button
                  key={m.id}
                  data-testid={`option-model-${m.id}`}
                  onClick={() => { onSelect(m.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors ${m.id === selectedId ? "bg-primary/5" : ""}`}
                >
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase flex-shrink-0">
                    {m.id.split("/")[0]?.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{formatContextLength(m.context_length)} ctx</p>
                  </div>
                  {m.id === selectedId && (
                    <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium flex-shrink-0">Active</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-card-border bg-card"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg sm:text-xl font-bold font-mono ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{sub}</p>}
    </div>
  );
}

export default function CalculatorPage() {
  const { apiKey } = useApiKey();
  const { selectedModel, setSelectedModel } = useSelectedModel();
  const [, setLocation] = useLocation();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [outputTokens, setOutputTokens] = useState(500);

  const { data: models, isLoading, error } = useQuery({
    queryKey: ["models", apiKey],
    queryFn: () => fetchModels(apiKey),
    enabled: !!apiKey,
    staleTime: 5 * 60 * 1000,
  });

  const currentModel = models?.find(m => m.id === selectedModel);

  const systemTokens = useMemo(() => countTokens(systemPrompt), [systemPrompt]);
  const userTokens = useMemo(() => countTokens(userPrompt), [userPrompt]);
  const totalInputTokens = systemTokens + userTokens;

  const inputPricePerToken = currentModel ? parsePricePerToken(currentModel.pricing.prompt) : 0;
  const outputPricePerToken = currentModel ? parsePricePerToken(currentModel.pricing.completion) : 0;

  const inputCost = totalInputTokens * inputPricePerToken;
  const outputCost = outputTokens * outputPricePerToken;
  const totalCost = inputCost + outputCost;

  const contextLength = currentModel?.context_length ?? 0;
  const contextUsagePercent = contextLength > 0 ? Math.min((totalInputTokens / contextLength) * 100, 100) : 0;

  const isFree = inputPricePerToken === 0 && outputPricePerToken === 0;

  if (!apiKey) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-xs w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Token Calculator</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Add your OpenRouter API key to load models and calculate token costs.
          </p>
          <button
            data-testid="button-go-settings"
            onClick={() => setLocation("/settings")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Add API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">

        {/* Header — hidden on mobile to save space */}
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold text-foreground">Token Calculator</h1>
          <p className="text-sm text-muted-foreground mt-1">Select a model, enter your prompt, and see the cost instantly</p>
        </div>

        {/* Model selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Model</label>
          {isLoading && <div className="h-14 rounded-xl bg-muted animate-pulse" />}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Failed to load models: {error.message}</span>
            </div>
          )}
          {models && (
            <ModelSelector models={models} selectedId={selectedModel} onSelect={setSelectedModel} />
          )}
        </div>

        {/* Model info pills */}
        {currentModel && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
              <span className="font-medium text-foreground">Context:</span>
              {formatContextLength(currentModel.context_length)}
            </span>
            <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
              <span className="font-medium text-foreground">Input:</span>
              {isFree ? "Free" : `$${(inputPricePerToken * 1_000_000).toFixed(2)}/M`}
            </span>
            <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
              <span className="font-medium text-foreground">Output:</span>
              {isFree ? "Free" : `$${(outputPricePerToken * 1_000_000).toFixed(2)}/M`}
            </span>
          </div>
        )}

        {/* System prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">System Prompt</label>
            <span className="text-xs text-muted-foreground font-mono">{systemTokens} tokens</span>
          </div>
          <textarea
            data-testid="textarea-system-prompt"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="Optional system prompt..."
            rows={3}
            className="w-full px-3 sm:px-4 py-3 rounded-xl border border-card-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50 transition-all resize-none leading-relaxed scrollbar-thin"
          />
        </div>

        {/* User prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">User Prompt</label>
            <span className="text-xs text-muted-foreground font-mono">{userTokens} tokens</span>
          </div>
          <textarea
            data-testid="textarea-user-prompt"
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={6}
            className="w-full px-3 sm:px-4 py-3 rounded-xl border border-card-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50 transition-all resize-none leading-relaxed scrollbar-thin"
          />
        </div>

        {/* Output tokens */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              Expected Output Tokens
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </label>
            <input
              data-testid="input-output-tokens"
              type="number"
              min={0}
              max={100000}
              value={outputTokens}
              onChange={e => setOutputTokens(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 px-3 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground text-right font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <input
            type="range"
            min={0}
            max={4000}
            step={50}
            value={Math.min(outputTokens, 4000)}
            onChange={e => setOutputTokens(parseInt(e.target.value))}
            data-testid="slider-output-tokens"
            className="w-full accent-primary h-1.5 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground px-0.5">
            <span>0</span>
            <span>1K</span>
            <span>2K</span>
            <span>3K</span>
            <span>4K+</span>
          </div>
        </div>

        {/* ── Cost breakdown ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="h-px bg-border" />
          <h2 className="text-sm font-semibold text-foreground">Cost Breakdown</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard
              label="Input tokens"
              value={totalInputTokens.toLocaleString()}
              sub={systemTokens > 0 ? `${systemTokens}+${userTokens}` : `${userTokens} user`}
            />
            <StatCard
              label="Input cost"
              value={isFree ? "Free" : formatCost(inputCost)}
              sub={isFree ? "No charge" : `${(inputPricePerToken * 1_000_000).toFixed(2)}/M`}
            />
            <StatCard
              label="Output tokens"
              value={outputTokens.toLocaleString()}
              sub="estimated"
            />
            <StatCard
              label="Output cost"
              value={isFree ? "Free" : formatCost(outputCost)}
              sub={isFree ? "No charge" : `${(outputPricePerToken * 1_000_000).toFixed(2)}/M`}
            />
          </div>

          {/* Total */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Total estimated cost</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalInputTokens.toLocaleString()} in + {outputTokens.toLocaleString()} out tokens
              </p>
            </div>
            <p data-testid="text-total-cost" className="text-2xl font-bold font-mono text-primary">
              {isFree ? "Free" : formatCost(totalCost)}
            </p>
          </div>

          {/* Context bar */}
          {currentModel && totalInputTokens > 0 && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <span className="text-muted-foreground">Context usage</span>
                <span className={`font-mono font-medium ${contextUsagePercent > 80 ? "text-destructive" : "text-foreground"}`}>
                  {totalInputTokens.toLocaleString()} / {formatContextLength(contextLength)} ({contextUsagePercent.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${contextUsagePercent > 80 ? "bg-destructive" : contextUsagePercent > 60 ? "bg-yellow-500" : "bg-primary"}`}
                  style={{ width: `${contextUsagePercent}%` }}
                />
              </div>
            </div>
          )}

          {/* N requests */}
          {currentModel && !isFree && (totalInputTokens > 0 || outputTokens > 0) && (
            <div className="rounded-xl border border-card-border bg-card p-4">
              <p className="text-sm font-medium text-foreground mb-3">Cost per N requests</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                {[10, 100, 1000].map(n => (
                  <div key={n} className="rounded-lg bg-muted/60 py-2.5 px-2 sm:px-3">
                    <p className="text-xs text-muted-foreground mb-1">{n.toLocaleString()}×</p>
                    <p className="font-mono font-semibold text-foreground text-sm sm:text-base">{formatCost(totalCost * n)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
