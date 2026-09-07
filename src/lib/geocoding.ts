const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

type RuntimeEnv = Record<string, unknown>;

let runtimeEnv: RuntimeEnv | null = null;

const geocodeCache = new Map<string, GeocodeResult>();

export interface GeocodeResult {
  address: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId?: string;
}

interface GoogleGeocodingResponse {
  status?: string;
  error_message?: string;
  results?: Array<{
    formatted_address?: string;
    place_id?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
}

class GeocodingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "GeocodingError";
  }
}

export function setGeocodingRuntimeEnv(env: unknown) {
  runtimeEnv = env && typeof env === "object" ? (env as RuntimeEnv) : null;
}

export async function fetchGoogleGeocode(address: string): Promise<GeocodeResult> {
  const normalizedAddress = address.trim();
  if (normalizedAddress.length < 4) {
    throw new GeocodingError("Endereco muito curto para geocodificar.", 400, "geocode_invalid_address");
  }

  const cached = geocodeCache.get(normalizedAddress.toLowerCase());
  if (cached) return cached;

  const apiKey = readServerEnv("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    throw new GeocodingError(
      "Variavel GOOGLE_MAPS_API_KEY obrigatoria para geocodificar endereco.",
      500,
      "missing_google_maps_env",
    );
  }

  const url = new URL(GOOGLE_GEOCODING_URL);
  url.searchParams.set("address", normalizedAddress);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "br");

  const response = await fetch(url, { headers: { accept: "application/json" } });

  if (!response.ok) {
    throw new GeocodingError(
      "Falha ao consultar a Geocoding API.",
      response.status,
      codeForStatus(response.status),
    );
  }

  const payload = (await response.json()) as GoogleGeocodingResponse;
  if (payload.status !== "OK") {
    throw new GeocodingError(
      payload.error_message || "A Geocoding API nao encontrou esse endereco.",
      payload.status === "ZERO_RESULTS" ? 404 : 502,
      payload.status ? `google_geocode_${payload.status.toLowerCase()}` : "google_geocode_failed",
    );
  }

  const firstResult = payload.results?.[0];
  const location = firstResult?.geometry?.location;
  if (typeof location?.lat !== "number" || typeof location.lng !== "number") {
    throw new GeocodingError(
      "A Geocoding API nao retornou coordenadas validas.",
      502,
      "google_geocode_empty_coordinates",
    );
  }

  const result = {
    address: normalizedAddress,
    formattedAddress: firstResult?.formatted_address ?? normalizedAddress,
    latitude: location.lat,
    longitude: location.lng,
    placeId: firstResult?.place_id,
  };

  geocodeCache.set(normalizedAddress.toLowerCase(), result);
  return result;
}

export function geocodingErrorResponse(error: unknown) {
  if (error instanceof GeocodingError) {
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
      code: "geocode_unknown_error",
      message: "Falha inesperada ao geocodificar endereco.",
    },
    { status: 500 },
  );
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
  if (status === 400) return "google_geocode_bad_request";
  if (status === 403) return "google_geocode_forbidden";
  if (status === 429) return "google_geocode_rate_limited";
  return "google_geocode_request_failed";
}
