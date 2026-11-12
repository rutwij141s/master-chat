import {
  AuthResponse,
  Conversation,
  DocumentItem,
  DocumentListResponse,
  Message,
  Model,
  StreamEvent,
  UsageSummary,
  ImageGenerateRequest,
  ImageGenerateResponse,
  VideoGenerateRequest,
  VideoGenerateResponse,
  TextToSpeechRequest,
  TranscriptionResponse,
} from "./types";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8080";

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("masterchat_access_token");
  }

  public setTokens(access: string, refresh: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("masterchat_access_token", access);
      localStorage.setItem("masterchat_refresh_token", refresh);
    }
  }

  public clearTokens() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("masterchat_access_token");
      localStorage.removeItem("masterchat_refresh_token");
      localStorage.removeItem("masterchat_user");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAccessToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && typeof window !== "undefined" && !endpoint.startsWith("/auth/")) {
      // Attempt token refresh or redirect
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request<T>(endpoint, options);
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errorData.message || `Request failed with status ${res.status}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  public async refreshToken(): Promise<boolean> {
    const refresh = typeof window !== "undefined" ? localStorage.getItem("masterchat_refresh_token") : null;
    if (!refresh) return false;

    try {
      const res = await fetch(`${GATEWAY_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      if (!res.ok) {
        this.clearTokens();
        return false;
      }

      const data = await res.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // --- Auth Endpoints ---
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("masterchat_user", JSON.stringify(data.user));
    }
    return data;
  }

  async register(email: string, password: string, full_name?: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    if (typeof window !== "undefined") {
      localStorage.setItem("masterchat_user", JSON.stringify(data.user));
    }
    return data;
  }

  // --- Models ---
  async getModels(): Promise<Model[]> {
    return this.request<Model[]>("/models");
  }

  // --- Conversations ---
  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>("/conversations");
  }

  async createConversation(title?: string): Promise<Conversation> {
    return this.request<Conversation>("/conversations", {
      method: "POST",
      body: JSON.stringify({ title: title || "New Chat" }),
    });
  }

  async deleteConversation(id: string): Promise<void> {
    await this.request<void>(`/conversations/${id}`, { method: "DELETE" });
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.request<Message[]>(`/conversations/${conversationId}/messages`);
  }

  // --- Documents ---
  async getDocuments(): Promise<DocumentListResponse> {
    return this.request<DocumentListResponse>("/documents");
  }

  async uploadDocument(file?: File, url?: string): Promise<DocumentItem> {
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (url) formData.append("url", url);

    return this.request<DocumentItem>("/documents/upload", {
      method: "POST",
      body: formData,
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request<void>(`/documents/${id}`, { method: "DELETE" });
  }

  // --- Usage ---
  async getUsage(): Promise<UsageSummary> {
    return this.request<UsageSummary>("/usage");
  }

  // --- AI Media Generation (Image & Video) ---
  async generateImage(
    prompt: string,
    size: string = "1024x1024",
    quality: string = "standard",
    style: string = "vivid"
  ): Promise<ImageGenerateResponse> {
    return this.request<ImageGenerateResponse>("/media/image/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, size, quality, style }),
    });
  }

  async generateVideo(
    prompt: string,
    durationSeconds: number = 5,
    aspectRatio: string = "16:9"
  ): Promise<VideoGenerateResponse> {
    return this.request<VideoGenerateResponse>("/media/video/generate", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        duration_seconds: durationSeconds,
        aspect_ratio: aspectRatio,
      }),
    });
  }

  // --- Audio Capabilities (STT Whisper & Neural TTS) ---
  async transcribeAudio(file: Blob | File): Promise<TranscriptionResponse> {
    const formData = new FormData();
    const finalFile = file instanceof File ? file : new File([file], "recording.wav", { type: file.type || "audio/wav" });
    formData.append("file", finalFile);

    return this.request<TranscriptionResponse>("/audio/transcribe", {
      method: "POST",
      body: formData,
    });
  }

  async textToSpeech(
    text: string,
    voice: string = "alloy",
    speed: number = 1.0
  ): Promise<Blob> {
    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${GATEWAY_URL}/audio/speech`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || "Failed to synthesize speech");
    }

    return res.blob();
  }

  // --- Streaming Chat ---
  async streamChat(
    payload: {
      conversation_id?: string;
      message: string;
      model?: string;
      use_rag?: boolean;
      use_web_search?: boolean;
      doc_ids?: string[];
      system_prompt?: string;
    },
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${GATEWAY_URL}/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || "Failed to initiate stream");
    }

    if (!res.body) {
      throw new Error("No response stream body returned");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed: StreamEvent = JSON.parse(jsonStr);
              onEvent(parsed);
            } catch (err) {
              console.warn("Failed to parse SSE event chunk", jsonStr, err);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const api = new ApiClient();
