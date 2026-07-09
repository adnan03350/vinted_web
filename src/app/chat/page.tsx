import { AppShell } from "@/components/app-shell";
import { BackButton } from "@/components/back-button";
import { ChatClient } from "@/components/chat-client";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import {
  getConversationMessages,
  getOrCreateConversation,
  getUserConversations,
} from "@/lib/services/chat-service";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata(
  "Messages",
  "Secure buyer-seller chat with on-platform buyer protection.",
  "/chat"
);

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; seller?: string }>;
}) {
  const user = await requireAuthenticatedUser();
  const params = await searchParams;

  let conversations = await getUserConversations(user.id);
  let activeConversationId = params.conversation ?? conversations[0]?.id ?? null;

  if (params.seller && user.id !== params.seller) {
    activeConversationId = (await getOrCreateConversation(user.id, params.seller)) ?? activeConversationId;
    conversations = await getUserConversations(user.id);
  }

  const messages = activeConversationId
    ? await getConversationMessages(activeConversationId, user.id)
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <AppShell>
        <div id="main-content" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <BackButton />
          <ChatClient
            conversations={conversations}
            initialMessages={messages}
            initialConversationId={activeConversationId}
            currentUserId={user.id}
          />
        </div>
      </AppShell>
    </div>
  );
}
