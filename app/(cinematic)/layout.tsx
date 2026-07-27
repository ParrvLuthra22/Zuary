import { CartSheet } from "@/components/commerce/CartSheet";
import { Nav } from "@/components/layout/Nav";

/**
 * No footer, no page padding — the cinematic group runs edge to edge and lets
 * each page own the full viewport. The motion layer lives in the root layout.
 */
export default function CinematicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <div className="bg-bg-deep">{children}</div>
      <CartSheet />
    </>
  );
}
