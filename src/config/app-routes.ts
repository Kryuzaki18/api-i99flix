export const ROUTES = {
  // System
  HEALTH: "/health",

  // Auth
  SIGNUP:          "/signup",
  SIGNIN:          "/signin",
  SIGNOUT:         "/signout",
  ME:              "/me",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD:  "/reset-password",

  // Movies — CRUD
  MOVIES:      "/movies",       // GET (list) + POST (create)
  MOVIE_BY_ID: "/movies/:id",  // GET (one) + PUT (update) + DELETE
};
