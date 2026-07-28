import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { POLICIES, getPolicy } from "@/lib/data/policies";
import { pageMetadata } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

const UPDATED = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// The catalogue is finite and known at build time. Without this, an unknown
// slug renders the not-found boundary with a 200 in production — a soft 404
// that search engines will happily index.
export const dynamicParams = false;

export function generateStaticParams() {
  return POLICIES.map((policy) => ({ slug: policy.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) return { title: "Not found" };

  return pageMetadata({
    title: policy.title,
    description: policy.summary,
    path: `/policies/${policy.slug}`,
    type: "article",
  });
}

export default async function PolicyPage({ params }: Params) {
  const { slug } = await params;
  const policy = getPolicy(slug);
  if (!policy) notFound();

  return (
    <article className="px-6 pt-8 pb-24 md:px-12">
      <div className="max-w-2xl">
        <p className="t-label text-accent-ink">Policy</p>
        <h1 className="t-display-lg mt-4">{policy.title}</h1>
        <p className="mt-5 text-lg text-fg-muted">{policy.summary}</p>
        <p className="t-label mt-6 text-fg-muted">
          Last updated {UPDATED.format(new Date(policy.updatedAt))}
        </p>

        <div className="mt-16 space-y-12">
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="t-display-sm">{section.heading}</h2>
              <div className="mt-4 space-y-4">
                {section.body.map((line) => (
                  <p key={line} className="leading-relaxed text-fg-muted">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <nav className="mt-20 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-8">
          {POLICIES.filter((p) => p.slug !== policy.slug).map((other) => (
            <Link
              key={other.slug}
              href={`/policies/${other.slug}`}
              className="t-label text-fg-muted transition-colors hover:text-accent-ink"
            >
              {other.title}
            </Link>
          ))}
        </nav>
      </div>
    </article>
  );
}
