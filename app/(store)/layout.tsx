import { CartSheet } from "@/client/components/commerce/CartSheet";
import { NotifyDrawer } from "@/client/components/commerce/NotifyDrawer";
import { Footer } from "@/client/components/layout/Footer";
import { NavBar } from "@/client/components/layout/NavBar";

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
