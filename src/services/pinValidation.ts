const KOREAN_MOBILE_PATTERN = /^01[016789][0-9]{7,8}$/;

export function normalizeKoreanMobileNumber(value: string): string | null {
  const compact = value.replace(/[^0-9+]/g, "");
  const normalized = compact.startsWith("+82")
    ? `0${compact.slice(3)}`
    : compact.startsWith("82")
      ? `0${compact.slice(2)}`
      : compact;

  return KOREAN_MOBILE_PATTERN.test(normalized) ? normalized : null;
}

export function sanitizePinInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function isSixDigitPin(value: string): boolean {
  return /^[0-9]{6}$/.test(value);
}
