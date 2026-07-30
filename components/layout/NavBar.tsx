import { auth } from "@/auth";
import { Nav } from "@/components/layout/Nav";

/**
 * Server wrapper that resolves the session before the nav renders, so the
 * account control is already in its correct state in the first HTML — no
 * "sign in" icon flashing into a dropdown for a customer who is signed in.
 *
 * Reading the session reads cookies, which opts every route that renders this
 * out of static generation. That is the unavoidable price of a personalised
 * nav without Partial Prerendering; the alternative is resolving the session on
 * the client, which is exactly the flash this exists to prevent.
 *
 * Only the three fields the menu needs cross the boundary. Passing the whole
 * session would ship the raw token payload into the client bundle.
 */
export async function NavBar() {
  const session = await auth();
  const user = session?.user;

  return (
    <Nav
      account={
        user
          ? {
              name: user.name ?? null,
              email: user.email ?? null,
              isAdmin: user.role === "admin",
            }
          : null
      }
    />
  );
}
