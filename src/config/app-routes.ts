export const ROUTES = {
  HEALTH: "/health",

  SIGNUP:          "/signup",
  SIGNIN:          "/signin",
  SOCIAL_SIGNIN:   "/social-signin",
  SIGNOUT:         "/signout",
  ME:              "/me",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD:  "/reset-password",
  VERIFY_EMAIL:    "/verify-email",
  CHANGE_PASSWORD:    "/change-password",
  DELETE_ACCOUNT:     "/account",
  
  WATCHLIST:          "/watchlist",
  WATCHLIST_ITEM:     "/watchlist/:movieId",

  MOVIES:      "/movies",       
  MOVIE_BY_ID: "/movies/:id",  

  TMDB_MOVIES_POPULAR:         "/tmdb/movies/popular",
  TMDB_MOVIES_TOP_RATED:       "/tmdb/movies/top-rated",
  TMDB_MOVIES_NOW_PLAYING:     "/tmdb/movies/now-playing",
  TMDB_MOVIES_UPCOMING:        "/tmdb/movies/upcoming",
  TMDB_MOVIES_TRENDING:        "/tmdb/movies/trending",
  TMDB_MOVIES_DISCOVER:        "/tmdb/movies/discover",
  TMDB_MOVIES_SEARCH:          "/tmdb/movies/search",
  TMDB_MOVIE_BY_ID:            "/tmdb/movies/:id",
  TMDB_MOVIE_VIDEOS:           "/tmdb/movies/:id/videos",
  TMDB_MOVIE_CREDITS:          "/tmdb/movies/:id/credits",
  TMDB_MOVIE_SIMILAR:          "/tmdb/movies/:id/similar",
  TMDB_MOVIE_RECOMMENDATIONS:  "/tmdb/movies/:id/recommendations",

  TMDB_TV_POPULAR:             "/tmdb/tv/popular",
  TMDB_TV_TOP_RATED:           "/tmdb/tv/top-rated",
  TMDB_TV_ON_THE_AIR:          "/tmdb/tv/on-the-air",
  TMDB_TV_AIRING_TODAY:        "/tmdb/tv/airing-today",
  TMDB_TV_TRENDING:            "/tmdb/tv/trending",
  TMDB_TV_DISCOVER:            "/tmdb/tv/discover",
  TMDB_TV_SEARCH:              "/tmdb/tv/search",
  TMDB_TV_BY_ID:               "/tmdb/tv/:id",
  TMDB_TV_VIDEOS:              "/tmdb/tv/:id/videos",
  TMDB_TV_CREDITS:             "/tmdb/tv/:id/credits",
  TMDB_TV_SIMILAR:             "/tmdb/tv/:id/similar",
  TMDB_TV_RECOMMENDATIONS:     "/tmdb/tv/:id/recommendations",

  TMDB_SEARCH_MULTI:           "/tmdb/search",
  TMDB_GENRES_MOVIE:           "/tmdb/genres/movie",
  TMDB_GENRES_TV:              "/tmdb/genres/tv",

  TMDB_SHOWCASE:               "/tmdb/showcase"
};
