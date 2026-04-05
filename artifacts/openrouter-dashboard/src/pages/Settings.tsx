import { useState } from "react";
import { Eye, EyeOff, Key, CheckCircle, AlertCircle, ExternalLink, Shield } from "lucide-react";
import { useApiKey, useManagementKey } from "@/lib/store";
import { fetchModels, listProvisionedKeys } from "@/lib/openrouter";

/* ── Секция ключа ────────────────────────────────────────────────── */
function KeySection({
  title,
  description,
  placeholder,
  storageKey,
  testId,
  linkHref,
  linkLabel,
  onVerify,
  icon: Icon,
  accent = false,
}: {
  title: string;
  description: string;
  placeholder: string;
  storageKey: { value: string; set: (v: string) => void };
  testId: string;
  linkHref: string;
  linkLabel: string;
  onVerify: (key: string) => Promise<void>;
  icon: React.ElementType;
  accent?: boolean;
}) {
  const [input, setInput] = useState(storageKey.value);
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSave = async () => {
    const trimmed = input.trim();
    storageKey.set(trimmed);
    if (!trimmed) return;
    setStatus("testing");
    setError("");
    try {
      await onVerify(trimmed);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const handleClear = () => {
    setInput("");
    storageKey.set("");
    setStatus("idle");
    setError("");
  };

  return (
    <div className={`rounded-xl border p-4 sm:p-5 space-y-4 ${accent ? "border-primary/20 bg-primary/5" : "border-card-border bg-card"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ? "bg-primary/20" : "bg-primary/10"}`}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <input
            data-testid={testId}
            type={show ? "text" : "password"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && void handleSave()}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 pr-12 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {status === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Ключ успешно проверен
          </div>
        )}
        {status === "error" && (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error || "Не удалось проверить ключ"}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            data-testid={`${testId}-save`}
            onClick={() => void handleSave()}
            disabled={status === "testing" || !input.trim()}
            className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {status === "testing" ? "Проверяю..." : "Сохранить и проверить"}
          </button>
          {storageKey.value && (
            <button
              onClick={handleClear}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-secondary transition-colors"
            >
              Удалить
            </button>
          )}
        </div>
      </div>

      <div className="pt-1 border-t border-border">
        <a
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          {linkLabel}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

/* ── Главный компонент ───────────────────────────────────────────── */
export default function Settings() {
  const { apiKey, setApiKey } = useApiKey();
  const { managementKey, setManagementKey } = useManagementKey();

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Настройки</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ключи для подключения к OpenRouter API</p>
        </div>

        <div className="space-y-4">
          {/* API Key */}
          <KeySection
            title="API-ключ"
            description="Для запросов к моделям и просмотра баланса"
            placeholder="sk-or-v1-..."
            storageKey={{ value: apiKey, set: setApiKey }}
            testId="input-api-key"
            linkHref="https://openrouter.ai/keys"
            linkLabel="Получить на openrouter.ai/keys"
            onVerify={key => fetchModels(key).then(() => undefined)}
            icon={Key}
          />

          {/* Management Key */}
          <KeySection
            title="Management Key"
            description="Для создания ключей и просмотра аналитики (страница «Ключи»)"
            placeholder="sk-or-v1-... (management)"
            storageKey={{ value: managementKey, set: setManagementKey }}
            testId="input-management-key"
            linkHref="https://openrouter.ai/settings/management-keys"
            linkLabel="Получить на openrouter.ai/settings/management-keys"
            onVerify={key => listProvisionedKeys(key).then(() => undefined)}
            icon={Shield}
            accent
          />
        </div>

        {/* О приложении */}
        <div className="mt-4 bg-card border border-card-border rounded-xl p-4 sm:p-5">
          <h2 className="font-semibold text-foreground mb-3">О приложении</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Все ключи хранятся только в localStorage браузера и отправляются напрямую на openrouter.ai — никаких промежуточных серверов.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Эндпоинт</span>
              <p className="font-mono text-xs mt-0.5 text-foreground break-all">openrouter.ai/api/v1</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Хранение ключей</span>
              <p className="text-xs mt-0.5 text-foreground">Browser localStorage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
