import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://inhand.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date("2026-10-12");
  return [
    { url: siteUrl, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
