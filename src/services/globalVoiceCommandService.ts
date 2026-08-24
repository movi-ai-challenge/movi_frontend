export type GlobalVoiceCommandIntent =
  | "home"
  | "login"
  | "accounts"
  | "account-connection"
  | "balance"
  | "transactions"
  | "transfer";

export interface GlobalVoiceCommand {
  intent: GlobalVoiceCommandIntent;
  label: string;
  route: string;
  feedback: string;
}

const commandDefinitions: Array<{
  command: GlobalVoiceCommand;
  keywords: string[];
}> = [
  {
    command: {
      intent: "account-connection",
      label: "계좌 연결",
      route: "/accounts/connect",
      feedback: "계좌 연결 화면으로 이동할게요.",
    },
    keywords: ["계좌 연결", "통장 연결"],
  },
  {
    command: {
      intent: "transactions",
      label: "거래내역",
      route: "/transactions",
      feedback: "거래내역 화면으로 이동할게요.",
    },
    keywords: ["거래내역", "거래 내역", "최근 거래", "입출금"],
  },
  {
    command: {
      intent: "balance",
      label: "잔액조회",
      route: "/balance",
      feedback: "잔액조회 화면으로 이동할게요.",
    },
    keywords: ["잔액", "얼마 있어", "돈 있어"],
  },
  {
    command: {
      intent: "transfer",
      label: "송금",
      route: "/transfer",
      feedback: "송금 정보 입력 화면으로 이동할게요. 아직 송금되지는 않아요.",
    },
    keywords: ["송금", "이체", "돈 보내"],
  },
  {
    command: {
      intent: "accounts",
      label: "연결된 계좌",
      route: "/accounts",
      feedback: "연결된 계좌 화면으로 이동할게요.",
    },
    keywords: ["계좌", "통장"],
  },
  {
    command: {
      intent: "login",
      label: "로그인",
      route: "/login",
      feedback: "로그인 화면으로 이동할게요.",
    },
    keywords: ["로그인", "시작하기"],
  },
  {
    command: {
      intent: "home",
      label: "처음 화면",
      route: "/",
      feedback: "처음 화면으로 이동할게요.",
    },
    keywords: ["처음 화면", "홈 화면", "홈으로", "처음으로"],
  },
];

export function extractCommandAfterWakeWord(transcript: string): {
  hasWakeWord: boolean;
  commandText: string;
} {
  const match = transcript.match(/모\s*비야[\s,，.]*/);
  if (!match || match.index === undefined) {
    return { hasWakeWord: false, commandText: "" };
  }

  return {
    hasWakeWord: true,
    commandText: transcript.slice(match.index + match[0].length).trim(),
  };
}

export function parseGlobalVoiceCommand(
  commandText: string,
): GlobalVoiceCommand | null {
  const normalizedCommand = commandText.replace(/\s+/g, " ").trim();

  return (
    commandDefinitions.find(({ keywords }) =>
      keywords.some((keyword) => normalizedCommand.includes(keyword)),
    )?.command ?? null
  );
}

export const globalVoiceCommandExamples = commandDefinitions.map(
  ({ command }) => command,
);
