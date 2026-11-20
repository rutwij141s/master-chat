import type { Metadata } from "next";
import { Montserrat_Alternates } from "next/font/google";
import "./globals.css";

const montserratAlternates = Montserrat_Alternates({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat-alternates",
});

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
    <html lang="en" className={`dark ${montserratAlternates.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat+Alternates:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var storedTheme = localStorage.getItem('masterchat_theme');
                if (storedTheme) {
                  var root = document.documentElement;
                  root.classList.remove('dark', 'light');
                  if (storedTheme === 'light' || storedTheme === 'rose-quartz') {
                    root.classList.add('light');
                  } else {
                    root.classList.add('dark');
                  }
                  if (storedTheme !== 'dark' && storedTheme !== 'light') {
                    root.classList.add('theme-' + storedTheme);
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`min-h-screen bg-background text-foreground antialiased selection:bg-indigo-500/30 ${montserratAlternates.className}`}>
        {children}
      </body>
    </html>
  );
}
