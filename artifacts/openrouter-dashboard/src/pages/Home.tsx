import { useQuery } from "@tanstack/react-query";
import { useApiKey } from "@/lib/store";
import { fetchKeyInfo, fetchModels } from "@/lib/openrouter";
import { useLocation } from "wouter";
import {
  Wallet, Zap, Calculator, Cpu, AlertCircle,
  RefreshCw, TrendingUp, Shield, Clock, ChevronRight,
} from "lucide-react";

/* ── Курс USD/RUB ────────────────────────────────────────────────── */
async function fetchUsdRubRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json() as { rates: Record<string, number> };
      const rate = data.rates["RUB"];
      if (rate && rate > 0) return rate;
    }
  } catch { /* fallback */ }
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (res.ok) {
      const data = await res.json() as { rates: Record<string, number> };
      const rate = data.rates["RUB"];
      if (rate && rate > 0) return rate;
    }
  } catch { /* fallback */ }
  return 90;
}

/* ── Форматирование ──────────────────────────────────────────────── */
function fmtUsd(v: number) {
  if (v === 0) return "$0.00";
  if (v < 0.001) return `$${v.toFixed(6)}`;
  return `$${v.toFixed(4)}`;
}
function fmtUsd2(v: number) {
  return `$${v.toFixed(2)}`;
}
function fmtRub(v: number, rate: number) {
  const r = v * rate;
  if (r < 0.01) return `${(r * 100).toFixed(2)} коп.`;
  if (r < 100) return `${r.toFixed(2)} ₽`;
  return `${r.toFixed(1)} ₽`;
}

/* ── Карточка ────────────────────────────────────────────────────── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-card-border bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

/* ── Строка метрики ──────────────────────────────────────────────── */
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground font-mono">{value}</span>
    </div>
  );
}

/* ── Кнопка быстрого перехода ────────────────────────────────────── */
function QuickLink({ icon: Icon, label, sub, onClick }: {
  icon: React.ElementType; label: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-4 p-4 rounded-xl border border-card-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </button>
  );
}

/* ── Главный компонент ───────────────────────────────────────────── */
export default function Home() {
  const { apiKey } = useApiKey();
  const [, setLocation] = useLocation();

  const { data: keyInfo, isLoading: keyLoading, error: keyError, refetch } = useQuery({
    queryKey: ["key-info", apiKey],
    queryFn: () => fetchKeyInfo(apiKey),
    enabled: !!apiKey,
    staleTime: 2 * 60 * 1000,
  });

  const { data: models } = useQuery({
    queryKey: ["models", apiKey],
    queryFn: () => fetchModels(apiKey),
    enabled: !!apiKey,
    staleTime: 5 * 60 * 1000,
  });

  const { data: rate = 90, refetch: refetchRate } = useQuery({
    queryKey: ["usd-rub-rate"],
    queryFn: fetchUsdRubRate,
    staleTime: 30 * 60 * 1000,
  });

  /* ── Без ключа ─────────────────────────────────────────────────── */
  if (!apiKey) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-xs w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Добро пожаловать</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Добавьте API-ключ OpenRouter, чтобы увидеть сводку по балансу и использованию.
          </p>
          <button
            onClick={() => setLocation("/settings")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Добавить ключ
          </button>
        </div>
      </div>
    );
  }

  /* ── Ошибка ────────────────────────────────────────────────────── */
  if (keyError) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Не удалось загрузить данные</p>
              <p className="text-sm opacity-80 mt-0.5">{(keyError as Error).message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const usage = keyInfo?.usage ?? 0;
  const limit = keyInfo?.limit ?? null;
  const remaining = limit !== null ? Math.max(0, limit - usage) : null;
  const usedPercent = limit ? Math.min((usage / limit) * 100, 100) : 0;
  const isFree = keyInfo?.is_free_tier ?? false;
  const freeModels = models?.filter(m => parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0).length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-5">

        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div className="hidden sm:block">
            <h1 className="text-2xl font-bold text-foreground">Главная</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Сводка по балансу и использованию</p>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>1 $ = {rate.toFixed(2)} ₽</span>
            <button
              onClick={() => { void refetch(); void refetchRate(); }}
              title="Обновить"
              className="p-1 rounded hover:text-primary transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Загрузка ─────────────────────────────────────────────── */}
        {keyLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {keyInfo && (
          <>
            {/* ── Баланс ───────────────────────────────────────────── */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Баланс</p>
                    <p className="text-sm font-medium text-foreground">
                      {isFree ? "Бесплатный тариф" : "Платный аккаунт"}
                    </p>
                  </div>
                </div>
                {keyInfo.label && (
                  <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-mono truncate max-w-[140px]">
                    {keyInfo.label}
                  </span>
                )}
              </div>

              {/* Деньги */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-background/60 p-3">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Потрачено
                  </p>
                  <p className="text-xl font-bold font-mono text-foreground">{fmtUsd2(usage)}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{fmtRub(usage, rate)}</p>
                </div>

                {remaining !== null ? (
                  <div className="rounded-xl bg-background/60 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Остаток</p>
                    <p className="text-xl font-bold font-mono text-green-500">{fmtUsd2(remaining)}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{fmtRub(remaining, rate)}</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-background/60 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Лимит</p>
                    <p className="text-xl font-bold font-mono text-foreground">∞</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Без ограничений</p>
                  </div>
                )}

                {limit !== null && (
                  <div className="rounded-xl bg-background/60 p-3 col-span-2 sm:col-span-1">
                    <p className="text-xs text-muted-foreground mb-1">Лимит</p>
                    <p className="text-xl font-bold font-mono text-foreground">{fmtUsd2(limit)}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{fmtRub(limit, rate)}</p>
                  </div>
                )}
              </div>

              {/* Прогресс-бар (только если есть лимит) */}
              {limit !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Использовано {usedPercent.toFixed(1)}%</span>
                    <span>{fmtUsd2(usage)} / {fmtUsd2(limit)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-background/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        usedPercent > 80 ? "bg-destructive" : usedPercent > 60 ? "bg-yellow-500" : "bg-primary"
                      }`}
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Информация о ключе ────────────────────────────────── */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Параметры ключа</p>
              </div>
              <MetaRow label="Тариф" value={isFree ? "Бесплатный" : "Платный"} />
              <MetaRow label="Использовано" value={`${fmtUsd(usage)} / ${limit !== null ? fmtUsd2(limit) : "∞"}`} />
              {models && <MetaRow label="Доступно моделей" value={`${models.length.toLocaleString("ru-RU")}`} />}
              {models && freeModels > 0 && (
                <MetaRow label="в т.ч. бесплатных" value={`${freeModels.toLocaleString("ru-RU")}`} />
              )}
            </Card>

            {/* ── Лимит запросов ───────────────────────────────────── */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Лимит запросов</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 rounded-xl bg-muted/60 p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-foreground">
                    {keyInfo.rate_limit.requests.toLocaleString("ru-RU")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">запросов</p>
                </div>
                <div className="text-muted-foreground text-sm font-medium">за</div>
                <div className="flex-1 rounded-xl bg-muted/60 p-4 text-center">
                  <p className="text-2xl font-bold font-mono text-foreground">{keyInfo.rate_limit.interval}</p>
                  <p className="text-xs text-muted-foreground mt-1">интервал</p>
                </div>
              </div>
            </Card>

            {/* ── Быстрые переходы ─────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Быстрый переход</p>
              <div className="space-y-2">
                <QuickLink
                  icon={Calculator}
                  label="Калькулятор токенов"
                  sub="Рассчитайте стоимость промта"
                  onClick={() => setLocation("/calculator")}
                />
                <QuickLink
                  icon={Cpu}
                  label="Модели"
                  sub={models ? `${models.length} доступных моделей` : "Обзор доступных моделей"}
                  onClick={() => setLocation("/models")}
                />
              </div>
            </div>

            {/* ── Подпись ──────────────────────────────────────────── */}
            <p className="text-xs text-center text-muted-foreground pb-2">
              Данные получены с openrouter.ai/api/v1/auth/key
            </p>
          </>
        )}
      </div>
    </div>
  );
}
