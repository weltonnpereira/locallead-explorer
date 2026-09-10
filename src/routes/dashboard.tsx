import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/routes/index";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});
