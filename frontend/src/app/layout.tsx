import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MasterChat — Liquid Glass AI",
  description: "Production AI Chat Platform featuring Apple Liquid Glass UI, Multi-Model LLM orchestration, RAG, and LangGraph Agents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  );
}
