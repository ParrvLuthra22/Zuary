import { CartSheet } from "@/components/commerce/CartSheet";
import { NotifyDrawer } from "@/components/commerce/NotifyDrawer";
import { Footer } from "@/components/layout/Footer";
import { NavBar } from "@/components/layout/NavBar";

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
      <NavBar />
      <div className="min-h-screen pt-24 md:pt-28">{children}</div>
      <Footer />
      <CartSheet />
      <NotifyDrawer />
    </>
  );
}
