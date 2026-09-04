import { createFileRoute } from "@tanstack/react-router";

import {
  fetchRoutineBlocks,
  routineCalendarErrorResponse,
} from "@/lib/routineCalendar";

export const Route = createFileRoute("/api/routine/week")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const start = url.searchParams.get("start") ?? currentDateKey();
          const days = Number(url.searchParams.get("days") ?? 8);
          const blocks = await fetchRoutineBlocks(start, days);
          return Response.json({ available: true, source: "google_calendar", blocks });
        } catch (error) {
          return routineCalendarErrorResponse(error);
        }
      },
    },
  },
});

function currentDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
