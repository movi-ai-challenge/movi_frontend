import { redirect } from "next/navigation";

export default function DeprecatedMediumRiskMockPage() {
  redirect("/accounts");
}
