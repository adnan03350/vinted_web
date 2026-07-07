import { createServiceRoleClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/services/notification-service";

export const SHIPPING_METHODS = ["Standard", "Express", "Courier pickup", "Local meetup"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const SHIPMENT_STATUSES = [
  "PENDING",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURNED",
] as const;

export type ShippingAddressInput = {
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
};

export async function addShippingAddress(userId: string, address: ShippingAddressInput) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return null;

  if (address.isDefault) {
    await supabase.from("shipping_addresses").update({ is_default: false }).eq("user_id", userId);
  }

  const { data } = await supabase
    .from("shipping_addresses")
    .insert({
      user_id: userId,
      full_name: address.fullName,
      phone: address.phone ?? null,
      line1: address.line1,
      line2: address.line2 ?? null,
      city: address.city ?? null,
      state: address.state ?? null,
      postal_code: address.postalCode ?? null,
      country: address.country ?? null,
      is_default: address.isDefault ?? false,
    })
    .select()
    .single();
  return data ?? null;
}

export async function getShippingAddresses(userId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !userId) return [];
  const { data } = await supabase
    .from("shipping_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createShipment(
  orderId: string,
  options: { addressId?: string | null; carrier?: string | null; shippingMethod?: string | null } = {}
) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("shipments")
    .insert({
      order_id: orderId,
      address_id: options.addressId ?? null,
      carrier: options.carrier ?? null,
      shipping_method: options.shippingMethod ?? null,
      status: "PENDING",
    })
    .select()
    .single();
  return data ?? null;
}

export async function updateTracking(shipmentId: string, tracking: { carrier?: string; trackingNumber: string }) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("shipments")
    .update({
      carrier: tracking.carrier ?? null,
      tracking_number: tracking.trackingNumber,
      status: "SHIPPED",
      shipped_at: now,
      updated_at: now,
    })
    .eq("id", shipmentId)
    .select()
    .single();

  if (data) {
    const { data: order } = await supabase.from("orders").select("buyer_id").eq("id", data.order_id).maybeSingle();
    if (order) {
      await createNotification({
        userId: order.buyer_id,
        type: "shipping",
        title: "Your order has shipped",
        content: `Tracking ${tracking.trackingNumber} via ${tracking.carrier ?? "carrier"}.`,
        link: "/orders",
      });
    }
  }
  return data ?? null;
}

export async function updateDeliveryStatus(shipmentId: string, status: (typeof SHIPMENT_STATUSES)[number]) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const now = new Date().toISOString();
  const patch: Record<string, any> = { status, updated_at: now };
  if (status === "DELIVERED") patch.delivered_at = now;
  const { data } = await supabase.from("shipments").update(patch).eq("id", shipmentId).select().single();
  return data ?? null;
}

export async function getShipmentByOrder(orderId: string) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("shipments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .maybeSingle();
  return data ?? null;
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function generateDeliveryOtp(orderId: string, shipmentId?: string | null) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("delivery_otps").insert({
    order_id: orderId,
    shipment_id: shipmentId ?? null,
    code,
    verified: false,
    expires_at: expiresAt,
  });

  // Deliver the OTP to the buyer privately via notification.
  const { data: order } = await supabase.from("orders").select("buyer_id").eq("id", orderId).maybeSingle();
  if (order) {
    await createNotification({
      userId: order.buyer_id,
      type: "shipping",
      title: "Delivery confirmation code",
      content: `Share this code with the courier on delivery: ${code}`,
      link: "/orders",
      metadata: { orderId },
    });
  }
  return { code, expiresAt };
}

export async function verifyDeliveryOtp(orderId: string, code: string) {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  const { data: otp } = await supabase
    .from("delivery_otps")
    .select("*")
    .eq("order_id", orderId)
    .eq("code", code)
    .eq("verified", false)
    .maybeSingle();

  if (!otp) return false;
  if (otp.expires_at && new Date(otp.expires_at).getTime() < Date.now()) return false;

  await supabase.from("delivery_otps").update({ verified: true }).eq("id", otp.id);
  return true;
}

export async function requestReturn(orderId: string, requestedBy: string, reason: string) {
  const supabase = createServiceRoleClient();
  if (!supabase || !requestedBy) return null;

  const { data } = await supabase
    .from("return_requests")
    .insert({ order_id: orderId, requested_by: requestedBy, reason, status: "REQUESTED" })
    .select()
    .single();

  const { data: order } = await supabase.from("orders").select("seller_id").eq("id", orderId).maybeSingle();
  if (order) {
    await createNotification({
      userId: order.seller_id,
      type: "shipping",
      title: "Return requested",
      content: reason || "A buyer requested a return.",
      link: "/orders",
    });
  }
  return data ?? null;
}

export async function listReturnRequests(limit = 50) {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("return_requests")
    .select("*, orders(product_id, amount, currency)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function updateReturnStatus(
  returnId: string,
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED",
  resolution?: string
) {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("return_requests")
    .update({ status, resolution: resolution ?? null, updated_at: new Date().toISOString() })
    .eq("id", returnId)
    .select()
    .single();

  if (data) {
    await createNotification({
      userId: data.requested_by,
      type: "shipping",
      title: `Return ${status.toLowerCase()}`,
      content: resolution || `Your return request was ${status.toLowerCase()}.`,
      link: "/orders",
    });
  }
  return data ?? null;
}

export async function listShippingIssues(limit = 50) {
  const supabase = createServiceRoleClient();
  if (!supabase) return { returns: [], returned: [] };
  const [{ data: returns }, { data: returned }] = await Promise.all([
    supabase.from("return_requests").select("*").in("status", ["REQUESTED", "APPROVED"]).order("created_at", { ascending: false }).limit(limit),
    supabase.from("shipments").select("*").eq("status", "RETURNED").order("created_at", { ascending: false }).limit(limit),
  ]);
  return { returns: returns ?? [], returned: returned ?? [] };
}
