import { CartSheet } from "@/components/commerce/CartSheet";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";

/* SmoothScroll, ScrollTriggerProvider, PageTransition and TrouserCursor are
   mounted once in the root layout — mounting them here too would give Lenis
   two instances and run the sweep twice. */

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <div className="min-h-screen pt-24 md:pt-28">{children}</div>
      <Footer />
      <CartSheet />
    </>
  );
}
