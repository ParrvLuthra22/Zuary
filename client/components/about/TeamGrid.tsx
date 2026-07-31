"use client";

import Image from "next/image";
import { useState } from "react";

import type { TeamMember } from "@/shared/constants/team";

export function TeamGrid({ members }: { members: TeamMember[] }) {
  return (
    <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <li key={member.name} className="border border-line bg-bg-raised p-8">
          <Avatar member={member} />
          <h3 className="t-display-sm mt-6">{member.name}</h3>
          <p className="t-label mt-2 text-accent-ink">{member.role}</p>
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            {member.focus}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** No headshots exist yet, so the initial is the normal case, not the fallback. */
function Avatar({ member }: { member: TeamMember }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(member.image) && !failed;

  return (
    <div className="relative size-16 overflow-hidden rounded-full border border-line bg-bg">
      {showImage ? (
        <Image
          src={member.image as string}
          alt={member.name}
          fill
          sizes="64px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          aria-hidden
          className="t-display-sm absolute inset-0 grid place-items-center text-accent-ink"
        >
          {member.name.charAt(0)}
        </span>
      )}
    </div>
  );
}
