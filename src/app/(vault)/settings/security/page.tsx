import { redirect } from "next/navigation";

/** Legacy path — security settings live on the combined account page. */
export default function SecuritySettingsRedirectPage() {
  redirect("/settings/account#security");
}
