'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Only allow same-origin paths and http(s)/mailto - blocks javascript: and data:.
 */
function normalizeAssistantHref(href) {
  if (href == null || typeof href !== 'string') return null;
  const t = href.trim();
  if (!t) return null;
  if (t.startsWith('/') && !t.startsWith('//')) return { kind: 'internal', href: t };
  if (/^https?:\/\//i.test(t)) return { kind: 'external', href: t };
  if (t.toLowerCase().startsWith('mailto:')) return { kind: 'external', href: t };
  return null;
}

/**
 * Renders assistant markdown (bold, lists, links). Do not use for untrusted user HTML;
 * user bubbles stay plain text in the parent.
 */
export default function AssistantMessageMarkdown({ children }) {
  const text = typeof children === 'string' ? children : '';
  if (!text.trim()) return null;

  return (
    <div className="assistant-md min-w-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children: c }) {
            const n = normalizeAssistantHref(href);
            if (!n) return <span className="text-neutral-700">{c}</span>;
            const className =
              'font-semibold text-brand-primary underline underline-offset-2 hover:no-underline';
            if (n.kind === 'internal') {
              return (
                <Link href={n.href} className={className}>
                  {c}
                </Link>
              );
            }
            return (
              <a href={n.href} target="_blank" rel="noopener noreferrer" className={className}>
                {c}
              </a>
            );
          },
          p({ children: c }) {
            return <p className="mb-2 text-[13px] leading-relaxed last:mb-0">{c}</p>;
          },
          ul({ children: c }) {
            return (
              <ul className="mb-2 ml-4 list-disc space-y-1.5 text-[13px] marker:text-neutral-400 last:mb-0">
                {c}
              </ul>
            );
          },
          ol({ children: c }) {
            return (
              <ol className="mb-2 ml-4 list-decimal space-y-1.5 text-[13px] marker:text-neutral-400 last:mb-0">
                {c}
              </ol>
            );
          },
          li({ children: c }) {
            return <li className="leading-relaxed [&>p]:mb-1 [&>p]:last:mb-0">{c}</li>;
          },
          strong({ children: c }) {
            return <strong className="font-semibold text-neutral-900">{c}</strong>;
          },
          em({ children: c }) {
            return <em className="italic text-neutral-700">{c}</em>;
          },
          h1({ children: c }) {
            return (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{c}</p>
            );
          },
          h2({ children: c }) {
            return (
              <h3 className="mb-1.5 mt-2 text-[12px] font-bold text-neutral-900 first:mt-0">{c}</h3>
            );
          },
          h3({ children: c }) {
            return (
              <h3 className="mb-1.5 mt-2 text-[12px] font-bold text-neutral-900 first:mt-0">{c}</h3>
            );
          },
          hr() {
            return <hr className="my-2.5 border-neutral-200" />;
          },
          blockquote({ children: c }) {
            return (
              <blockquote className="my-2 border-l-2 border-brand-primary/35 pl-2.5 text-[12px] text-neutral-600 italic">
                {c}
              </blockquote>
            );
          },
          code({ className, children: c, ...rest }) {
            const inline = !className;
            if (inline) {
              return (
                <code
                  className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px] text-neutral-800"
                  {...rest}
                >
                  {c}
                </code>
              );
            }
            return (
              <code className={className} {...rest}>
                {c}
              </code>
            );
          },
          pre({ children: c }) {
            return (
              <pre className="mb-2 max-h-44 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-[11px] leading-snug last:mb-0">
                {c}
              </pre>
            );
          },
          table({ children: c }) {
            return (
              <div className="mb-2 max-w-full overflow-x-auto last:mb-0">
                <table className="w-full min-w-[12rem] border-collapse text-left text-[11px]">{c}</table>
              </div>
            );
          },
          thead({ children: c }) {
            return <thead className="border-b border-neutral-200 bg-neutral-50 font-semibold">{c}</thead>;
          },
          th({ children: c }) {
            return <th className="border border-neutral-200 px-2 py-1.5">{c}</th>;
          },
          td({ children: c }) {
            return <td className="border border-neutral-200 px-2 py-1.5 align-top">{c}</td>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
