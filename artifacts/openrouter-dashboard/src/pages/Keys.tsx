import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Key, Plus, Trash2, Copy, Check, AlertCircle, ChevronDown, ChevronUp,
  Eye, EyeOff, RefreshCw, Shield, TrendingUp, BarChart3, Lock,
} from "lucide-react";
import { useManagementKey } from "@/lib/store";
import {
  listProvisionedKeys, createProvisionedKey, deleteProvisionedKey, updateProvisionedKey,
  type ProvisionedKey, type CreatedKey,
} from "@/lib/openrouter";
import { useLocation } from "wouter";

/* ── Утилиты ─────────────────────────────────────────────────────── */
function fmtUsd(v: number) {
  if (v === 0) return "$0.00";
  if (v < 0.001) return `$${v.toFixed(5)}`;
  return `$${v.toFixed(4)}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}
function totalSpend(keys: ProvisionedKey[]) {
  return keys.reduce((s, k) => s + k.usage, 0);
}

/* ── Компонент: скопировать ──────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="text-muted-foreground hover:text-primary transition-colors p-1 rounded">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── Компонент: карточка нового ключа ────────────────────────────── */
function NewKeyBanner({ keyData, onClose }: { keyData: CreatedKey; onClose: () => void }) {
  const [show, setShow] = useState(false);
  const fullKey = keyData.key ?? "";
  const masked = fullKey ? fullKey.slice(0, 12) + "•".repeat(20) : "(ключ не получен — проверьте консоль)";

  return (
    <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold">
            {fullKey ? "Ключ создан! Сохраните его — он показывается только один раз" : "Ключ создан"}
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs underline flex-shrink-0">
          Закрыть
        </button>
      </div>

      {fullKey ? (
        <div className="flex items-center gap-2 rounded-lg bg-background/70 px-3 py-2 border border-border">
          <code className="flex-1 text-xs font-mono text-foreground break-all select-all">
            {show ? fullKey : masked}
          </code>
          <button onClick={() => setShow(v => !v)} className="text-muted-foreground hover:text-foreground p-1">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <CopyButton text={fullKey} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          OpenRouter не вернул значение ключа в ответе. Скопируйте его в интерфейсе openrouter.ai.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Название: <span className="font-medium text-foreground">{keyData.name || "(без названия)"}</span>
      </p>
    </div>
  );
}

/* ── Компонент: строка ключа ─────────────────────────────────────── */
function KeyRow({
  k,
  managementKey,
  onDeleted,
}: {
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
    <div className={`rounded-xl border transition-colors ${k.disabled ? "border-border bg-muted/30 opacity-60" : "border-card-border bg-card"}`}>
      {/* Шапка */}
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${k.disabled ? "bg-muted" : "bg-primary/10"}`}>
          <Key className={`w-4 h-4 ${k.disabled ? "text-muted-foreground" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{k.name || "(без названия)"}</p>
            {k.disabled && (
              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Отключён</span>
            )}
          </div>
          {k.label && (
            <p className="text-xs text-muted-foreground font-mono truncate">{k.label}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-mono font-semibold text-foreground hidden sm:block">{fmtUsd(k.usage)}</span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Детали */}
      {expanded && (
        <div className="px-3 sm:px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Потрачено</p>
              <p className="text-base font-bold font-mono text-foreground">{fmtUsd(k.usage)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Лимит</p>
              <p className="text-base font-bold font-mono text-foreground">
                {k.limit !== null ? fmtUsd(k.limit) : "∞"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground mb-0.5">Создан</p>
              <p className="text-base font-bold text-foreground">{fmtDate(k.created_at)}</p>
            </div>
          </div>

          {usedPct !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Использование</span>
                <span>{usedPct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usedPct > 80 ? "bg-destructive" : usedPct > 60 ? "bg-yellow-500" : "bg-primary"}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
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
                className="px-3 py-1.5 rounded-lg border border-destructive/30 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Удалить
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Точно удалить?</span>
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

/* ── Форма создания ключа ────────────────────────────────────────── */
function CreateKeyForm({
  managementKey,
  onCreated,
}: {
  managementKey: string;
  onCreated: (key: CreatedKey) => void;
}) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [limitStr, setLimitStr] = useState("");
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

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
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && mutation.mutate()}
            placeholder="Мой проект"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Метка (label)</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Для отображения в заголовке"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="w-full pl-7 pr-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>
      {mutation.error && (
        <p className="text-xs text-destructive">{(mutation.error as Error).message}</p>
      )}
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !name.trim()}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        {mutation.isPending ? "Создаю..." : "Создать ключ"}
      </button>
    </div>
  );
}

/* ── Аналитика по ключам ─────────────────────────────────────────── */
function Analytics({ keys }: { keys: ProvisionedKey[] }) {
  if (keys.length === 0) return null;
  const spend = totalSpend(keys);
  const active = keys.filter(k => !k.disabled && k.usage > 0);
  const sorted = [...keys].sort((a, b) => b.usage - a.usage).slice(0, 8);
  const max = sorted[0]?.usage ?? 1;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" /> Аналитика использования
      </h2>

      {/* Сводка */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-card-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Всего ключей</p>
          <p className="text-xl font-bold font-mono text-foreground">{keys.length}</p>
        </div>
        <div className="rounded-xl border border-card-border bg-card p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Активных</p>
          <p className="text-xl font-bold font-mono text-foreground">{active.length}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Итого потрачено</p>
          <p className="text-xl font-bold font-mono text-primary">{fmtUsd(spend)}</p>
        </div>
      </div>

      {/* Топ ключей по тратам */}
      {sorted.some(k => k.usage > 0) && (
        <div className="rounded-xl border border-card-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Расходы по ключам</p>
          {sorted.filter(k => k.usage > 0).map(k => (
            <div key={k.hash} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium truncate max-w-[60%]">{k.name || "(без названия)"}</span>
                <span className="font-mono text-muted-foreground">{fmtUsd(k.usage)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
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

/* ── Главная страница ────────────────────────────────────────────── */
export default function Keys() {
  const { managementKey } = useManagementKey();
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<CreatedKey | null>(null);
  const qc = useQueryClient();

  const { data: keys, isLoading, error, refetch } = useQuery({
    queryKey: ["provisioned-keys", managementKey],
    queryFn: () => listProvisionedKeys(managementKey),
    enabled: !!managementKey,
    staleTime: 30 * 1000,
  });

  /* ── Нет management key ────────────────────────────────────────── */
  if (!managementKey) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Management Key</h2>
          <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
            Для управления ключами нужен Management Key из раздела Settings → Management Keys на openrouter.ai
          </p>
          <a
            href="https://openrouter.ai/settings/management-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline block mb-6"
          >
            openrouter.ai/settings/management-keys ↗
          </a>
          <button
            onClick={() => setLocation("/settings")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Перейти в настройки
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5">

        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div className="hidden sm:block">
            <h1 className="text-2xl font-bold text-foreground">Управление ключами</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Создание, просмотр и удаление API-ключей</p>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              onClick={() => { void refetch(); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              title="Обновить"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreate(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              <span>Создать</span>
            </button>
          </div>
        </div>

        {/* Новый ключ — баннер */}
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
            </div>
          </div>
        )}

        {/* Загрузка */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Список ключей */}
        {keys && keys.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Ключи ({keys.length})
              </p>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Нажмите на ключ, чтобы раскрыть детали
              </p>
            </div>
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
            <p className="text-sm">Нет созданных ключей. Нажмите «Создать», чтобы добавить первый.</p>
          </div>
        )}

        {/* Аналитика */}
        {keys && keys.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <Analytics keys={keys} />
          </>
        )}
      </div>
    </div>
  );
}
