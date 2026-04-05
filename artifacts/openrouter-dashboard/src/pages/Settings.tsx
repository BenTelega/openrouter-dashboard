import { useState } from "react";
import { Eye, EyeOff, Key, CheckCircle, AlertCircle, ExternalLink, Loader2, ChevronRight } from "lucide-react";
import { useApiKey, useManagementKey } from "@/lib/store";
import { fetchModels, listProvisionedKeys, type ProvisionedKey } from "@/lib/openrouter";
import { useQuery } from "@tanstack/react-query";

/* ── Выбор ключа из списка ───────────────────────────────────────── */
function KeyPicker({ onSelect }: { onSelect: (key: ProvisionedKey) => void }) {
  const { managementKey } = useManagementKey();

  const { data: keys, isLoading, error } = useQuery({
    queryKey: ["provisioned-keys", managementKey],
    queryFn: () => listProvisionedKeys(managementKey),
    enabled: !!managementKey,
    staleTime: 60 * 1000,
  });

  if (!managementKey) {
    return (
      <p className="text-xs text-muted-foreground">
        Настройте Management Key на странице{" "}
        <a href="/keys" className="text-primary hover:underline">«Ключи»</a>, чтобы выбирать ключ из списка.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Загружаю список ключей...
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive">Не удалось загрузить ключи: {(error as Error).message}</p>;
  }

  if (!keys || keys.length === 0) {
    return <p className="text-xs text-muted-foreground">Нет созданных ключей. Создайте их на странице «Ключи».</p>;
  }

  return (
    <div className="space-y-1.5">
      {keys.filter(k => !k.disabled).map(k => (
        <button
          key={k.hash}
          onClick={() => onSelect(k)}
          className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-card-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
        >
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Key className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{k.name || "(без названия)"}</p>
            {k.label && <p className="text-xs text-muted-foreground font-mono truncate">{k.label}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground font-mono">${k.usage.toFixed(4)}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Главный компонент ───────────────────────────────────────────── */
export default function Settings() {
  const { apiKey, setApiKey } = useApiKey();
  const [inputValue, setInputValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPicker, setShowPicker] = useState(false);

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
      setErrorMsg(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const handleClear = () => {
    setInputValue("");
    setApiKey("");
    setStatus("idle");
    setErrorMsg("");
  };

  const handlePickKey = (k: ProvisionedKey) => {
    // We only have the hash — we need the actual key value.
    // Since provisioned keys don't expose the full key after creation,
    // we copy the key_id (partial) as a hint and let user confirm.
    // Best UX: show a note that user should paste the full key.
    setShowPicker(false);
    // We store name as a label hint; user must paste the actual key
    alert(`Выберите ключ "${k.name}" и вставьте его полное значение в поле ввода. Полный ключ был показан только при создании.`);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Настройки</h1>
          <p className="mt-1 text-sm text-muted-foreground">API-ключ для подключения к OpenRouter</p>
        </div>

        {/* API Key section */}
        <div className="rounded-xl border border-card-border bg-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">API-ключ</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Для запросов к моделям и просмотра баланса</p>
            </div>
          </div>

          {/* Ввод вручную */}
          <div className="space-y-3">
            <div className="relative">
              <input
                data-testid="input-api-key"
                type={showKey ? "text" : "password"}
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); setStatus("idle"); }}
                onKeyDown={e => e.key === "Enter" && void handleSave()}
                placeholder="sk-or-v1-..."
                className="w-full px-4 py-2.5 pr-12 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {status === "success" && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> Ключ подтверждён
              </div>
            )}
            {status === "error" && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg || "Не удалось проверить ключ"}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                data-testid="button-save-key"
                onClick={() => void handleSave()}
                disabled={status === "testing" || !inputValue.trim()}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === "testing" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Проверяю...</> : "Сохранить и проверить"}
              </button>
              {apiKey && (
                <button
                  onClick={handleClear}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Удалить
                </button>
              )}
            </div>
          </div>

          {/* Разделитель */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Выбор из списка */}
          <div className="space-y-2">
            <button
              onClick={() => setShowPicker(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground"
            >
              <span>Выбрать из созданных ключей</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${showPicker ? "rotate-90" : ""}`} />
            </button>

            {showPicker && (
              <KeyPicker onSelect={handlePickKey} />
            )}
          </div>

          {/* Ссылка */}
          <div className="pt-1 border-t border-border">
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Получить ключ на openrouter.ai/keys
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* О приложении */}
        <div className="mt-4 bg-card border border-card-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-foreground mb-3">О приложении</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ключ хранится только в localStorage браузера и отправляется напрямую на openrouter.ai — без промежуточных серверов.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Эндпоинт</span>
              <p className="font-mono text-xs mt-0.5 text-foreground break-all">openrouter.ai/api/v1</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Management Key</span>
              <p className="text-xs mt-0.5 text-foreground">
                Настраивается на странице{" "}
                <a href="/keys" className="text-primary hover:underline">«Ключи»</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
