import type { Metadata } from "next";

import { StackGallery } from "@/components/sections/StackGallery";
import { currentDrop } from "@/lib/data/drops";

export const metadata: Metadata = {
  title: "Lookbook",
  description: "The Trouser Trio, shot on location.",
};

export default function LookbookPage() {
  return (
    <div className="pt-16 pb-24">
      <header className="px-6 md:px-12">
        <p className="t-label text-accent">{currentDrop.season}</p>
        <h1 className="t-display-lg mt-4">Lookbook</h1>
      </header>

      <div className="mt-16">
        <StackGallery images={currentDrop.lookbookImages.map((i) => i.src)} alt={currentDrop.title} />
      </div>
    </div>
  );
}
