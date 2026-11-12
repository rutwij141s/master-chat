"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { InlineMath, BlockMath } from "react-katex";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose dark:prose-invert max-w-none break-words text-sm md:text-base leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeString = String(children).replace(/\n$/, "");

            if (!inline && (match || codeString.includes("\n"))) {
              return (
                <CodeBlock language={language || "text"} value={codeString} />
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono text-sm font-medium text-indigo-600 dark:text-indigo-400"
                {...props}
              >
                {children}
              </code>
            );
          },
          // KaTeX Math Rendering
          math({ value }: any) {
            return <BlockMath math={value} />;
          },
          inlineMath({ value }: any) {
            return <InlineMath math={value} />;
          },
          table({ children }: any) {
            return (
              <div className="overflow-x-auto my-4 rounded-xl border border-black/10 dark:border-white/10">
                <table className="min-w-full divide-y divide-black/10 dark:divide-white/10 text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }: any) {
            return (
              <th className="px-4 py-2.5 text-left font-semibold bg-black/5 dark:bg-white/5">
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return (
              <td className="px-4 py-2 border-t border-black/5 dark:border-white/5">
                {children}
              </td>
            );
          },
          // Custom Image Rendering (Liquid Glass Container)
          img({ src, alt }: any) {
            return (
              <div className="my-3 group relative rounded-2xl overflow-hidden border border-white/20 dark:border-white/10 shadow-lg bg-black/5 dark:bg-white/5">
                <img
                  src={src}
                  alt={alt || "Generated visual"}
                  className="w-full max-h-[500px] object-cover rounded-2xl transition-transform duration-300 hover:scale-[1.01]"
                  loading="lazy"
                />
                {alt && (
                  <div className="px-3 py-1.5 text-xs text-white/90 bg-black/60 backdrop-blur-md flex items-center justify-between">
                    <span className="truncate max-w-[85%]">{alt}</span>
                    <a
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-300 hover:underline text-[11px]"
                    >
                      Full Size ↗
                    </a>
                  </div>
                )}
              </div>
            );
          },
          // Custom Link & Video Embed Rendering
          a({ href, children }: any) {
            if (
              href &&
              (href.endsWith(".mp4") ||
                href.includes("gtv-videos-bucket") ||
                href.includes("sample/"))
            ) {
              return (
                <div className="my-3 rounded-2xl overflow-hidden border border-white/20 dark:border-white/10 shadow-xl bg-black">
                  <video
                    controls
                    className="w-full max-h-[420px] rounded-2xl"
                    preload="metadata"
                  >
                    <source src={href} type="video/mp4" />
                    Your browser does not support video playback.
                  </video>
                  <div className="px-3 py-2 bg-black/70 text-xs text-white/90 flex items-center justify-between">
                    <span>🎬 AI Video Scene Preview</span>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="text-indigo-400 hover:underline font-medium"
                    >
                      Download MP4 ↗
                    </a>
                  </div>
                </div>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-2xl overflow-hidden border border-white/10 bg-[#161822] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-xs text-foreground/60">
        <span className="font-mono uppercase font-semibold text-xs tracking-wider text-indigo-400">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 transition-colors text-xs font-medium"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "0.875rem",
          lineHeight: "1.5",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};
