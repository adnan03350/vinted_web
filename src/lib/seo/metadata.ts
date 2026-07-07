import type { Metadata } from "next";
import { getAppUrl } from "@/lib/env";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants/marketplace";

const appUrl = getAppUrl();

export const defaultMetadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${SITE_NAME} | AI-native marketplace`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "marketplace",
    "second-hand",
    "Asia",
    "escrow",
    "AI search",
    "buy and sell",
    "ThriftAsia",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | AI-native marketplace`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | AI-native marketplace`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: appUrl,
  },
};

export function buildProductMetadata(input: {
  title: string;
  description: string;
  id: string;
  price: number;
  currency: string;
  image?: string | null;
}): Metadata {
  const url = `${appUrl}/products/${input.id}`;
  const description = input.description.slice(0, 160);

  return {
    title: input.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description,
      url,
      type: "website",
      images: input.image ? [{ url: input.image, alt: input.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: input.image ? [input.image] : undefined,
    },
  };
}

export function buildPageMetadata(title: string, description: string, path: string): Metadata {
  const url = `${appUrl}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { card: "summary", title, description },
  };
}
