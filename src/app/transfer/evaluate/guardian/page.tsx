import { redirect } from "next/navigation";

export default function DeprecatedGuardianApprovalPage() {
  redirect("/transfer/evaluate/medium");
}
