import Link from "next/link";
import type { ReactNode } from "react";

interface PageBackLinkProps {
  href: string;
  children: ReactNode;
}

export function PageBackLink({ href, children }: PageBackLinkProps) {
  return (
    <nav aria-label="이전 단계" className="mb-8">
      <Link
        href={href}
        className="inline-flex min-h-11 items-center rounded-md font-semibold text-[var(--color-primary)] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        {children}
      </Link>
    </nav>
  );
}
