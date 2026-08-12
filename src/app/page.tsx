import { AccessibleButton } from "@/components/common/AccessibleButton";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p
        className="text-base font-semibold text-[var(--color-primary)]"
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
      <div><AccessibleButton>서비스 시작하기</AccessibleButton></div>
    </main>
  );
}
