import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export type ChatConversation = {
  id: string;
  participant: string;
  avatar: string;
  unread: number;
  lastMessage: string;
  updatedAt: string;
  otherUserId: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderRole: "self" | "other";
  text: string;
  time: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type ConversationRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export async function getUserConversations(userId: string): Promise<ChatConversation[]> {
  const supabase = await createServerSupabaseClient();
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id, created_at")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!conversations?.length) return [];

  const rows = conversations as ConversationRow[];
  const otherUserIds = rows.map((conversation) =>
    conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id
  );

  const service = createServiceRoleClient();
  const profileClient = service ?? supabase;
  const { data: profiles } = await profileClient
    .from("profiles")
    .select("id, full_name")
    .in("id", otherUserIds);

  const profileMap = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string }>).map((profile) => [
      profile.id,
      profile.full_name,
    ])
  );

  const enriched = await Promise.all(
    rows.map(async (conversation) => {
      const otherUserId =
        conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;
      const participant = profileMap.get(otherUserId) || "Marketplace user";

      const { data: latestMessage } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unread } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation.id)
        .neq("sender_id", userId);

      return {
        id: conversation.id,
        participant,
        avatar: initials(participant),
        unread: unread ?? 0,
        lastMessage: latestMessage?.content ?? "Start the conversation",
        updatedAt: latestMessage?.created_at ?? conversation.created_at,
        otherUserId,
      } satisfies ChatConversation;
    })
  );

  return enriched.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getConversationMessages(
  conversationId: string,
  currentUserId: string
): Promise<ChatMessage[]> {
  const supabase = await createServerSupabaseClient();
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (messages ?? []).map((message: MessageRow) => ({
    id: message.id,
    senderId: message.sender_id,
    senderRole: message.sender_id === currentUserId ? "self" : "other",
    text: message.content,
    time: formatTime(message.created_at),
  }));
}

export async function getOrCreateConversation(buyerId: string, sellerId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("buyer_id", buyerId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("conversations")
    .insert({ buyer_id: buyerId, seller_id: sellerId })
    .select("id")
    .single();

  return created?.id ?? null;
}
