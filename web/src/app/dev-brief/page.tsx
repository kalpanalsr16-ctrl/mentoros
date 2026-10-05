import { redirect } from "next/navigation";

/** Dev Brief now lives inside Explore the AI System; old links keep working. */
export default function DevBriefRedirect() {
  redirect("/showcase/dev-brief");
}
