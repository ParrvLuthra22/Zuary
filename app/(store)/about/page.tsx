import type { Metadata } from "next";

import { RevealText } from "@/components/motion/RevealText";
import { TeamGrid } from "@/components/about/TeamGrid";
import { SIZE_GUIDE } from "@/lib/data/products";
import { TEAM } from "@/lib/data/team";
import { pageMetadata } from "@/lib/site";

const DESCRIPTION =
  "Three trousers, one block, two mills. Why ZUARY cuts fixed runs instead of a catalogue.";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: DESCRIPTION,
  path: "/about",
  type: "article",
});

const CITIES = [
  {
    city: "Tirupur",
    label: "Cutting & sewing",
    line: "Two units, both visited before a single metre was bought. Our twill and drill are woven and made up within forty kilometres of each other.",
  },
  {
    city: "Delhi NCR",
    label: "Warehouse & dispatch",
    line: "Everything ships from one room in Noida. No third-party fulfilment, which is why the dispatch window is three days and not ten.",
  },
  {
    city: "Bengaluru",
    label: "Brand & technology",
    line: "The site, the photography direction and the drops are planned here. Two people, one repository.",
  },
];

export default function AboutPage() {
  return (
    <div className="pb-24">
      {/* 1 — opener */}
      <section className="flex min-h-[calc(100svh-7rem)] flex-col justify-center px-6 md:px-12">
        <RevealText as="h1" className="t-display-xl max-w-[14ch]">
          Why ZUARY exists.
        </RevealText>
        <p className="mt-8 max-w-md text-lg text-fg-muted italic">
          Because the trouser is the hardest thing in the wardrobe to get right,
          and almost nobody starts there.
        </p>
        <p className="t-label mt-16 text-fg-muted">Scroll ↓</p>
      </section>

      {/* 2 — essay */}
      <section className="px-6 md:px-12">
        <div className="max-w-2xl">
          <p className="leading-relaxed text-fg-muted">
            <span
              className="float-left mt-2 mr-4 font-display leading-[0.75] text-accent"
              style={{ fontSize: "7rem", fontWeight: 900 }}
              aria-hidden
            >
              M
            </span>
            ost clothing brands begin with a t-shirt. It is the cheapest thing to
            make, the easiest to fit, and the fastest way to find out whether
            anyone wants what you are selling. We started with the trouser
            instead, which is the opposite of all three. A trouser has a rise, a
            seat, a thigh and a break, and every one of those has to agree with
            the others before the thing looks like anything at all. Get a t-shirt
            slightly wrong and it reads as relaxed. Get a trouser slightly wrong
            and it reads as cheap.
          </p>

          <p className="mt-6 leading-relaxed text-fg-muted">
            That is the whole argument. If you can cut a trouser properly, the
            rest of the wardrobe is downhill. So we spent the first year on one
            block — a single pattern for the rise, the waistband and the seat —
            and then cut it three ways rather than designing three separate
            garments. KOHL is that block tailored. DHOOL is it straight. REEH is
            it pleated. Same rise, same faced waistband, same size in all three.
            If a medium fits you in one, it fits you in the others, and that is
            not a marketing claim, it is a consequence of not starting over each
            time.
          </p>

          <p className="mt-6 leading-relaxed text-fg-muted">
            Three products, not thirty. A catalogue is a way of hedging: put out
            enough options and something will sell, and the ones that do not can
            be discounted in six months. It also means nobody in the building
            knows any single product well. We would rather cut a fixed run,
            watch what it does on real bodies, and change the block before the
            next one. When a run is gone it is gone. That is a constraint we
            chose, and it is the reason there is no permanent sale.
          </p>
        </div>
      </section>

      {/* full-bleed breakout */}
      <figure className="my-20 w-full">
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-bg-raised">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/material/mill.webp"
            alt="The mill floor in Tirupur"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <figcaption className="t-label mt-3 px-6 text-fg-muted md:px-12">
          Tirupur, Tamil Nadu — the second of the two mills we shortlisted
        </figcaption>
      </figure>

      <section className="px-6 md:px-12">
        <div className="max-w-2xl">
          <p className="leading-relaxed text-fg-muted">
            Finding the cloth took longer than designing the block. We went to
            Tirupur with a list of eleven mills and came back with two. The test
            was dull and specific: we asked each of them for the same
            heavyweight cotton twill, washed it four times, and measured how
            much it had moved and how the diagonal sat afterwards. Most of the
            samples softened into something shapeless by the third wash. The two
            that held their line are the ones weaving for us now — one in
            Tirupur for the twill, one in Erode for the drill, and a third in
            Bhilwara for the cotton-linen once we needed something lighter.
          </p>

          <p className="mt-6 leading-relaxed text-fg-muted">
            We finish without a resin coat, which is why the cloth softens
            instead of going slack, and why it costs more per metre than the
            alternative. It is also why the black fades along the seams rather
            than patching. Those are the trade-offs we can explain, so we make
            them where we can explain them.
          </p>

          <p className="mt-6 leading-relaxed text-fg-muted">
            There is no logo on the outside of any of these trousers. Not as a
            statement — a logo is just a way of borrowing someone else&rsquo;s
            judgement about whether the thing is good. If the fit is right you
            will know it at the fitting room mirror, before you have read a word
            we have written. If it is not, no amount of embroidery on the back
            pocket will fix it. We would rather be judged on the seam.
          </p>
        </div>
      </section>

      {/* 3 — team */}
      <section className="mt-28 px-6 md:px-12">
        <p className="t-label text-accent">The team</p>
        <h2 className="t-display-md mt-3">Five people.</h2>
        <TeamGrid members={TEAM} />
      </section>

      {/* 4 — made in India */}
      <section className="mt-28 px-6 md:px-12">
        <p className="t-label text-accent">Made in India</p>
        <h2 className="t-display-md mt-3">Three cities.</h2>

        <ul className="mt-12 grid gap-10 md:grid-cols-3">
          {CITIES.map((entry) => (
            <li key={entry.city} className="border-t border-line pt-6">
              <h3 className="t-display-sm">{entry.city}</h3>
              <p className="t-label mt-2 text-accent">{entry.label}</p>
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                {entry.line}
              </p>
            </li>
          ))}
        </ul>

        <p className="t-display-sm mt-16 max-w-xl">
          Made in the country we sell to.
        </p>
      </section>

      {/* sizing reference, linked from every product page */}
      <section id="sizing" className="mt-28 scroll-mt-28 px-6 md:px-12">
        <p className="t-label text-accent">Sizing</p>
        <h2 className="t-display-md mt-3">One block, four sizes.</h2>
        <p className="mt-6 max-w-xl text-sm text-fg-muted">
          Measurements are of the garment laid flat, in inches, not of the body.
          All three trousers size the same.
        </p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-lg border-collapse text-left font-mono text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Size", "Waist", "Hip", "Thigh", "Inseam", "Hem"].map((h) => (
                  <th key={h} className="t-label py-3 text-fg-muted">
                    {h}
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
    </div>
  );
}
