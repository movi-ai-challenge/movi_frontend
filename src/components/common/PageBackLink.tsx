import Link from "next/link";
import type { ReactNode } from "react";

interface PageBackLinkProps {
  href: string;
  children: ReactNode;
}

/**
 * 이전 단계로 돌아가는 링크.
 *
 * 목업은 화살표 아이콘 하나만 두므로 시각적으로는 아이콘 버튼이지만,
 * 어디로 가는지는 children 이 접근성 이름으로 전달한다. 화살표만으로는
 * 낭독기 사용자가 목적지를 알 수 없다.
 */
export function PageBackLink({ href, children }: PageBackLinkProps) {
  return (
    <nav aria-label="이전 단계">
      <Link
        href={href}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-lg text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        <span aria-hidden="true">←</span>
        <span className="sr-only">{children}</span>
      </Link>
    </nav>
  );
}
