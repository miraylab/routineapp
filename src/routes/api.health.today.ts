import { createFileRoute } from "@tanstack/react-router";

import {
  fetchIntervalsWellness,
  getSaoPauloDate,
  intervalsErrorResponse,
  normalizeWellness,
} from "@/lib/intervals";

export const Route = createFileRoute("/api/health/today")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const date = getSaoPauloDate();
          const wellness = await fetchIntervalsWellness(date);
          return Response.json(normalizeWellness(date, wellness));
        } catch (error) {
          return intervalsErrorResponse(error);
        }
      },
    },
  },
});
