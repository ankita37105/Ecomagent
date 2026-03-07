import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import DocsContent from "@/components/docs-content";

export const metadata: Metadata = {
  title: "Documentation - API Reference & Examples",
  description:
    "Complete API documentation for EcomAgent: endpoint reference, cURL/Python examples, streaming usage, and Claude Code configuration.",
};

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="mb-12">
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">Documentation</span>
            <h1 className="text-3xl sm:text-4xl font-bold mt-3 mb-4">API Documentation</h1>
            <p className="text-muted-foreground">
              Full endpoint examples, SDK snippets, streaming responses, and Claude Code setup.
            </p>
          </div>
          <DocsContent />
        </div>
      </main>
      <Footer />
    </>
  );
}
