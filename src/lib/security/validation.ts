import { z } from "zod";
import { categories, conditionOptions, countries, currencies } from "@/lib/constants/marketplace";

export const emailSchema = z.string().email().max(320);
export const passwordSchema = z.string().min(8).max(128);
export const uuidSchema = z.string().uuid();

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().min(2).max(120),
  country: z.enum(countries as [Country, ...Country[]]),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const productSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  price: z.number().positive().max(10_000_000),
  currency: z.enum(currencies as [Currency, ...Currency[]]),
  category: z.enum(categories as [Category, ...Category[]]),
  condition: z.enum(conditionOptions as [Condition, ...Condition[]]),
  country: z.enum(countries as [Country, ...Country[]]),
  brand: z.string().max(120).nullable().optional(),
  is_negotiable: z.boolean(),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(2000),
  conversation_id: uuidSchema.optional().nullable(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

type Country = (typeof countries)[number];
type Currency = (typeof currencies)[number];
type Category = (typeof categories)[number];
type Condition = (typeof conditionOptions)[number];

export function parseFormData<T extends z.ZodTypeAny>(schema: T, data: Record<string, unknown>) {
  return schema.safeParse(data);
}
