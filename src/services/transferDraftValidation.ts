export type TransferDraftInputValidation =
  | {
      valid: true;
      recipientName: string;
      amount: number;
    }
  | {
      valid: false;
      message: string;
    };

const WON_AMOUNT_PATTERN = /^[0-9]+$/;

export function validateTransferDraftInput(
  recipientInput: string,
  amountInput: string,
): TransferDraftInputValidation {
  const recipientName = recipientInput.trim();
  if (!recipientName) {
    return { valid: false, message: "받는 사람을 입력해 주세요." };
  }

  if (!WON_AMOUNT_PATTERN.test(amountInput)) {
    return {
      valid: false,
      message: "보낼 금액은 원 단위의 숫자로 입력해 주세요.",
    };
  }

  const amount = Number(amountInput);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    return {
      valid: false,
      message: "보낼 금액은 1원 이상의 안전한 정수로 입력해 주세요.",
    };
  }

  return { valid: true, recipientName, amount };
}
