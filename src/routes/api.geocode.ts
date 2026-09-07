import { createFileRoute } from "@tanstack/react-router";

import { fetchGoogleGeocode, geocodingErrorResponse } from "@/lib/geocoding";

export const Route = createFileRoute("/api/geocode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const address = url.searchParams.get("address") ?? "";
          const result = await fetchGoogleGeocode(address);

          return Response.json({ available: true, ...result });
        } catch (error) {
          return geocodingErrorResponse(error);
        }
      },
    },
  },
});
