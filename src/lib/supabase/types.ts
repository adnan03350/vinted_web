export type Profile = {
  id: string;
  email: string;
  full_name: string;
  country: string | null;
  role: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  is_suspended: boolean | null;
};

export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  condition: string;
  country: string;
  brand: string | null;
  seller_id: string;
  is_negotiable: boolean;
  status: string;
  featured: boolean;
  created_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  created_at: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type Order = {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export type ListingAiAnalysis = {
  id: string;
  product_id: string | null;
  ai_analysis: Record<string, any> | null;
  ai_confidence: number | null;
  price_estimation: Record<string, any> | null;
  quality_score: number | null;
  risk_score: number | null;
  generated_metadata: Record<string, any> | null;
  image_analysis: Record<string, any> | null;
  detection_history: Record<string, any> | null;
  listing_improvements: string[] | null;
  created_at: string;
};

export type SearchHistory = {
  id: string;
  user_id: string | null;
  query: string;
  ai_confidence: number | null;
  latency_ms: number | null;
  created_at: string;
};

export type SavedSearch = {
  id: string;
  user_id: string;
  query: string;
  filters: Record<string, any> | null;
  created_at: string;
};

export type SearchAnalytics = {
  id: string;
  query: string;
  result_count: number | null;
  zero_result: boolean | null;
  conversion_count: number | null;
  click_count: number | null;
  ai_confidence: number | null;
  latency_ms: number | null;
  created_at: string;
};

export type PopularSearch = {
  id: string;
  query: string;
  count: number | null;
  created_at: string;
};

export type AiSearchMetadata = {
  id: string;
  query: string;
  intent: string | null;
  filters: Record<string, any> | null;
  suggestions: string[] | null;
  created_at: string;
};

export type UserTrustScore = {
  user_id: string;
  trust_score: number | null;
  risk_score: number | null;
  verified_email: boolean | null;
  completed_orders: number | null;
  seller_rating: number | null;
  response_time_hours: number | null;
  dispute_rate: number | null;
  cancellation_rate: number | null;
  listing_quality_score: number | null;
  last_updated: string;
};

export type UserRiskEvent = {
  id: string;
  user_id: string | null;
  event_type: string;
  score: number | null;
  details: Record<string, any> | null;
  created_at: string;
};

export type BlockedChatAttempt = {
  id: string;
  user_id: string | null;
  content: string | null;
  matched_terms: string[] | null;
  created_at: string;
};

export type ModerationEvent = {
  id: string;
  user_id: string | null;
  event_type: string;
  reason: string | null;
  severity: number | null;
  details: Record<string, any> | null;
  created_at: string;
};

export type SuspiciousListingFlag = {
  id: string;
  user_id: string | null;
  product_id: string | null;
  reason: string | null;
  risk_score: number | null;
  created_at: string;
};
