import { CartSheet } from "@/components/commerce/CartSheet";
import { NotifyDrawer } from "@/components/commerce/NotifyDrawer";
import { Footer } from "@/components/layout/Footer";
import { NavBar } from "@/components/layout/NavBar";

/**
 * Nav and Footer as everywhere else, but no top padding: the cinematic group's
 * hero is a full-viewport sticky track that is meant to run under the
 * transparent bar. Padding here would leave a band above it and stop the pin
 * from reaching the top of the screen.
 *
 * The motion layer lives in the root layout.
 */
export default function CinematicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <div className="bg-bg-deep">{children}</div>
      <Footer />
      <CartSheet />
      <NotifyDrawer />
    </>
  );
}
