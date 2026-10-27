import { requireAuth } from "@/lib/requireAuth";
import { createFileRoute } from "@tanstack/react-router";
import StrategiesPage from "@/components/strategies/StrategiesPage";

export const Route = createFileRoute("/")({
  beforeLoad: requireAuth,
  component: StrategiesPage,
});
