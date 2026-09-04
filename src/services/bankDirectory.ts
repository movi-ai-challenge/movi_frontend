const BANK_NAMES: Record<string, string> = {
  "003": "기업은행",
  "004": "국민은행",
  "007": "수협은행",
  "011": "농협은행",
  "012": "농협중앙회",
  "020": "우리은행",
  "023": "SC제일은행",
  "027": "씨티은행",
  "045": "새마을금고",
  "071": "우체국",
  "081": "하나은행",
  "088": "신한은행",
  "089": "케이뱅크",
  "090": "카카오뱅크",
  "092": "토스뱅크",
};

export function bankNameOf(bankCode: string): string {
  return BANK_NAMES[bankCode] ?? `은행 코드 ${bankCode}`;
}
