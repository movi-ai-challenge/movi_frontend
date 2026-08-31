import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p
        className="text-base font-semibold text-[var(--color-accent)]"
        data-secondary-content="true"
      >
        Voice-First Inclusive Banking
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">누구나 안심하고 이용하는 금융</h1>
      <p
        className="max-w-2xl text-lg leading-8 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        MOVI 프론트엔드 초기 설정이 완료되었습니다. 실제 화면은 MVP 기능명세에 맞춰 순서대로 구현합니다.
      </p>
      <div>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          서비스 시작하기
        </Link>
      </div>
    </main>
  );
}
