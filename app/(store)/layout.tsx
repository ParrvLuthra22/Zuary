import { CartSheet } from "@/components/commerce/CartSheet";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { PageTransition } from "@/components/motion/PageTransition";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { TrouserCursor } from "@/components/motion/TrouserCursor";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SmoothScroll>
      <TrouserCursor />
      <Nav />
      <div className="min-h-screen pt-16">
        <PageTransition>{children}</PageTransition>
      </div>
      <Footer />
      <CartSheet />
    </SmoothScroll>
  );
}
