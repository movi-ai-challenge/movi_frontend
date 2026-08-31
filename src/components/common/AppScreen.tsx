import type { ReactNode } from "react";

interface AppScreenProps {
  children: ReactNode;
  /** 화면 하단에 고정으로 붙는 주요 행동 영역 */
  footer?: ReactNode;
  className?: string;
}

/**
 * 모바일 우선 화면 껍데기.
 *
 * 목업이 360px 기기 기준이므로 본문을 그 폭에 맞춰 가운데 정렬한다.
 * 넓은 화면에서도 한 손 조작 폭을 유지하는 편이 읽기 쉽다.
 *
 * min-h-dvh 를 쓰는 이유: 모바일 브라우저 주소창이 접히고 펼쳐질 때
 * vh 는 값이 튀어 하단 고정 버튼이 화면 밖으로 밀린다.
 */
export function AppScreen({ children, footer, className = "" }: AppScreenProps) {
  return (
    <div className="flex min-h-dvh justify-center bg-[var(--color-background)]">
      <div className="flex w-full max-w-[26rem] flex-col px-5">
        <main className={`flex flex-1 flex-col ${className}`}>{children}</main>
        {footer ? <div className="sticky bottom-0 flex flex-col gap-3 bg-[var(--color-background)] pb-8 pt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
