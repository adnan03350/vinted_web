import { getAppUrl } from "@/lib/env";
import { SITE_NAME } from "@/lib/constants/marketplace";

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: getAppUrl(),
    description: "AI-native second-hand marketplace with escrow buyer protection across Asia.",
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: getAppUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${getAppUrl()}/browse?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildProductJsonLd(input: {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image?: string | null;
  condition?: string;
  sellerName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: input.description,
    image: input.image ? [input.image] : undefined,
    sku: input.id,
    offers: {
      "@type": "Offer",
      price: input.price,
      priceCurrency: input.currency,
      availability: "https://schema.org/InStock",
      url: `${getAppUrl()}/products/${input.id}`,
    },
    itemCondition: input.condition,
    brand: input.sellerName ? { "@type": "Brand", name: input.sellerName } : undefined,
  };
}
