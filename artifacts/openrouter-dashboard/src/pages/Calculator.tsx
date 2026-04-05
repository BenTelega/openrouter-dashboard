import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, X, Calculator, AlertCircle, Info, RefreshCw } from "lucide-react";
import { useApiKey, useSelectedModel } from "@/lib/store";
import { fetchModels, formatContextLength, type OpenRouterModel } from "@/lib/openrouter";
import { useLocation } from "wouter";
import { encode } from "gpt-tokenizer";

/* ── Токены ──────────────────────────────────────────────────────── */
function countTokens(text: string): number {
  if (!text) return 0;
  try { return encode(text).length; } catch { return Math.ceil(text.length / 4); }
}

/* ── Форматирование цен ──────────────────────────────────────────── */
function formatUsd(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.000001) return `$${cost.toExponential(2)}`;
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

function formatRub(cost: number, rate: number): string {
  const rub = cost * rate;
  if (rub === 0) return "0 ₽";
  if (rub < 0.001) return `${(rub * 1000).toFixed(3)} м₽`;
  if (rub < 0.1) return `${rub.toFixed(4)} ₽`;
  if (rub < 1) return `${rub.toFixed(3)} ₽`;
  if (rub < 100) return `${rub.toFixed(2)} ₽`;
  return `${rub.toFixed(1)} ₽`;
}

function parsePricePerToken(priceStr: string): number {
  const val = parseFloat(priceStr);
  return isNaN(val) ? 0 : val;
}

/* ── Курс валют ──────────────────────────────────────────────────── */
async function fetchUsdRubRate(): Promise<number> {
  // Пробуем несколько источников для надёжности
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json() as { rates: Record<string, number> };
      const rate = data.rates["RUB"];
      if (rate && rate > 0) return rate;
    }
  } catch { /* пробуем следующий */ }
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (res.ok) {
      const data = await res.json() as { rates: Record<string, number> };
      const rate = data.rates["RUB"];
      if (rate && rate > 0) return rate;
    }
  } catch { /* пробуем следующий */ }
  // Фолбек — используем приблизительный курс
  return 90;
}

/* ── Выбор модели ────────────────────────────────────────────────── */
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
    return q ? models.filter(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) : models;
  }, [models, search]);

  const current = models.find(m => m.id === selectedId);

  useEffect(() => { if (!open) setSearch(""); }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) { window.addEventListener("keydown", handleKey); window.addEventListener("mousedown", handleClick); }
    return () => { window.removeEventListener("keydown", handleKey); window.removeEventListener("mousedown", handleClick); };
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
          <span className="text-sm text-muted-foreground flex-1">Выберите модель...</span>
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
                placeholder="Поиск моделей..."
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
              <div className="py-8 text-center text-sm text-muted-foreground">Ничего не найдено</div>
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
                    <p className="text-xs text-muted-foreground font-mono">{formatContextLength(m.context_length)} токенов</p>
                  </div>
                  {m.id === selectedId && (
                    <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium flex-shrink-0">Выбрана</span>
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

/* ── Карточка статистики ─────────────────────────────────────────── */
function StatCard({
  label, usd, rub, sub, highlight,
}: {
  label: string;
  usd: string;
  rub?: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-card-border bg-card"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg sm:text-xl font-bold font-mono ${highlight ? "text-primary" : "text-foreground"}`}>{usd}</p>
      {rub && <p className="text-xs font-mono text-muted-foreground mt-0.5">{rub}</p>}
      {sub && <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{sub}</p>}
    </div>
  );
}

/* ── Главный компонент ───────────────────────────────────────────── */
export default function CalculatorPage() {
  const { apiKey } = useApiKey();
  const { selectedModel, setSelectedModel } = useSelectedModel();
  const [, setLocation] = useLocation();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [outputTokens, setOutputTokens] = useState(500);

  const { data: models, isLoading: modelsLoading, error: modelsError } = useQuery({
    queryKey: ["models", apiKey],
    queryFn: () => fetchModels(apiKey),
    enabled: !!apiKey,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: rubRate,
    isLoading: rateLoading,
    error: rateError,
    refetch: refetchRate,
  } = useQuery({
    queryKey: ["usd-rub-rate"],
    queryFn: fetchUsdRubRate,
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });

  const currentModel = models?.find(m => m.id === selectedModel);
  const rate = rubRate ?? 90;

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
          <h2 className="text-xl font-semibold text-foreground mb-2">Калькулятор токенов</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Добавьте API-ключ OpenRouter, чтобы загрузить модели и рассчитать стоимость.
          </p>
          <button
            data-testid="button-go-settings"
            onClick={() => setLocation("/settings")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Добавить ключ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">

        {/* Заголовок */}
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold text-foreground">Калькулятор токенов</h1>
          <p className="text-sm text-muted-foreground mt-1">Выберите модель, введите промт — стоимость считается мгновенно</p>
        </div>

        {/* Курс валюты */}
        <div className="flex items-center gap-2 text-xs">
          {rateLoading ? (
            <span className="text-muted-foreground">Загружаю курс USD/RUB...</span>
          ) : rateError ? (
            <span className="text-muted-foreground">
              Курс недоступен, используется ~{rate} ₽/$
              <button onClick={() => refetchRate()} className="ml-1 underline hover:text-foreground">обновить</button>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              Курс USD/RUB:
              <span className="font-mono font-medium text-foreground">{rate.toFixed(2)} ₽</span>
              <button
                onClick={() => refetchRate()}
                title="Обновить курс"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {/* Выбор модели */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Модель</label>
          {modelsLoading && <div className="h-14 rounded-xl bg-muted animate-pulse" />}
          {modelsError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Не удалось загрузить модели: {modelsError.message}</span>
            </div>
          )}
          {models && (
            <ModelSelector models={models} selectedId={selectedModel} onSelect={setSelectedModel} />
          )}
        </div>

        {/* Информация о модели */}
        {currentModel && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
              <span className="font-medium text-foreground">Контекст:</span>
              {formatContextLength(currentModel.context_length)}
            </span>
            <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
              <span className="font-medium text-foreground">Вход:</span>
              {isFree ? "Бесплатно" : `$${(inputPricePerToken * 1_000_000).toFixed(2)}/M`}
            </span>
            <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-muted-foreground">
              <span className="font-medium text-foreground">Выход:</span>
              {isFree ? "Бесплатно" : `$${(outputPricePerToken * 1_000_000).toFixed(2)}/M`}
            </span>
          </div>
        )}

        {/* Системный промт */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Системный промт</label>
            <span className="text-xs text-muted-foreground font-mono">{systemTokens} токенов</span>
          </div>
          <textarea
            data-testid="textarea-system-prompt"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="Необязательный системный промт..."
            rows={3}
            className="w-full px-3 sm:px-4 py-3 rounded-xl border border-card-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50 transition-all resize-none leading-relaxed scrollbar-thin"
          />
        </div>

        {/* Пользовательский промт */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Промт</label>
            <span className="text-xs text-muted-foreground font-mono">{userTokens} токенов</span>
          </div>
          <textarea
            data-testid="textarea-user-prompt"
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            placeholder="Введите ваш промт..."
            rows={6}
            className="w-full px-3 sm:px-4 py-3 rounded-xl border border-card-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50 transition-all resize-none leading-relaxed scrollbar-thin"
          />
        </div>

        {/* Ожидаемые токены ответа */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              Ожидаемый ответ (токенов)
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

        {/* ── Разбивка стоимости ──────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="h-px bg-border" />
          <h2 className="text-sm font-semibold text-foreground">Разбивка стоимости</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <StatCard
              label="Входящие токены"
              usd={totalInputTokens.toLocaleString("ru-RU")}
              sub={systemTokens > 0 ? `${systemTokens} сист. + ${userTokens} польз.` : `${userTokens} пользоват.`}
            />
            <StatCard
              label="Стоимость входа"
              usd={isFree ? "Бесплатно" : formatUsd(inputCost)}
              rub={isFree ? undefined : formatRub(inputCost, rate)}
              sub={isFree ? undefined : `${(inputPricePerToken * 1_000_000).toFixed(2)}/M`}
            />
            <StatCard
              label="Токены ответа"
              usd={outputTokens.toLocaleString("ru-RU")}
              sub="оценка"
            />
            <StatCard
              label="Стоимость выхода"
              usd={isFree ? "Бесплатно" : formatUsd(outputCost)}
              rub={isFree ? undefined : formatRub(outputCost, rate)}
              sub={isFree ? undefined : `${(outputPricePerToken * 1_000_000).toFixed(2)}/M`}
            />
          </div>

          {/* Итог */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Итоговая стоимость запроса</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalInputTokens.toLocaleString("ru-RU")} вх + {outputTokens.toLocaleString("ru-RU")} вых токенов
                </p>
              </div>
              <div className="text-right">
                <p data-testid="text-total-cost-usd" className="text-2xl font-bold font-mono text-primary">
                  {isFree ? "Бесплатно" : formatUsd(totalCost)}
                </p>
                {!isFree && (
                  <p data-testid="text-total-cost-rub" className="text-base font-semibold font-mono text-primary/70 mt-0.5">
                    ≈ {formatRub(totalCost, rate)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Использование контекста */}
          {currentModel && totalInputTokens > 0 && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <span className="text-muted-foreground">Использование контекста</span>
                <span className={`font-mono font-medium ${contextUsagePercent > 80 ? "text-destructive" : "text-foreground"}`}>
                  {totalInputTokens.toLocaleString("ru-RU")} / {formatContextLength(contextLength)} ({contextUsagePercent.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    contextUsagePercent > 80 ? "bg-destructive" : contextUsagePercent > 60 ? "bg-yellow-500" : "bg-primary"
                  }`}
                  style={{ width: `${contextUsagePercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Стоимость для N запросов */}
          {currentModel && !isFree && (totalInputTokens > 0 || outputTokens > 0) && (
            <div className="rounded-xl border border-card-border bg-card p-4">
              <p className="text-sm font-medium text-foreground mb-3">Стоимость для N запросов</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[10, 100, 1000].map(n => (
                  <div key={n} className="rounded-lg bg-muted/60 py-3 px-2 sm:px-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{n.toLocaleString("ru-RU")} запр.</p>
                    <p className="font-mono font-semibold text-foreground text-sm">{formatUsd(totalCost * n)}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">{formatRub(totalCost * n, rate)}</p>
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
