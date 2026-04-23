import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface HeadingItem {
  id: string;
  text: string;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nodeToText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(nodeToText).join("");
  }

  return "";
}

function extractHeadings(markdown: string): HeadingItem[] {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("## ") && !line.startsWith("### "))
    .map((line) => line.replace(/^##\s+/, "").trim())
    .filter(Boolean)
    .map((text) => ({
      id: slugify(text),
      text,
    }));
}

async function loadAboutMarkdown() {
  return readFile(
    path.join(process.cwd(), "public", "content", "about.md"),
    "utf8",
  );
}

function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-8">
      <Link className="group" href="/">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--accent)]">
          Examinationsdesigner
        </p>
        <p className="mt-1 font-serif text-3xl tracking-tight text-[var(--ink)] group-hover:text-[var(--accent-strong)]">
          Produkt · process · agens
        </p>
      </Link>
      <nav className="flex flex-wrap gap-2" aria-label="Huvudnavigation">
        <Link
          className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2 text-sm font-bold transition hover:border-[var(--accent)]"
          href="/"
        >
          Ny design
        </Link>
        <Link
          aria-current="page"
          className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white"
          href="/om"
        >
          Om verktyget
        </Link>
      </nav>
    </header>
  );
}

export async function AboutPage() {
  const markdown = await loadAboutMarkdown();
  const headings = extractHeadings(markdown);

  return (
    <main className="page-enter flex-1 px-4 pb-16 md:px-8">
      <PublicHeader />
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[15rem_minmax(0,720px)]">
        <nav
          aria-label="Innehållsförteckning"
          className="rounded-[1.35rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.88)] p-4 shadow-lg shadow-stone-900/5 lg:sticky lg:top-6 lg:self-start"
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            Innehåll
          </p>
          <ul className="mt-4 grid gap-2 text-sm leading-6">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a
                  className="text-[var(--muted)] underline-offset-4 hover:text-[var(--accent-strong)] hover:underline"
                  href={`#${heading.id}`}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="prose prose-stone max-w-[720px] rounded-[1.75rem] border border-[var(--line)] bg-[rgb(255_250_240_/_0.92)] p-6 text-base leading-8 shadow-xl shadow-stone-900/5 md:p-10 lg:prose-lg prose-headings:font-serif prose-h1:text-5xl prose-h2:scroll-mt-8 prose-a:text-[var(--accent-strong)]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => {
                const text = nodeToText(children);
                return <h2 id={slugify(text)}>{children}</h2>;
              },
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </div>
    </main>
  );
}
