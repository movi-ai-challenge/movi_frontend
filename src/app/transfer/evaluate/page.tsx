import Link from "next/link";

export default function TransferEvaluationPage() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <p className="font-bold text-[var(--color-warning)]">실제 이체 미실행</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        목업 송금 실행 경로를 중단했습니다
      </h1>
      <p className="mt-4 text-lg leading-8">
        현재 공개된 백엔드 계약에는 직접 입력 송금 실행 API가 없습니다. 이
        화면에서는 FDS 결과나 이체 성공을 임의로 만들지 않습니다.
      </p>
      <Link
        href="/accounts"
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        실제 음성 송금으로 이동
      </Link>
    </main>
  );
}
