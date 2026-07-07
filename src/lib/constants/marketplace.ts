import type { Category, Condition, Country, Currency } from "@/types";

export const categories: Category[] = [
  "Women",
  "Men",
  "Kids",
  "Shoes",
  "Bags",
  "Electronics",
  "Home",
  "Sports",
];

export const conditionOptions: Condition[] = ["New", "Like New", "Good", "Used"];

export const countries: Country[] = [
  "Pakistan",
  "India",
  "Bangladesh",
  "UAE",
  "Saudi Arabia",
  "Malaysia",
  "Indonesia",
  "Philippines",
];

export const currencies: Currency[] = ["PKR", "INR", "BDT", "AED", "SAR", "MYR", "IDR", "PHP"];

export const SITE_NAME = "ThriftAsia";
export const SITE_DESCRIPTION =
  "AI-native second-hand marketplace for buying, selling, and secure escrow trading across Asia.";
