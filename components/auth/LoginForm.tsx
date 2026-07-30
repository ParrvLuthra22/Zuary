"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Phone } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ButtonZ } from "@/components/ui/button-z";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("That email does not look right."),
});

type FormValues = z.infer<typeof schema>;

/** The Auth.js codes worth saying something specific about. */
const ERROR_COPY: Record<string, string> = {
  OAuthAccountNotLinked:
    "That email is already registered with a different sign-in method. Try the magic link instead.",
  Verification: "That link expired or was already used. Request a new one.",
};

const GENERIC = "Something went wrong signing you in. Try again.";

export function LoginForm({
  next,
  initialError,
  phoneEnabled,
}: {
  next: string;
  initialError?: string;
  phoneEnabled: boolean;
}) {
  const [failure, setFailure] = useState(
    initialError ? (ERROR_COPY[initialError] ?? GENERIC) : "",
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
      // redirect:false so a send failure surfaces inline instead of bouncing to
      // the generic error page.
      const result = await signIn("resend", {
        email: values.email,
        redirectTo: next,
        redirect: false,
      });
      if (result?.error) {
        setFailure(ERROR_COPY[result.error] ?? GENERIC);
        return;
      }
      // The address is carried across so check-email can name it. It is echoed
      // back into copy, never into a link or a redirect.
      window.location.href = `/login/check-email?email=${encodeURIComponent(values.email)}`;
    } catch {
      setFailure("Could not send the link. Check your connection and try again.");
    }
  }

  return (
    <div className="mt-10">
      {/*
        Neutral, not accent. Google's brand guidelines require their mark to sit
        on white or a neutral surface, so this is off-white with carbon text in
        the dark theme and inverts on paper — the one button in the app that
        deliberately does not use the hazard fill.
      */}
      <button
        type="button"
        disabled={googlePending}
        onClick={() => {
          setGooglePending(true);
          void signIn("google", { redirectTo: next });
        }}
        className={cn(
          "flex h-14 w-full items-center justify-center gap-3 rounded-sm",
          "font-mono text-xs tracking-[0.18em] uppercase",
          "bg-off-white text-carbon hover:bg-fog",
          /* On paper, off-white is almost the page colour. Pure white plus a
             hairline keeps the button readable as a button — and white is what
             Google's guidelines ask for anyway. */
          "light:border light:border-line light:bg-bg-deep light:hover:bg-off-white",
          "transition-colors duration-[--dur-micro] ease-[--ease-out]",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <GoogleMark />
        {googlePending ? "Redirecting…" : "Continue with Google"}
      </button>

      {phoneEnabled ? (
        <ButtonZ
          type="button"
          size="lg"
          variant="outline"
          className="mt-3 h-14 w-full"
          asChild
        >
          <a href={`/login/phone?next=${encodeURIComponent(next)}`}>
            <Phone className="size-4" />
            Continue with phone
          </a>
        </ButtonZ>
      ) : null}

      {/* Hairline with the label sitting on it. */}
      <div className="my-8 flex items-center gap-4" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="t-label text-fg-muted">or</span>
        <span className="h-px flex-1 bg-line" />
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
          className="mt-3 h-14 rounded-sm border-line bg-bg-raised font-mono text-sm"
        />

        <ButtonZ
          type="submit"
          variant="outline"
          disabled={isSubmitting}
          className="mt-3 h-14 w-full"
        >
          {isSubmitting ? "Sending…" : "Send me a link"}
        </ButtonZ>

        {errors.email ? (
          <p
            id="login-email-error"
            role="alert"
            className="t-label mt-3 text-accent-ink"
          >
            {errors.email.message}
          </p>
        ) : null}
      </form>

      {failure ? (
        <p role="alert" className="t-label mt-6 leading-relaxed text-fg-muted">
          {failure}
        </p>
      ) : null}
    </div>
  );
}

/* Inline — lucide v1 dropped brand marks, and this one has to stay full-colour
   on the neutral button to satisfy Google's guidelines. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
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
