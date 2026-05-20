

import { request as undiciRequest } from "undici";
import { TMDB_BASE_URL } from "../config/tmdb.js";

export interface TmdbRequestOptions {

  path:   string;

  params?: Record<string, string | number | boolean | undefined>;
}

export interface TmdbError {
  status_message: string;
  status_code:    number;
  success:        false;
}

function buildAuthHeaders(key: string): Record<string, string> {
  if (key.startsWith("eyJ")) {
    return { Authorization: `Bearer ${key}` };
  }

  return {};
}

function buildUrl(
  path:    string,
  params:  Record<string, string | number | boolean | undefined>,
  key:     string,
): string {
  const url = new URL(`${TMDB_BASE_URL}${path}`);

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

export function createTmdbService(apiKey: string) {
  const headers = {
    ...buildAuthHeaders(apiKey),
    "Content-Type": "application/json",
    Accept:         "application/json",
  };

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
