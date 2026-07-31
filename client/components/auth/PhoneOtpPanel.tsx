"use client";

import { signIn } from "next-auth/react";
import { track } from "@/client/lib/track";
import { useEffect, useRef, useState } from "react";

import { ButtonZ } from "@/client/components/ui/button-z";
import { Input } from "@/client/components/ui/input";
import { cn } from "@/shared/utils";

const RESEND_SECONDS = 30;
const LENGTH = 6;

export function PhoneOtpPanel({ next }: { next: string }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function requestCode() {
    setError("");
    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      setError("Ten digits, starting 6-9.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send a code.");
        return;
      }
      setStep("code");
      setCooldown(RESEND_SECONDS);
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function submitCode(code: string) {
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ticket) {
        setError(data.error ?? "That code is not right.");
        setDigits(Array(LENGTH).fill(""));
        boxes.current[0]?.focus();
        return;
      }
      // The ticket, never the phone — see lib/auth/otp.ts.
      track("login_completed", { method: "phone" });
      await signIn("phone-otp", { ticket: data.ticket, redirectTo: next });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((v, i) => (i === index ? "" : v)));
      return;
    }

    // A paste lands entirely in one box; spread it across the rest.
    const next = [...digits];
    for (let i = 0; i < clean.length && index + i < LENGTH; i += 1) {
      next[index + i] = clean[i];
    }
    setDigits(next);

    const landed = Math.min(index + clean.length, LENGTH - 1);
    boxes.current[landed]?.focus();

    if (next.every(Boolean)) void submitCode(next.join(""));
  }

  if (step === "phone") {
    return (
      <div className="mt-3">
        <label htmlFor="otp-phone" className="t-label text-fg-muted">
          Phone
        </label>
        <div className="mt-3 flex gap-2">
          <span className="flex h-14 shrink-0 items-center rounded-sm border border-line px-3 font-mono text-sm text-fg-muted">
            +91
          </span>
          <Input
            id="otp-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            className="h-14 rounded-sm border-line bg-bg-raised font-mono text-sm"
          />
        </div>

        <ButtonZ
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => void requestCode()}
          className="mt-3 h-14 w-full"
        >
          {pending ? "Sending…" : "Send me a code"}
        </ButtonZ>

        {error ? (
          <p role="alert" className="t-label mt-3 text-accent-ink">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="t-label text-fg-muted">
        Code sent to +91 {phone}
      </p>

      <div className="mt-3 flex gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            value={digit}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => {
              // Backspace on an empty box steps back, which is what every
              // other code input does and what fingers expect.
              if (e.key === "Backspace" && !digits[i] && i > 0) {
                boxes.current[i - 1]?.focus();
              }
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={LENGTH}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
            className={cn(
              "h-14 w-full rounded-sm border border-line bg-bg-raised text-center",
              "font-mono text-lg text-fg outline-none focus:border-accent",
            )}
          />
        ))}
      </div>

      {error ? (
        <p role="alert" className="t-label mt-3 text-accent-ink">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setDigits(Array(LENGTH).fill(""));
            setError("");
          }}
          className="t-label text-fg-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Change number
        </button>

        <button
          type="button"
          disabled={cooldown > 0 || pending}
          onClick={() => void requestCode()}
          className="t-label text-accent-ink underline-offset-4 hover:underline disabled:text-fg-muted disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}
