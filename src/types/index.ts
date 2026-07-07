export type Category =
  | "Women"
  | "Men"
  | "Kids"
  | "Shoes"
  | "Bags"
  | "Electronics"
  | "Home"
  | "Sports";

export type Condition = "New" | "Like New" | "Good" | "Used";

export type Country =
  | "Pakistan"
  | "India"
  | "Bangladesh"
  | "UAE"
  | "Saudi Arabia"
  | "Malaysia"
  | "Indonesia"
  | "Philippines";

export type Currency = "PKR" | "INR" | "BDT" | "AED" | "SAR" | "MYR" | "IDR" | "PHP";

export type ProductRecord = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: Currency;
  category: Category;
  condition: Condition;
  country: Country;
  seller_id?: string;
  status?: string;
  is_negotiable?: boolean;
  product_images?: Array<{ image_url: string; is_primary?: boolean }>;
  profiles?: { full_name?: string; country?: string; avatar_url?: string; created_at?: string };
};
