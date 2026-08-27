import { redirect } from "next/navigation";

export default function DeprecatedBlockedMockPage() {
  redirect("/accounts");
}
