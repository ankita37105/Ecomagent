import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ecomagent.in"),
  title: {
    default: "Unlimited Claude Access for Claude Code | EcomAgent",
    template: "%s | EcomAgent",
  },
  description:
    "Get plan-based Claude Opus and Sonnet access for Claude Code with a free trial, fast setup docs, and unlimited tokens on paid plans.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ecomagent.in",
    siteName: "EcomAgent",
    title: "Unlimited Claude Access for Claude Code | EcomAgent",
    description:
      "Plan-based Claude access with a free trial, stable endpoint, and unlimited tokens on paid plans.",
    images: [{ url: "/og/ecomagent-og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unlimited Claude Access for Claude Code | EcomAgent",
    description:
      "Free trial plus paid plans for Claude Opus and Sonnet with higher request limits and unlimited tokens.",
    images: ["/og/ecomagent-og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "CRx-3NKhGACRNgGJ6nDEaDVuDv4H9pnKwL_DOV2MR_Q",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  name: "EcomAgent",
                  url: "https://ecomagent.in/",
                  logo: "https://ecomagent.in/og/ecomagent-og.png",
                  sameAs: ["https://t.me/legit_is_back"],
                },
                {
                  "@type": "WebSite",
                  name: "EcomAgent",
                  url: "https://ecomagent.in/",
                },
                {
                  "@type": "Service",
                  name: "Claude API Access for Claude Code",
                  provider: { "@type": "Organization", name: "EcomAgent" },
                  areaServed: "Worldwide",
                  description:
                    "Plan-based Claude Opus and Sonnet API access for coding workflows, with free trial availability and unlimited tokens on paid plans.",
                  url: "https://ecomagent.in/",
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
