"use server";

import { auditChatMessage, ensureUserTrustProfile, flagSuspiciousListing } from "@/lib/ai/moderation";
import { createEscrowOrder } from "@/lib/ai/escrow";
import { sanitizeText, stripControlChars } from "@/lib/security/sanitize";
import { validateImageBatch } from "@/lib/security/upload";
import {
  messageSchema,
  productSchema,
  signInSchema,
  signUpSchema,
  uuidSchema,
} from "@/lib/security/validation";
import { createNotification } from "@/lib/services/notification-service";
import { getOrCreateConversation } from "@/lib/services/chat-service";
import { createServerSupabaseClient, createServiceRoleClient, getServerUser } from "@/lib/supabase/server";
import { captureException } from "@/lib/monitoring/logger";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { v4 as uuid } from "uuid";

function actionError(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error) return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return new Error(error.message);
  }
  return new Error(fallback);
}

export async function signUpWithEmail(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: stripControlChars(String(formData.get("full_name") ?? "")),
    country: formData.get("country"),
  });
  if (!parsed.success) throw new Error("Invalid signup details");

  const supabase = await createServerSupabaseClient();
  const { email, password, full_name, country } = parsed.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, country },
      emailRedirectTo: `${appUrl}/auth/login`,
    },
  });
  if (error) throw actionError(error, "Unable to create account");

  if (data.user) {
    const service = createServiceRoleClient();
    if (!service) {
      throw new Error("Server configuration error. Contact support if this persists.");
    }

    const { error: profileError } = await service.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: sanitizeText(full_name, 120),
      country,
      role: "buyer",
    });
    if (profileError) throw actionError(profileError, "Account created but profile setup failed");

    await ensureUserTrustProfile(data.user.id, Boolean(data.user.email_confirmed_at));
  }

  revalidatePath("/");
  return { ok: true as const };
}

export async function signInWithEmail(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) throw new Error("Invalid login details");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) throw actionError(error, "Unable to sign in");
  revalidatePath("/");
  return data;
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  revalidatePath("/");
}

export async function resetPassword(email: string) {
  const parsed = signInSchema.shape.email.safeParse(email);
  if (!parsed.success) throw new Error("Invalid email address");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset`,
  });
  if (error) throw actionError(error, "Unable to send reset email");
  return data;
}

export async function createProduct(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("You must be signed in to list a product.");

  const images = formData.getAll("images") as File[];
  const uploadValidation = validateImageBatch(images);
  if (!uploadValidation.ok) throw new Error(uploadValidation.error);

  const parsed = productSchema.safeParse({
    title: stripControlChars(String(formData.get("title") ?? "")),
    description: stripControlChars(String(formData.get("description") ?? "")),
    price: Number(formData.get("price")),
    currency: formData.get("currency"),
    category: formData.get("category"),
    condition: formData.get("condition"),
    country: formData.get("country"),
    brand: formData.get("brand") ? stripControlChars(String(formData.get("brand"))) : null,
    is_negotiable: formData.get("is_negotiable") === "on",
  });
  if (!parsed.success) throw new Error("Invalid product details");

  const { title, description, price, currency, category, condition, country, brand, is_negotiable } =
    parsed.data;
  const aiAnalysis = formData.get("ai_analysis") as string | null;

  const productId = uuid();
  const { data: productData, error: productError } = await supabase.from("products").insert({
    id: productId,
    title: sanitizeText(title, 200),
    description: sanitizeText(description, 5000),
    price,
    currency,
    category,
    condition,
    country,
    brand: brand ? sanitizeText(brand, 120) : null,
    seller_id: user.id,
    is_negotiable,
    status: "available",
    featured: false,
  }).select().single();
  if (productError) throw productError;

  if (aiAnalysis) {
    try {
      const parsedAnalysis = JSON.parse(aiAnalysis);
      await supabase.from("listing_ai_analysis").insert({
        product_id: productData.id,
        ai_analysis: parsedAnalysis,
        ai_confidence: parsedAnalysis?.confidence ?? null,
        price_estimation: parsedAnalysis?.priceEstimates ?? null,
        quality_score: parsedAnalysis?.qualityScore?.overall ?? null,
        risk_score: parsedAnalysis?.riskScore ?? null,
        generated_metadata: {
          title: parsedAnalysis?.title,
          description: parsedAnalysis?.description,
          highlights: parsedAnalysis?.highlights,
          suggestedSpecifications: parsedAnalysis?.suggestedSpecifications,
          suggestedTags: parsedAnalysis?.suggestedTags,
        },
        image_analysis: {
          productType: parsedAnalysis?.productType,
          primaryColor: parsedAnalysis?.primaryColor,
          secondaryColors: parsedAnalysis?.secondaryColors,
          material: parsedAnalysis?.material,
          style: parsedAnalysis?.style,
        },
        detection_history: {
          duplicateSignals: parsedAnalysis?.duplicateSignals ?? [],
          riskFlags: parsedAnalysis?.riskFlags ?? [],
        },
        listing_improvements: parsedAnalysis?.recommendations ?? [],
      });
    } catch (error) {
      captureException(error, { scope: "createProduct.aiAnalysis" });
    }
  }

  await flagSuspiciousListing({
    userId: user.id,
    productId: productData.id,
    title,
    description,
    price,
  });

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Image upload is not configured.");
  }

  for (const [index, image] of images.entries()) {
    const arrayBuffer = await image.arrayBuffer();
    const file = Buffer.from(arrayBuffer);
    const publicId = `${user.id}/${productId}/${uuid()}`;
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: (() => {
        const form = new FormData();
        form.append("file", new Blob([file]), image.name);
        form.append("upload_preset", uploadPreset);
        form.append("public_id", publicId);
        return form;
      })(),
    });
    const uploadData = await response.json();
    if (!response.ok) throw new Error(uploadData.error?.message || "Cloudinary upload failed");
    await supabase.from("product_images").insert({
      product_id: productData.id,
      image_url: uploadData.secure_url,
      is_primary: index === 0,
    });
  }

  revalidatePath("/browse");
  revalidatePath("/profile");
  return productData;
}

export type SendMessageResult =
  | { status: "empty" }
  | { status: "blocked"; reasons: string[]; warning: string }
  | { status: "error" }
  | { status: "sent" };

export async function sendProtectedMessage(formData: FormData): Promise<SendMessageResult> {
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const parsed = messageSchema.safeParse({
    content: stripControlChars(String(formData.get("content") ?? "")),
    conversation_id: formData.get("conversation_id") || null,
  });
  if (!parsed.success || !parsed.data.content.trim()) return { status: "empty" };

  const { content, conversation_id: conversationId } = parsed.data;

  const protection = await auditChatMessage(content, user?.id ?? null);
  if (protection.isBlocked) {
    revalidatePath("/chat");
    return { status: "blocked", reasons: protection.reasons, warning: protection.warning };
  }

  if (user && conversationId) {
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: sanitizeText(content, 2000),
    });
    if (error) return { status: "error" };

    const service = createServiceRoleClient();
    if (service) {
      const { data: conversation } = await service
        .from("conversations")
        .select("buyer_id, seller_id")
        .eq("id", conversationId)
        .maybeSingle();

      const recipientId = conversation
        ? conversation.buyer_id === user.id
          ? conversation.seller_id
          : conversation.buyer_id
        : null;

      if (recipientId) {
        await createNotification({
          userId: recipientId,
          type: "chat",
          title: "New chat message",
          content: sanitizeText(content, 140),
          link: `/chat?conversation=${conversationId}`,
        });
      }
    }
  }

  revalidatePath("/chat");
  return { status: "sent" };
}

export async function startChatWithSeller(sellerId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");
  if (user.id === sellerId) redirect("/chat");

  const conversationId = await getOrCreateConversation(user.id, sellerId);
  redirect(conversationId ? `/chat?conversation=${conversationId}` : "/chat");
}

export async function recordImageSearch(payload: {
  imageName: string;
  detectedQuery: string;
  features: Record<string, unknown>;
  resultCount: number;
  confidence: number;
}) {
  const service = createServiceRoleClient();
  if (!service) return;

  const user = await getServerUser();
  const { data: inserted } = await service
    .from("image_search_history")
    .insert({
      user_id: user?.id ?? null,
      image_name: payload.imageName,
      detected_query: payload.detectedQuery,
      features: payload.features,
      result_count: payload.resultCount,
      ai_confidence: payload.confidence,
    })
    .select()
    .single();

  if (inserted) {
    await service.from("visual_search_metadata").insert({
      image_search_id: inserted.id,
      user_id: user?.id ?? null,
      product_type: payload.features?.productType ?? null,
      category: payload.features?.category ?? null,
      primary_color: payload.features?.primaryColor ?? null,
      material: payload.features?.material ?? null,
      style: payload.features?.style ?? null,
      keywords: payload.features?.keywords ?? [],
      confidence: payload.confidence,
    });
  }
}

export async function recordVoiceSearch(payload: {
  transcript: string;
  query: string;
  resultCount: number;
  confidence: number;
}) {
  const service = createServiceRoleClient();
  if (!service) return;

  const user = await getServerUser();
  await service.from("voice_search_history").insert({
    user_id: user?.id ?? null,
    transcript: sanitizeText(payload.transcript, 500),
    query: sanitizeText(payload.query, 200),
    result_count: payload.resultCount,
    ai_confidence: payload.confidence,
  });
}

export async function createOrder(productId: string) {
  const parsed = uuidSchema.safeParse(productId);
  if (!parsed.success) throw new Error("Invalid product id");

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Authentication required");

  const { data: product } = await supabase.from("products").select("*").eq("id", parsed.data).single();
  if (!product) throw new Error("Product not found");

  const createdOrder = await createEscrowOrder(parsed.data, user.id);
  if (!createdOrder) {
    throw new Error("Escrow order could not be created");
  }
  return createdOrder;
}

export async function requestProductOrder(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  await createOrder(productId);
  redirect("/orders");
}

export async function messageSellerFromProduct(formData: FormData) {
  const sellerId = String(formData.get("sellerId") ?? "");
  await startChatWithSeller(sellerId);
}
