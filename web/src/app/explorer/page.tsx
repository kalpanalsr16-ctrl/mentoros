import { redirect } from "next/navigation";

/**
 * The Architecture Explorer moved into the AI showcase (Phase A). Kept as a
 * redirect so existing links keep working. The target route enforces
 * ai_showcase_access itself, so this redirect grants nothing.
 */
export default function ExplorerRedirect() {
  redirect("/showcase/flight-recorder");
}
