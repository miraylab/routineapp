import { createFileRoute } from "@tanstack/react-router";

import { fetchGoogleTravelTime, travelTimeErrorResponse } from "@/lib/travelTime";

export const Route = createFileRoute("/api/travel-time")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const originLat = readCoordinate(url, "originLat");
          const originLng = readCoordinate(url, "originLng");
          const destinationLat = readCoordinate(url, "destinationLat");
          const destinationLng = readCoordinate(url, "destinationLng");

          const route = await fetchGoogleTravelTime({
            originLat,
            originLng,
            destinationLat,
            destinationLng,
          });

          return Response.json({ available: true, ...route });
        } catch (error) {
          return travelTimeErrorResponse(error);
        }
      },
    },
  },
});

function readCoordinate(url: URL, key: string) {
  const value = Number(url.searchParams.get(key));
  if (!Number.isFinite(value)) {
    throw new Error(`Parametro ${key} invalido.`);
  }
  return value;
}
