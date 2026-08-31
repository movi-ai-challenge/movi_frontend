interface AmountProps {
  /** 원 단위 정수 */
  value: number;
  className?: string;
  /** "원" 단위를 붙일지 여부 */
  showUnit?: boolean;
  /** 부호를 항상 표시한다. 거래 내역의 입금/출금 구분에 사용한다. */
  signed?: boolean;
}

/**
 * 금액 표시.
 *
 * 자릿수가 세로로 맞아야 훑어보기 쉬우므로 tabular-nums 고정폭을 쓴다.
 * 화면 낭독기가 "50,000"을 자릿수 단위로 끊어 읽지 않도록
 * aria-label 에 한국어 단위를 붙인다.
 */
export function Amount({ value, className = "", showUnit = true, signed = false }: AmountProps) {
  const sign = signed && value > 0 ? "+" : "";
  const formatted = `${sign}${value.toLocaleString("ko-KR")}`;

  return (
    <span className={`tabular ${className}`} aria-label={`${value.toLocaleString("ko-KR")}원`}>
      <span aria-hidden="true">{formatted}</span>
      {showUnit ? (
        <span aria-hidden="true" className="ml-0.5 text-[0.6em] font-normal text-[var(--color-text-muted)]">
          원
        </span>
      ) : null}
    </span>
  );
}
