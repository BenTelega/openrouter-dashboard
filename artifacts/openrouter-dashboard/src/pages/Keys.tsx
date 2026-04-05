import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Key, Plus, Trash2, Copy, Check, AlertCircle, ChevronDown, ChevronUp,
  Eye, EyeOff, RefreshCw, BarChart3, Lock, Loader2, Zap, Activity,
} from "lucide-react";
import { useManagementKey } from "@/lib/store";
import {
  listProvisionedKeys, createProvisionedKey, deleteProvisionedKey, updateProvisionedKey,
  fetchKeyUsageStats,
  type ProvisionedKey, type CreatedKey, type KeyUsageStats,
} from "@/lib/openrouter";

/* ── Утилиты ─────────────────────────────────────────────────────── */
function fmtUsd(v: number) {
  if (v === 0) return "$0.00";
  if (v < 0.0001) return `$${v.toFixed(6)}`;
  if (v < 0.01) return `$${v.toFixed(5)}`;
  return `$${v.toFixed(4)}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function totalSpend(keys: ProvisionedKey[]) {
  return keys.reduce((s, k) => s + k.usage, 0);
}

/* ── Кнопка копирования ──────────────────────────────────────────── */
function CopyButton({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const cls = size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <button onClick={handle} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded flex-shrink-0">
      {copied ? <Check className={`${cls} text-green-500`} /> : <Copy className={cls} />}
    </button>
  );
}

/* ── Баннер нового ключа ─────────────────────────────────────────── */
function NewKeyBanner({ keyData, onClose }: { keyData: CreatedKey; onClose: () => void }) {
  const [show, setShow] = useState(false);
  const fullKey = keyData.key ?? "";
  const masked = fullKey ? fullKey.slice(0, 14) + "•".repeat(18) : "";

  return (
    <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold">
            {fullKey ? "Ключ создан! Сохраните его — показывается только один раз" : "Ключ создан"}
          </span>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground underline flex-shrink-0">
          Закрыть
        </button>
      </div>
      {fullKey ? (
        <div className="flex items-center gap-2 rounded-lg bg-background/70 px-3 py-2 border border-border">
          <code className="flex-1 text-xs font-mono text-foreground break-all select-all">
            {show ? fullKey : masked}
          </code>
          <button onClick={() => setShow(v => !v)} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <CopyButton text={fullKey} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          OpenRouter не вернул значение ключа. Скопируйте его на openrouter.ai.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Название: <span className="font-medium text-foreground">{keyData.name || "(без названия)"}</span>
      </p>
    </div>
  );
}

/* ── Аналитика ключа ─────────────────────────────────────────────── */
function KeyAnalytics({ managementKey, keyHash, usage }: {
  managementKey: string;
  keyHash: string;
  usage: number;
}) {
  const { data: stats, isLoading } = useQuery<KeyUsageStats | null>({
    queryKey: ["key-stats", keyHash],
    queryFn: () => fetchKeyUsageStats(managementKey, keyHash),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Загружаю аналитику...
      </div>
    );
  }

  // API didn't return detailed stats — show what we know from the list
  if (!stats || (stats.total_requests === 0 && stats.models.length === 0)) {
    return (
      <div className="rounded-lg bg-muted/40 p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> Аналитика
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-background/60 p-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Потрачено</p>
            <p className="text-sm font-bold font-mono text-foreground">{fmtUsd(usage)}</p>
          </div>
          <div className="rounded-lg bg-background/60 p-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Детальная статистика</p>
            <p className="text-xs text-muted-foreground">Недоступна через API</p>
          </div>
        </div>
      </div>
    );
  }

  const maxModelCost = Math.max(...stats.models.map(m => m.cost), 0.000001);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5" /> Аналитика использования
      </p>

      {/* Сводка */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Запросов", value: fmtNum(stats.total_requests) },
          { label: "Входящих", value: fmtNum(stats.total_prompt_tokens) },
          { label: "Исходящих", value: fmtNum(stats.total_completion_tokens) },
          { label: "Потрачено", value: fmtUsd(stats.total_cost || usage) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-muted/50 p-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm font-bold font-mono text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* По моделям */}
      {stats.models.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">По моделям:</p>
          {stats.models.sort((a, b) => b.cost - a.cost).map(m => (
            <div key={m.model} className="space-y-1">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-foreground font-mono truncate">{m.model}</span>
                <div className="flex items-center gap-2 flex-shrink-0 text-muted-foreground">
                  <span>{fmtNum(m.total_tokens)} токенов</span>
                  <span className="font-medium text-foreground">{fmtUsd(m.cost)}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max((m.cost / maxModelCost) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Строка ключа ────────────────────────────────────────────────── */
function KeyRow({ k, managementKey, onDeleted }: {
  k: ProvisionedKey;
  managementKey: string;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteProvisionedKey(managementKey, k.hash),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["provisioned-keys"] }); onDeleted(); },
  });

  const toggleMutation = useMutation({
    mutationFn: () => updateProvisionedKey(managementKey, k.hash, { disabled: !k.disabled }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["provisioned-keys"] }),
  });

  const usedPct = k.limit ? Math.min((k.usage / k.limit) * 100, 100) : null;

  return (
    <div className={`rounded-xl border transition-colors ${k.disabled ? "border-border bg-muted/20 opacity-60" : "border-card-border bg-card"}`}>
      {/* Шапка */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-3 sm:p-4 text-left"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${k.disabled ? "bg-muted" : "bg-primary/10"}`}>
          <Key className={`w-4 h-4 ${k.disabled ? "text-muted-foreground" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{k.name || "(без названия)"}</p>
            {k.disabled && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Откл.</span>}
          </div>
          {k.label && <p className="text-xs text-muted-foreground font-mono truncate">{k.label}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-mono font-semibold text-foreground">{fmtUsd(k.usage)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Детали */}
      {expanded && (
        <div className="px-3 sm:px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* Метаинфо */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">Потрачено</p>
              <p className="text-sm font-bold font-mono text-foreground">{fmtUsd(k.usage)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">Лимит</p>
              <p className="text-sm font-bold font-mono text-foreground">{k.limit !== null ? fmtUsd(k.limit) : "∞"}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">Создан</p>
              <p className="text-sm font-bold text-foreground">{fmtDate(k.created_at)}</p>
            </div>
          </div>

          {/* Прогресс-бар */}
          {usedPct !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Использование лимита</span>
                <span>{usedPct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${usedPct > 80 ? "bg-destructive" : usedPct > 60 ? "bg-yellow-500" : "bg-primary"}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Аналитика */}
          <KeyAnalytics managementKey={managementKey} keyHash={k.hash} usage={k.usage} />

          {/* Действия */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
            <button
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className="px-3 py-1.5 rounded-lg border border-input text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {toggleMutation.isPending ? "..." : k.disabled ? "Включить" : "Отключить"}
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 rounded-lg border border-destructive/40 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" /> Удалить
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Удалить ключ?</span>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Удаляю..." : "Да, удалить"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg border border-input text-xs font-medium hover:bg-accent"
                >
                  Отмена
                </button>
              </div>
            )}
            {deleteMutation.error && (
              <span className="text-xs text-destructive">{(deleteMutation.error as Error).message}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Форма создания ──────────────────────────────────────────────── */
function CreateKeyForm({ managementKey, onCreated }: {
  managementKey: string;
  onCreated: (key: CreatedKey) => void;
}) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [limitStr, setLimitStr] = useState("");
  const qc = useQueryClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createProvisionedKey(managementKey, {
        name: name.trim() || "Новый ключ",
        label: label.trim() || undefined,
        limit: limitStr ? parseFloat(limitStr) : null,
      }),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ["provisioned-keys"] });
      onCreated(created);
      setName(""); setLabel(""); setLimitStr("");
    },
  });

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" /> Новый ключ
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Название *</label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && mutation.mutate()}
            placeholder="Мой проект"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Метка (label)</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Для отображения в заголовке"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Лимит USD (пусто = ∞)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={limitStr}
              onChange={e => setLimitStr(e.target.value)}
              placeholder="10.00"
              className="w-full pl-7 pr-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>
      {mutation.error && <p className="text-xs text-destructive">{(mutation.error as Error).message}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {mutation.isPending ? "Создаю..." : "Создать"}
        </button>
      </div>
    </div>
  );
}

/* ── Аналитика общая ─────────────────────────────────────────────── */
function GlobalAnalytics({ keys }: { keys: ProvisionedKey[] }) {
  if (keys.length === 0) return null;
  const spend = totalSpend(keys);
  const active = keys.filter(k => !k.disabled && k.usage > 0).length;
  const sorted = [...keys].filter(k => k.usage > 0).sort((a, b) => b.usage - a.usage);
  const max = sorted[0]?.usage ?? 1;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" /> Сводная аналитика
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-card-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Ключей</p>
          <p className="text-xl font-bold font-mono text-foreground">{keys.length}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Активных</p>
          <p className="text-xl font-bold font-mono text-foreground">{active}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Всего потрачено</p>
          <p className="text-xl font-bold font-mono text-primary">{fmtUsd(spend)}</p>
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="rounded-xl border border-card-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Расходы по ключам</p>
          {sorted.map(k => (
            <div key={k.hash} className="space-y-1">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-foreground font-medium truncate">{k.name || "(без названия)"}</span>
                <span className="font-mono text-muted-foreground flex-shrink-0">{fmtUsd(k.usage)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max((k.usage / max) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Management Key Setup (inline) ──────────────────────────────── */
function MgmtKeySetup({ onSaved }: { onSaved: () => void }) {
  const { managementKey, setManagementKey } = useManagementKey();
  const [input, setInput] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  const handleSave = async () => {
    const v = input.trim();
    if (!v) return;
    setStatus("testing");
    setErrMsg("");
    try {
      await listProvisionedKeys(v);
      setManagementKey(v);
      setStatus("ok");
      setTimeout(() => onSaved(), 300);
    } catch (e) {
      setStatus("err");
      setErrMsg(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Management Key</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Нужен для управления ключами и аналитики.
            Получите на{" "}
            <a href="https://openrouter.ai/settings/management-keys" target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline">
              openrouter.ai/settings/management-keys
            </a>
          </p>
        </div>

        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && void handleSave()}
            placeholder="sk-or-v1-..."
            className="w-full px-4 py-2.5 pr-12 rounded-xl border border-input bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {status === "err" && <p className="text-xs text-destructive text-center">{errMsg}</p>}
        {status === "ok" && <p className="text-xs text-green-500 text-center flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> Ключ подтверждён</p>}

        <button
          onClick={() => void handleSave()}
          disabled={status === "testing" || !input.trim()}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === "testing" ? <><Loader2 className="w-4 h-4 animate-spin" /> Проверяю...</> : "Сохранить и продолжить"}
        </button>

        {managementKey && (
          <p className="text-center text-xs text-muted-foreground">
            Уже сохранён ключ.{" "}
            <button onClick={onSaved} className="text-primary hover:underline">Использовать его</button>
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Главная страница ────────────────────────────────────────────── */
export default function Keys() {
  const { managementKey, setManagementKey } = useManagementKey();
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<CreatedKey | null>(null);
  const [setupMode, setSetupMode] = useState(!managementKey);
  const qc = useQueryClient();

  const { data: keys, isLoading, error, refetch } = useQuery({
    queryKey: ["provisioned-keys", managementKey],
    queryFn: () => listProvisionedKeys(managementKey),
    enabled: !!managementKey && !setupMode,
    staleTime: 30 * 1000,
  });

  if (setupMode) {
    return (
      <div className="flex-1 flex flex-col">
        <MgmtKeySetup onSaved={() => setSetupMode(false)} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">

        {/* Заголовок */}
        <div className="flex items-center justify-between gap-3">
          <div className="hidden sm:block">
            <h1 className="text-2xl font-bold text-foreground">Управление ключами</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Создание, аналитика и удаление API-ключей</p>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              onClick={() => setSetupMode(true)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
              title="Сменить Management Key"
            >
              Сменить ключ
            </button>
            <button
              onClick={() => void refetch()}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              title="Обновить"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreate(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              <span>Создать</span>
            </button>
          </div>
        </div>

        {/* Баннер нового ключа */}
        {newKey && <NewKeyBanner keyData={newKey} onClose={() => setNewKey(null)} />}

        {/* Форма создания */}
        {showCreate && (
          <CreateKeyForm
            managementKey={managementKey}
            onCreated={(k) => { setNewKey(k); setShowCreate(false); }}
          />
        )}

        {/* Ошибка */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Ошибка загрузки</p>
              <p className="text-sm opacity-80 mt-0.5">{(error as Error).message}</p>
              <button onClick={() => setSetupMode(true)} className="text-xs underline mt-1">Изменить ключ</button>
            </div>
          </div>
        )}

        {/* Скелетон */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Список */}
        {keys && keys.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Ключи ({keys.length})
            </p>
            {keys.map(k => (
              <KeyRow
                key={k.hash}
                k={k}
                managementKey={managementKey}
                onDeleted={() => void qc.invalidateQueries({ queryKey: ["provisioned-keys"] })}
              />
            ))}
          </div>
        )}

        {/* Пусто */}
        {keys && keys.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Key className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Нет ключей. Нажмите «Создать», чтобы добавить первый.</p>
          </div>
        )}

        {/* Общая аналитика */}
        {keys && keys.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <GlobalAnalytics keys={keys} />
          </>
        )}
      </div>
    </div>
  );
}
