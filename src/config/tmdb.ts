/**
 * TMDB API configuration constants.
 *
 * Authentication uses the API Read Access Token (Bearer) as recommended
 * by TMDB for server-side integrations — more secure than passing the
 * API key as a query parameter.
 *
 * Docs: https://developer.themoviedb.org/docs/authentication-application
 */

export const TMDB_BASE_URL   = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/** Standard poster/backdrop sizes offered by TMDB */
export const TMDB_IMAGE_SIZES = {
  poster:   "w500",
  backdrop: "w1280",
  original: "original",
} as const;

export const TMDB_ROUTES = {
  // Movies
  MOVIE_POPULAR:       "/movie/popular",
  MOVIE_TOP_RATED:     "/movie/top_rated",
  MOVIE_NOW_PLAYING:   "/movie/now_playing",
  MOVIE_UPCOMING:      "/movie/upcoming",
  MOVIE_TRENDING:      "/trending/movie/week",
  MOVIE_DETAIL:        "/movie/:id",
  MOVIE_VIDEOS:        "/movie/:id/videos",
  MOVIE_CREDITS:       "/movie/:id/credits",
  MOVIE_SIMILAR:       "/movie/:id/similar",
  MOVIE_RECOMMENDATIONS: "/movie/:id/recommendations",
  MOVIE_DISCOVER:      "/discover/movie",
  MOVIE_SEARCH:        "/search/movie",

  // TV Series
  TV_POPULAR:          "/tv/popular",
  TV_TOP_RATED:        "/tv/top_rated",
  TV_ON_THE_AIR:       "/tv/on_the_air",
  TV_AIRING_TODAY:     "/tv/airing_today",
  TV_TRENDING:         "/trending/tv/week",
  TV_DETAIL:           "/tv/:id",
  TV_VIDEOS:           "/tv/:id/videos",
  TV_CREDITS:          "/tv/:id/credits",
  TV_SIMILAR:          "/tv/:id/similar",
  TV_RECOMMENDATIONS:  "/tv/:id/recommendations",
  TV_DISCOVER:         "/discover/tv",
  TV_SEARCH:           "/search/tv",

  // Shared
  SEARCH_MULTI:        "/search/multi",
  GENRES_MOVIE:        "/genre/movie/list",
  GENRES_TV:           "/genre/tv/list",
} as const;
