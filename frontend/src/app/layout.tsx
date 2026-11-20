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
  description: "Production AI Chat Platform featuring Apple Liquid Glass UI, Multi-Model LLM orchestration, RAG, and LangGraph Agents. Developed by Rutwij Sudke.",
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`light ${montserratAlternates.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
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
                var validThemes = ['opal-crisp', 'rose-quartz', 'azure-breeze', 'mint-sage', 'sunset-peach', 'lavender-mist', 'arctic-glacier', 'champagne-gold'];
                var storedTheme = localStorage.getItem('masterchat_theme');
                if (!storedTheme || validThemes.indexOf(storedTheme) === -1) {
                  storedTheme = 'opal-crisp';
                  localStorage.setItem('masterchat_theme', 'opal-crisp');
                }
                var root = document.documentElement;
                root.classList.remove('dark');
                root.classList.add('light');
                for (var i = 0; i < validThemes.length; i++) {
                  root.classList.remove('theme-' + validThemes[i]);
                }
                if (storedTheme !== 'opal-crisp') {
                  root.classList.add('theme-' + storedTheme);
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
