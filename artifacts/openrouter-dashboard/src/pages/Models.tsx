import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Cpu, AlertCircle, ChevronRight, X } from "lucide-react";
import { useApiKey, useSelectedModel } from "@/lib/store";
import { fetchModels, formatPrice, formatContextLength, type OpenRouterModel } from "@/lib/openrouter";
import { useLocation } from "wouter";

export default function Models() {
  const { apiKey } = useApiKey();
  const { selectedModel, setSelectedModel } = useSelectedModel();
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  const { data: models, isLoading, error } = useQuery({
    queryKey: ["models", apiKey],
    queryFn: () => fetchModels(apiKey),
    enabled: !!apiKey,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!models) return [];
    const q = search.toLowerCase();
    if (!q) return models;
    return models.filter(m =>
      m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || (m.description || "").toLowerCase().includes(q)
    );
  }, [models, search]);

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setLocation("/");
  };

  if (!apiKey) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-xs w-full">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Cpu className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Нет API-ключа</h2>
          <p className="text-sm text-muted-foreground mb-4">Добавьте ключ OpenRouter в настройках, чтобы просматривать модели.</p>
          <button
            onClick={() => setLocation("/settings")}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Перейти в настройки
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="h-12 sm:h-14 border-b border-border flex items-center px-4 sm:px-5 gap-3 flex-shrink-0">
        <h1 className="text-sm sm:text-base font-semibold text-foreground">Модели</h1>
        {models && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filtered.length} / {models.length}
          </span>
        )}
        <div className="ml-auto relative flex-1 sm:flex-none sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            data-testid="input-model-search"
            type="search"
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 sm:p-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Не удалось загрузить модели</p>
                <p className="text-sm opacity-80 mt-0.5">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && search && (
          <div className="p-10 text-center text-muted-foreground text-sm">
            По запросу &laquo;{search}&raquo; ничего не найдено
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="p-3 sm:p-4 space-y-1.5">
            {filtered.map(model => (
              <ModelRow
                key={model.id}
                model={model}
                isSelected={model.id === selectedModel}
                onSelect={() => handleSelect(model.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModelRow({
  model,
  isSelected,
  onSelect,
}: {
  model: OpenRouterModel;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const provider = model.id.split("/")[0] ?? "";
  const inputPrice = formatPrice(model.pricing.prompt);
  const outputPrice = formatPrice(model.pricing.completion);

  return (
    <div
      data-testid={`card-model-${model.id}`}
      onClick={onSelect}
      className={`group flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border cursor-pointer transition-all ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-card-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground uppercase">
        {provider.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{model.name}</p>
          {isSelected && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium flex-shrink-0">
              Выбрана
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate hidden sm:block">{model.id}</p>
        <p className="text-xs text-muted-foreground sm:hidden">
          {inputPrice} вх · {outputPrice} вых
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
        <div className="text-right">
          <p className="text-foreground font-medium">{formatContextLength(model.context_length)}</p>
          <p>контекст</p>
        </div>
        <div className="text-right">
          <p className="text-foreground font-medium">{inputPrice}</p>
          <p>входящие</p>
        </div>
        <div className="text-right">
          <p className="text-foreground font-medium">{outputPrice}</p>
          <p>исходящие</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </div>
  );
}
