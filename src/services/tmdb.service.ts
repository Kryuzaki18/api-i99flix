/**
 * TMDB Service
 *
 * Thin wrapper around the TMDB API v3 using the native `undici` fetch
 * (already a project dependency — no new packages needed).
 *
 * Authentication: Bearer token (API Read Access Token) sent via the
 * Authorization header — the recommended server-side approach per TMDB docs.
 * https://developer.themoviedb.org/docs/authentication-application
 *
 * The TMDB_KEY env var must be the Read Access Token (starts with "eyJ…"),
 * NOT the short API key. If you only have the short key, set it as
 * TMDB_KEY and the service will fall back to ?api_key= query param auth.
 */

import { request as undiciRequest } from "undici";
import { TMDB_BASE_URL } from "../config/tmdb.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TmdbRequestOptions {
  /** Path relative to TMDB_BASE_URL, e.g. "/movie/popular" */
  path:   string;
  /** Query params forwarded to TMDB */
  params?: Record<string, string | number | boolean | undefined>;
}

export interface TmdbError {
  status_message: string;
  status_code:    number;
  success:        false;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Determine auth strategy from the key format.
 * JWT-style tokens (Read Access Token) start with "eyJ".
 * Short API keys are 32-char hex strings.
 */
function buildAuthHeaders(key: string): Record<string, string> {
  if (key.startsWith("eyJ")) {
    return { Authorization: `Bearer ${key}` };
  }
  // Fallback: short API key — appended as query param in buildUrl
  return {};
}

function buildUrl(
  path:    string,
  params:  Record<string, string | number | boolean | undefined>,
  key:     string,
): string {
  const url = new URL(`${TMDB_BASE_URL}${path}`);

  // Append short API key as query param if not using Bearer
  if (!key.startsWith("eyJ")) {
    url.searchParams.set("api_key", key);
  }

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  return url.toString();
}

// ── Service factory ───────────────────────────────────────────────────────────

export function createTmdbService(apiKey: string) {
  const headers = {
    ...buildAuthHeaders(apiKey),
    "Content-Type": "application/json",
    Accept:         "application/json",
  };

  /**
   * Core fetch wrapper. Throws a structured error on non-2xx responses.
   */
  async function tmdbFetch<T>(options: TmdbRequestOptions): Promise<T> {
    const url = buildUrl(options.path, options.params ?? {}, apiKey);

    const { statusCode, body } = await undiciRequest(url, {
      method:  "GET",
      headers,
    });

    const json = await body.json() as T | TmdbError;

    if (statusCode < 200 || statusCode >= 300) {
      const err = json as TmdbError;
      throw Object.assign(
        new Error(err.status_message ?? "TMDB request failed"),
        { statusCode, tmdbCode: err.status_code },
      );
    }

    return json as T;
  }

  // ── Movies ──────────────────────────────────────────────────────────────────

  const movies = {
    popular:     (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/movie/popular",     params: params as never }),

    topRated:    (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/movie/top_rated",   params: params as never }),

    nowPlaying:  (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/movie/now_playing", params: params as never }),

    upcoming:    (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/movie/upcoming",    params: params as never }),

    trending:    (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/trending/movie/week", params: params as never }),

    discover:    (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/discover/movie",    params: params as never }),

    search:      (params: Record<string, unknown>) =>
      tmdbFetch({ path: "/search/movie",      params: params as never }),

    detail:      (id: number, params?: Record<string, unknown>) =>
      tmdbFetch({ path: `/movie/${id}`,       params: params as never }),

    videos:      (id: number, params?: Record<string, unknown>) =>
      tmdbFetch({ path: `/movie/${id}/videos`,       params: params as never }),

    credits:     (id: number, params?: Record<string, unknown>) =>
      tmdbFetch({ path: `/movie/${id}/credits`,      params: params as never }),

    similar:     (id: number, params?: Record<string, unknown>) =>
      tmdbFetch({ path: `/movie/${id}/similar`,      params: params as never }),

    recommendations: (id: number, params?: Record<string, unknown>) =>
      tmdbFetch({ path: `/movie/${id}/recommendations`, params: params as never }),
  };

  // ── TV Series ───────────────────────────────────────────────────────────────

  const tv = {
    popular:     (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/tv/popular",        params: params as never }),

    topRated:    (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/tv/top_rated",      params: params as never }),

    onTheAir:    (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/tv/on_the_air",     params: params as never }),

    airingToday: (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/tv/airing_today",   params: params as never }),

    trending:    (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/trending/tv/week",  params: params as never }),

    discover:    (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/discover/tv",       params: params as never }),

    search:      (params: Record<string, unknown>) =>
      tmdbFetch({ path: "/search/tv",         params: params as never }),

    detail:      (id: number, params?: Record<string, unknown>) =>
      tmdbFetch({ path: `/tv/${id}`,          params: params as never }),

    videos:      (id: number, params?: Record<string, unknown>) =>
      tmdbFetch({ path: `/tv/${id}/videos`,          params: params as never }),

    credits:     (id: number, params?: Record<string, unknown>) =>
      tmdbFetch({ path: `/tv/${id}/credits`,         params: params as never }),

    similar:     (id: number, params?: Record<string, unknown>) =>
      tmdbFetch({ path: `/tv/${id}/similar`,         params: params as never }),

    recommendations: (id: number, params?: Record<string, unknown>) =>
      tmdbFetch({ path: `/tv/${id}/recommendations`, params: params as never }),
  };

  // ── Shared ──────────────────────────────────────────────────────────────────

  const shared = {
    searchMulti: (params: Record<string, unknown>) =>
      tmdbFetch({ path: "/search/multi", params: params as never }),

    genresMovie: (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/genre/movie/list", params: params as never }),

    genresTv:    (params?: Record<string, unknown>) =>
      tmdbFetch({ path: "/genre/tv/list",    params: params as never }),
  };

  return { movies, tv, shared };
}

export type TmdbService = ReturnType<typeof createTmdbService>;
