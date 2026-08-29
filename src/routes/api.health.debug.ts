import { createFileRoute } from "@tanstack/react-router";

import {
  fetchIntervalsWellness,
  getSaoPauloDate,
  intervalsErrorResponse,
  normalizeWellness,
} from "@/lib/intervals";

export const Route = createFileRoute("/api/health/debug")({
  server: {
    handlers: {
      GET: async () => {
        try {
          if (
            process.env.NODE_ENV === "production" &&
            process.env.HEALTH_DEBUG_ENABLED !== "true"
          ) {
            return Response.json(
              {
                available: false,
                error: "health_debug_disabled",
                message: "Endpoint de debug disponivel apenas em desenvolvimento.",
              },
              { status: 404 },
            );
          }

          const date = getSaoPauloDate();
          const wellness = await fetchIntervalsWellness(date);
          return Response.json(normalizeWellness(date, wellness, true));
        } catch (error) {
          return intervalsErrorResponse(error);
        }
      },
    },
  },
});
