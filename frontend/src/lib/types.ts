export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: "admin" | "user" | string;
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
  provider: "openai" | "anthropic" | "multi" | string;
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

// Admin Telemetry & Expense Analytics
export interface ModelUsageMetric {
  model: string;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  cost_percentage?: number;
}

export interface DailyUsageTrend {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface AdminOverview {
  total_cost: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_requests: number;
  total_users: number;
  active_users_30d: number;
  total_documents: number;
  total_conversations: number;
  model_breakdown: ModelUsageMetric[];
  daily_trends: DailyUsageTrend[];
}

export interface UserAnalyticsItem {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  last_active: string | null;
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_estimated_cost: number;
  top_model: string | null;
  total_conversations: number; // Aggregate count only (no chat content access)
  total_documents: number;     // Aggregate count only (no file content access)
}

export interface AdminUsersResponse {
  users: UserAnalyticsItem[];
  total_count: number;
  page: number;
  limit: number;
}

export interface UserDetailAnalytics {
  user: UserAnalyticsItem;
  model_breakdown: ModelUsageMetric[];
  recent_logs: UsageLogItem[];
  privacy_shield: boolean;
  privacy_note?: string;
}

