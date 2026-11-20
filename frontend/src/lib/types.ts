export interface User {
  id: string;
  email: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  chunk_id: string;
  doc_id: string;
  filename: string;
  page?: number;
  text: string;
  score?: number;
  url?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  model?: string;
  tokens?: number;
  sources?: Citation[];
  created_at: string;
  isStreaming?: boolean;
}

export interface ModelCapabilities {
  text?: boolean;
  vision?: boolean;
  web_search?: boolean;
  code_interpreter?: boolean;
  rag?: boolean;
  audio_speech?: boolean;
  audio_transcription?: boolean;
}

export interface Model {
  id: string;
  name: string;
  provider: "openai" | "anthropic";
  description: string;
  context_window: number;
  is_default: boolean;
  capabilities?: ModelCapabilities;
  supported_features?: string[];
}

export interface DocumentItem {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: "pending" | "processing" | "indexed" | "failed";
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
  total: number;
}

export interface UsageLogItem {
  id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  created_at: string;
}

export interface UsageSummary {
  user_id: string;
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_estimated_cost: number;
  logs: UsageLogItem[];
}

export interface StreamEvent {
  type: "token" | "citation" | "title" | "error" | "done";
  token?: string;
  conversation_id?: string;
  message_id?: string;
  title?: string;
  model?: string;
  citations?: Citation[];
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost: number;
  };
}

// Audio Capabilities
export interface TextToSpeechRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
}

