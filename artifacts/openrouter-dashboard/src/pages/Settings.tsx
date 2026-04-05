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
      setErrorMsg(err instanceof Error ? err.message : "Неизвестная ошибка");
    }
  };

  const handleClear = () => {
    setInputValue("");
    setApiKey("");
    setStatus("idle");
    setErrorMsg("");
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Настройки</h1>
          <p className="mt-1 text-sm text-muted-foreground">Настройка подключения к OpenRouter API</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">API-ключ</h2>
              <p className="text-xs text-muted-foreground">Ваш ключ OpenRouter для аутентификации</p>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                <span>{errorMsg || "Не удалось проверить ключ"}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                data-testid="button-save-key"
                onClick={handleSave}
                disabled={status === "testing" || !inputValue.trim()}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "testing" ? "Проверяю..." : "Сохранить и проверить"}
              </button>
              {apiKey && (
                <button
                  data-testid="button-clear-key"
                  onClick={handleClear}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Удалить
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
              Получить ключ на openrouter.ai
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 bg-card border border-card-border rounded-xl p-4 sm:p-6">
          <h2 className="font-semibold text-foreground mb-3">О приложении</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Дашборд подключается к OpenRouter API напрямую из браузера. Ваш API-ключ хранится только в localStorage и никуда не отправляется, кроме openrouter.ai.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Эндпоинт</span>
              <p className="font-mono text-xs mt-0.5 text-foreground break-all">openrouter.ai/api/v1</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Хранение ключа</span>
              <p className="text-xs mt-0.5 text-foreground">Browser localStorage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
