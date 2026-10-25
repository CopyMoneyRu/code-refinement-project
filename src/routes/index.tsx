import { createFileRoute } from "@tanstack/react-router";
import StrategiesPage from "@/components/strategies/StrategiesPage";

export const Route = createFileRoute("/")({
  component: StrategiesPage,
});
