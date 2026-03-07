import type { MetadataRoute } from "next";

const blogSlugs = [
  "claude-code-setup-windows-macos-linux",
  "api-key-safety-for-claude-code",
  "choose-claude-plan-solo-vs-team",
  "claude-opus-vs-sonnet-coding",
  "common-claude-code-errors-fixes",
  "long-coding-sessions-claude-workflow",
  "free-claude-code-options",
  "troubleshooting-rate-limits-claude-coding-tools",
  "unlimited-claude-access-guide",
  "reduce-interruptions-in-long-prompt-sessions",
  "signup-to-first-api-call-checklist",
  "connect-claude-code-custom-endpoint",
  "free-api-key-myths-and-real-options",
  "openrouter-vs-plan-based-claude-access",
  "huggingface-vs-direct-claude-endpoints",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ecomagent.in";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...blogRoutes];
}
