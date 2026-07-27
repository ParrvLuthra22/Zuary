import { CartSheet } from "@/components/commerce/CartSheet";
import { Nav } from "@/components/layout/Nav";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { TrouserCursor } from "@/components/motion/TrouserCursor";

/**
 * No footer, no page padding — the cinematic group runs edge to edge and lets
 * each page own the full viewport.
 */
export default function CinematicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <TrouserCursor />
      <Nav />
      <div className="bg-bg-deep">{children}</div>
      <CartSheet />
    </SmoothScroll>
  );
}
