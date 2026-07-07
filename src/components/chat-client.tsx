"use client";

import { useState } from "react";
import { sendProtectedMessage } from "@/lib/supabase/actions";
import type { ChatConversation, ChatMessage } from "@/lib/services/chat-service";

type Props = {
  conversations: ChatConversation[];
  initialMessages: ChatMessage[];
  initialConversationId: string | null;
  currentUserId: string;
};

export function ChatClient({
  conversations,
  initialMessages,
  initialConversationId,
  currentUserId,
}: Props) {
  const [activeConversationId, setActiveConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState(initialMessages);
  const [notice, setNotice] = useState(
    "Keep conversations on-platform to protect both buyers and sellers."
  );

  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;

  async function handleSubmit(formData: FormData) {
    if (!activeConversationId) {
      setNotice("Select a conversation before sending a message.");
      return;
    }

    formData.set("conversation_id", activeConversationId);
    const result = await sendProtectedMessage(formData);

    if (result.status === "blocked") {
      setNotice(`Blocked: ${result.reasons.join(", ")}. ${result.warning}`);
    } else if (result.status === "error") {
      setNotice("Your message could not be sent. Please try again.");
    } else if (result.status === "empty") {
      setNotice("Write a message before sending.");
    } else {
      const content = String(formData.get("content") ?? "").trim();
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          senderId: currentUserId,
          senderRole: "self",
          text: content,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setNotice("Message sent securely.");
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
      <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm" aria-label="Conversation list">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Conversations</h2>
        <div className="space-y-3">
          {conversations.length > 0 ? (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  setActiveConversationId(conversation.id);
                  window.location.href = `/chat?conversation=${conversation.id}`;
                }}
                aria-current={conversation.id === activeConversationId ? "true" : undefined}
                className={`w-full rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  conversation.id === activeConversationId
                    ? "border-orange-200 bg-orange-50"
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
                      aria-hidden="true"
                    >
                      {conversation.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{conversation.participant}</p>
                      <p className="line-clamp-1 text-sm text-slate-500">{conversation.lastMessage}</p>
                    </div>
                  </div>
                  {conversation.unread > 0 ? (
                    <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-semibold text-white">
                      {conversation.unread}
                    </span>
                  ) : null}
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm text-slate-500">No conversations yet. Message a seller from a product page.</p>
          )}
        </div>
      </aside>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 rounded-[1.25rem] border border-orange-100 bg-orange-50 p-4" role="note">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Safety notice</p>
          <p className="mt-2 text-sm text-slate-700">
            For your safety, keep all payments and communication inside the platform.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Messages with phone numbers, emails, links, or external payment requests are automatically blocked.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-600">Buyer-seller chat</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {activeConversation ? `Conversation with ${activeConversation.participant}` : "Select a conversation"}
            </h1>
          </div>
        </div>

        <div className="mb-6 max-h-[420px] space-y-3 overflow-y-auto rounded-[1.5rem] bg-slate-50 p-4" aria-live="polite">
          {messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  message.senderRole === "self"
                    ? "ml-auto bg-slate-900 text-white"
                    : "bg-white text-slate-700"
                }`}
              >
                <p>{message.text}</p>
                <p
                  className={`mt-1 text-xs ${
                    message.senderRole === "self" ? "text-slate-300" : "text-slate-400"
                  }`}
                >
                  {message.time}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No messages in this conversation yet.</p>
          )}
        </div>

        <form action={handleSubmit} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
          <label className="text-sm font-semibold text-slate-900" htmlFor="content">
            Send a safe message
          </label>
          <textarea
            id="content"
            name="content"
            rows={3}
            required
            aria-describedby="chat-notice"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            placeholder="Ask about the item, shipping, or condition without sharing contact details."
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p id="chat-notice" className="text-xs text-slate-500">
              {notice}
            </p>
            <button
              type="submit"
              disabled={!activeConversationId}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
