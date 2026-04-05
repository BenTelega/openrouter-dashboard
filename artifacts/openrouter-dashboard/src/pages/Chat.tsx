import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, Bot, User, AlertCircle, Settings, ChevronDown, Copy, Check } from "lucide-react";
import { useApiKey, useSelectedModel, type ConversationMessage } from "@/lib/store";
import { chatCompletionStream, type ChatMessage } from "@/lib/openrouter";
import { useLocation } from "wouter";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function MessageBubble({ message, isStreaming }: { message: ConversationMessage; isStreaming?: boolean }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      data-testid={`message-${message.id}`}
      className={`group flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser ? "bg-primary" : "bg-muted border border-border"
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-primary-foreground" />
          : <Bot className="w-4 h-4 text-foreground" />
        }
      </div>
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-card-border text-foreground rounded-tl-sm"
        }`}>
          {message.content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-sm align-text-bottom" />
          )}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            data-testid={`button-copy-${message.id}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {message.tokens && (
            <span className="text-xs text-muted-foreground">{message.tokens} tokens</span>
          )}
          {message.model && (
            <span className="text-xs text-muted-foreground font-mono">{message.model.split("/").pop()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { apiKey } = useApiKey();
  const { selectedModel } = useSelectedModel();
  const [, setLocation] = useLocation();

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || !apiKey) return;
    setError(null);

    const userMsg: ConversationMessage = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const assistantId = generateId();
    const assistantMsg: ConversationMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      model: selectedModel,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);
    setStreamingId(assistantId);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const history: ChatMessage[] = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    await chatCompletionStream(
      apiKey,
      selectedModel,
      history,
      (chunk) => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        );
      },
      (usage) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, tokens: usage?.completion_tokens }
              : m
          )
        );
        setIsStreaming(false);
        setStreamingId(null);
      },
      (err) => {
        setError(err.message);
        setMessages(prev => prev.filter(m => m.id !== assistantId));
        setIsStreaming(false);
        setStreamingId(null);
      },
    );
  }, [input, isStreaming, apiKey, selectedModel, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setError(null);
  };

  const modelShortName = selectedModel.split("/").pop() ?? selectedModel;
  const providerName = selectedModel.split("/")[0] ?? "";

  if (!apiKey) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Ready to chat</h2>
          <p className="text-sm text-muted-foreground mb-6">Set up your OpenRouter API key to start chatting with any AI model.</p>
          <button
            data-testid="button-go-settings"
            onClick={() => setLocation("/settings")}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Add API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="h-14 border-b border-border flex items-center px-5 gap-3 flex-shrink-0">
        <button
          data-testid="button-model-picker"
          onClick={() => setLocation("/models")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-muted transition-colors text-sm"
        >
          <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
            {providerName.slice(0, 2)}
          </div>
          <span className="font-medium text-foreground">{modelShortName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {messages.length > 0 && (
          <button
            data-testid="button-clear-chat"
            onClick={clearConversation}
            disabled={isStreaming}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
        {messages.length === 0 && (
          <button
            data-testid="button-open-settings"
            onClick={() => setLocation("/settings")}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 -mt-10">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Start a conversation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Chatting with <span className="font-mono">{selectedModel}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 max-w-sm w-full">
              {[
                "Explain quantum entanglement simply",
                "Write a Python function to parse CSV",
                "What are 3 ways to improve focus?",
                "Draft a professional email template",
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="text-left px-3 py-2.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={streamingId === msg.id && isStreaming}
          />
        ))}

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border px-5 py-4 flex-shrink-0">
        <div className="flex items-end gap-3 bg-card border border-card-border rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30 transition-all">
          <textarea
            ref={textareaRef}
            data-testid="textarea-message"
            value={input}
            onChange={e => { setInput(e.target.value); resizeTextarea(); }}
            onKeyDown={handleKeyDown}
            placeholder="Message... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none leading-relaxed max-h-44 scrollbar-thin"
          />
          <button
            data-testid="button-send"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Powered by <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">OpenRouter</a>
        </p>
      </div>
    </div>
  );
}
