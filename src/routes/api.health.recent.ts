import { createFileRoute } from "@tanstack/react-router";

import {
  fetchIntervalsWellnessRange,
  getSaoPauloDateRange,
  intervalsErrorResponse,
  normalizeWellnessRange,
} from "@/lib/intervals";

export const Route = createFileRoute("/api/health/recent")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { oldest, newest } = getSaoPauloDateRange(10);
          const wellness = await fetchIntervalsWellnessRange(oldest, newest);
          return Response.json(normalizeWellnessRange(oldest, newest, wellness));
        } catch (error) {
          return intervalsErrorResponse(error);
        }
      },
    },
  },
});
