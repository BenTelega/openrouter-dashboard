export interface KeyInfo {
  label: string;
  usage: number;
  limit: number | null;
  is_free_tier: boolean;
  rate_limit: {
    requests: number;
    interval: string;
  };
}

export async function fetchKeyInfo(apiKey: string): Promise<KeyInfo> {
  const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json() as { data: KeyInfo };
  return data.data;
}

/* ── Management API ─────────────────────────────────────────────── */

export interface ProvisionedKey {
  hash: string;
  name: string;
  label: string;
  key_id: string;          // partial key shown in UI
  usage: number;           // USD spent
  limit: number | null;
  disabled: boolean;
  created_at: string;
  updated_at: string;
  rate_limit?: {
    requests: number;
    interval: string;
  };
}

export interface CreateKeyRequest {
  name: string;
  label?: string;
  limit?: number | null;    // USD credit limit; null = unlimited
}

export interface CreatedKey extends ProvisionedKey {
  key: string;              // full key — shown only once on creation
}

function mgmtHeaders(managementKey: string) {
  return {
    Authorization: `Bearer ${managementKey}`,
    "Content-Type": "application/json",
  };
}

async function mgmtThrow(res: Response) {
  const err = await res.json().catch(() => ({}));
  throw new Error(
    (err as { error?: { message?: string } | string }).error
      ? typeof (err as { error: unknown }).error === "string"
        ? (err as { error: string }).error
        : ((err as { error: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
      : `HTTP ${res.status}`,
  );
}

export async function listProvisionedKeys(managementKey: string): Promise<ProvisionedKey[]> {
  const res = await fetch("https://openrouter.ai/api/v1/keys", {
    headers: mgmtHeaders(managementKey),
  });
  if (!res.ok) await mgmtThrow(res);
  const data = await res.json() as { data: ProvisionedKey[] };
  return data.data ?? [];
}

export async function createProvisionedKey(
  managementKey: string,
  req: CreateKeyRequest,
): Promise<CreatedKey> {
  const res = await fetch("https://openrouter.ai/api/v1/keys", {
    method: "POST",
    headers: mgmtHeaders(managementKey),
    body: JSON.stringify(req),
  });
  if (!res.ok) await mgmtThrow(res);
  const data = await res.json() as { data: CreatedKey } | CreatedKey;
  return ("data" in data ? data.data : data) as CreatedKey;
}

export async function deleteProvisionedKey(
  managementKey: string,
  keyHash: string,
): Promise<void> {
  const res = await fetch(`https://openrouter.ai/api/v1/keys/${keyHash}`, {
    method: "DELETE",
    headers: mgmtHeaders(managementKey),
  });
  if (!res.ok) await mgmtThrow(res);
}

export async function updateProvisionedKey(
  managementKey: string,
  keyHash: string,
  updates: Partial<Pick<ProvisionedKey, "name" | "label" | "limit" | "disabled">>,
): Promise<ProvisionedKey> {
  const res = await fetch(`https://openrouter.ai/api/v1/keys/${keyHash}`, {
    method: "PATCH",
    headers: mgmtHeaders(managementKey),
    body: JSON.stringify(updates),
  });
  if (!res.ok) await mgmtThrow(res);
  const data = await res.json() as { data: ProvisionedKey } | ProvisionedKey;
  return ("data" in data ? data.data : data) as ProvisionedKey;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    modality: string;
    tokenizer: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export async function fetchModels(apiKey: string): Promise<OpenRouterModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json() as { data: OpenRouterModel[] };
  return data.data;
}

export async function chatCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  stream: boolean = false,
): Promise<ChatCompletionResponse> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "OpenRouter Dashboard",
    },
    body: JSON.stringify({ model, messages, stream }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<ChatCompletionResponse>;
}

export async function chatCompletionStream(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: (usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void,
  onError: (err: Error) => void,
): Promise<void> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "OpenRouter Dashboard",
      },
      body: JSON.stringify({ model, messages, stream: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No readable stream");
    const decoder = new TextDecoder();
    let buffer = "";
    let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") {
          onDone(usage);
          return;
        }
        try {
          const parsed = JSON.parse(raw) as {
            choices?: { delta?: { content?: string } }[];
            usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
          };
          if (parsed.usage) usage = parsed.usage;
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {
          // ignore malformed chunks
        }
      }
    }
    onDone(usage);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num)) return "N/A";
  if (num === 0) return "Free";
  const perMillion = num * 1_000_000;
  if (perMillion < 0.01) return `$${(perMillion * 1000).toFixed(3)}/B`;
  return `$${perMillion.toFixed(2)}/M`;
}

export function formatContextLength(len: number): string {
  if (len >= 1_000_000) return `${(len / 1_000_000).toFixed(1)}M`;
  if (len >= 1_000) return `${(len / 1_000).toFixed(0)}K`;
  return String(len);
}
