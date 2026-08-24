const MOCK_TRANSCRIPTION_DELAY_MS = 700;

export async function transcribeTransferRecording(
  recording: Blob,
): Promise<string> {
  if (recording.size === 0) {
    throw new Error("Empty voice recording");
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_TRANSCRIPTION_DELAY_MS);
  });

  return "김모비에게 보내줘";
}

export async function transcribeTransactionQueryRecording(
  recording: Blob,
): Promise<string> {
  if (recording.size === 0) {
    throw new Error("Empty voice recording");
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_TRANSCRIPTION_DELAY_MS);
  });

  return "최근 일주일 거래 보여줘";
}

export async function transcribeTransferAmountRecording(
  recording: Blob,
): Promise<string> {
  if (recording.size === 0) {
    throw new Error("Empty voice recording");
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_TRANSCRIPTION_DELAY_MS);
  });

  return "5만원";
}
