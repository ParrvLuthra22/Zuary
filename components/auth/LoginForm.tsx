"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ButtonZ } from "@/components/ui/button-z";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const schema = z.object({
  email: z.string().email("That email does not look right."),
});

type FormValues = z.infer<typeof schema>;

/** Auth.js error codes we can say something useful about. */
const ERROR_COPY: Record<string, string> = {
  OAuthAccountNotLinked:
    "That address is already registered with a different sign-in method. Use the one you signed up with.",
  AccessDenied: "That sign-in was declined.",
  Verification: "That link has expired or was already used. Request a new one.",
  Configuration:
    "Sign-in is not configured yet. If you are seeing this in production, tell us.",
};

export function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const [failure, setFailure] = useState(
    initialError ? (ERROR_COPY[initialError] ?? "Sign-in failed. Try again.") : "",
  );
  const [googlePending, setGooglePending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onEmail(values: FormValues) {
    setFailure("");
    try {
      // redirect: false so a transport failure surfaces here instead of
      // bouncing to the generic error page.
      const result = await signIn("resend", {
        email: values.email,
        redirectTo: next,
        redirect: false,
      });
      if (result?.error) {
        setFailure(ERROR_COPY[result.error] ?? "Could not send the link. Try again.");
        return;
      }
      window.location.href = "/login/check-email";
    } catch {
      setFailure("Could not send the link. Try again.");
    }
  }

  return (
    <div className="mt-10">
      <ButtonZ
        type="button"
        size="lg"
        variant="outline"
        disabled={googlePending}
        onClick={() => {
          setGooglePending(true);
          void signIn("google", { redirectTo: next });
        }}
        className="w-full"
      >
        <GoogleMark />
        {googlePending ? "…" : "Continue with Google"}
      </ButtonZ>

      <div className="my-8 flex items-center gap-4">
        <Separator className="flex-1 bg-line" />
        <span className="t-label text-fg-muted">or</span>
        <Separator className="flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit(onEmail)} noValidate>
        <label htmlFor="login-email" className="t-label text-fg-muted">
          Email
        </label>
        <Input
          id="login-email"
          {...register("email")}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className="mt-3 h-12 rounded-sm border-line bg-bg-raised font-mono text-sm"
        />

        <ButtonZ type="submit" size="lg" disabled={isSubmitting} className="mt-4 w-full">
          {isSubmitting ? "…" : "Email me a link"}
        </ButtonZ>

        {errors.email ? (
          <p id="login-email-error" role="alert" className="t-label mt-3 text-accent-ink">
            {errors.email.message}
          </p>
        ) : null}
      </form>

      {failure ? (
        <p role="alert" className="t-label mt-6 text-fg-muted">
          {failure}
        </p>
      ) : null}
    </div>
  );
}

/* Brand mark, inline — lucide v1 dropped these. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.19a5.3 5.3 0 0 1-2.3 3.47v2.9h3.72c2.17-2 3.45-4.95 3.45-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.55-2.02-6.46-4.75H1.68v3A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.54 14.67a7.2 7.2 0 0 1 0-4.6v-3H1.68a12 12 0 0 0 0 10.6l3.86-3Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.3-3.3C17.72 1.19 15.11 0 12 0 7.35 0 3.33 2.67 1.68 6.57l3.86 3C6.45 6.84 9 4.75 12 4.75Z"
      />
    </svg>
  );
}
