const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

type RuntimeEnv = Record<string, unknown>;

let runtimeEnv: RuntimeEnv | null = null;

interface TravelTimeInput {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}

interface GoogleRoutesResponse {
  routes?: Array<{
    duration?: string;
    distanceMeters?: number;
  }>;
}

class TravelTimeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "TravelTimeError";
  }
}

export function setTravelTimeRuntimeEnv(env: unknown) {
  runtimeEnv = env && typeof env === "object" ? (env as RuntimeEnv) : null;
}

export async function fetchGoogleTravelTime(input: TravelTimeInput) {
  const apiKey = readServerEnv("GOOGLE_MAPS_API_KEY");

  if (!apiKey) {
    throw new TravelTimeError(
      "Variavel GOOGLE_MAPS_API_KEY obrigatoria para calcular tempo de rota.",
      500,
      "missing_google_maps_env",
    );
  }

  const response = await fetch(GOOGLE_ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: {
        location: {
          latLng: {
            latitude: input.originLat,
            longitude: input.originLng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: input.destinationLat,
            longitude: input.destinationLng,
          },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      languageCode: "pt-BR",
      units: "METRIC",
    }),
  });

  if (!response.ok) {
    throw new TravelTimeError(
      "Falha ao consultar a Routes API.",
      response.status,
      codeForStatus(response.status),
    );
  }

  const payload = (await response.json()) as GoogleRoutesResponse;
  const route = payload.routes?.[0];
  const seconds = parseDurationSeconds(route?.duration);

  if (!route || seconds === null) {
    throw new TravelTimeError(
      "A Routes API nao retornou uma rota valida.",
      502,
      "travel_time_empty_route",
    );
  }

  return {
    minutes: Math.max(1, Math.round(seconds / 60)),
    distanceMeters: route.distanceMeters ?? null,
    source: "google_routes" as const,
  };
}

export function travelTimeErrorResponse(error: unknown) {
  if (error instanceof TravelTimeError) {
    return Response.json(
      {
        available: false,
        code: error.code,
        message: error.message,
      },
      { status: error.status },
    );
  }

  return Response.json(
    {
      available: false,
      code: "travel_time_unknown_error",
      message: "Falha inesperada ao calcular tempo de rota.",
    },
    { status: 500 },
  );
}

function parseDurationSeconds(duration: string | undefined) {
  const match = duration?.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return null;
  return Number(match[1]);
}

function readServerEnv(key: string) {
  const runtimeValue = runtimeEnv?.[key];
  if (runtimeValue !== null && runtimeValue !== undefined && String(runtimeValue).trim() !== "") {
    return String(runtimeValue);
  }

  const processValue = process.env[key];
  if (processValue && processValue.trim() !== "") return processValue;

  return undefined;
}

function codeForStatus(status: number) {
  if (status === 400) return "google_routes_bad_request";
  if (status === 403) return "google_routes_forbidden";
  if (status === 429) return "google_routes_rate_limited";
  return "google_routes_request_failed";
}
