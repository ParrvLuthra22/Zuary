import type { Metadata } from "next";

import { Marquee } from "@/components/sections/Marquee";
import { POLICIES } from "@/lib/data/policies";
import { SIZE_GUIDE } from "@/lib/data/products";
import { TEAM } from "@/lib/data/team";

export const metadata: Metadata = {
  title: "About",
  description: "Who cuts ZUARY, and where.",
};

export default function AboutPage() {
  return (
    <div className="pt-16 pb-24">
      <header className="px-6 md:px-12">
        <p className="t-label text-accent">Who we are</p>
        <h1 className="t-display-lg mt-4 max-w-3xl">
          Five people and two mills.
        </h1>
        <p className="mt-6 max-w-xl text-fg-muted">
          We cut trousers in fixed runs, from cloth we have seen on the loom.
          When a run is gone it is gone; we would rather re-cut a good block than
          keep a bad one in stock.
        </p>
      </header>

      <Marquee
        className="mt-16"
        items={[
          "Tirupur, Tamil Nadu",
          "Erode, Tamil Nadu",
          "Bhilwara, Rajasthan",
          "Fixed runs",
          "Cut sharp",
        ]}
      />

      <section className="px-6 py-20 md:px-12">
        <h2 className="t-label text-fg-muted">The team</h2>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {TEAM.map((member) => (
            <li
              key={member.name}
              className="grid gap-2 py-6 md:grid-cols-[10rem_16rem_1fr] md:items-baseline"
            >
              <span className="t-display-sm">{member.name}</span>
              <span className="t-label text-accent">{member.role}</span>
              <span className="text-sm text-fg-muted">{member.focus}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="sizing" className="px-6 py-10 md:px-12">
        <h2 className="t-label text-fg-muted">Sizing</h2>
        <p className="mt-4 max-w-xl text-sm text-fg-muted">
          All three trousers share one block, so a size in one is a size in the
          others. Measurements are of the garment laid flat, not the body.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-lg border-collapse text-left font-mono text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Size", "Waist", "Hip", "Thigh", "Inseam", "Hem"].map((head) => (
                  <th key={head} className="t-label py-3 text-fg-muted">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-fg-muted">
              {SIZE_GUIDE.map((row) => (
                <tr key={row.size} className="border-b border-line">
                  <td className="py-3 text-fg">{row.size}</td>
                  <td className="py-3">{row.waist}</td>
                  <td className="py-3">{row.hip}</td>
                  <td className="py-3">{row.thigh}</td>
                  <td className="py-3">{row.inseam}</td>
                  <td className="py-3">{row.hem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="px-6 py-10 md:px-12">
        {POLICIES.map((policy) => (
          <div key={policy.slug} id={policy.slug} className="scroll-mt-24 py-10">
            <h2 className="t-display-sm">{policy.title}</h2>
            <div className="mt-6 space-y-6">
              {policy.sections.map((section) => (
                <div key={section.heading}>
                  <h3 className="t-label text-accent">{section.heading}</h3>
                  {section.body.map((line) => (
                    <p key={line} className="mt-2 max-w-xl text-sm text-fg-muted">
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
