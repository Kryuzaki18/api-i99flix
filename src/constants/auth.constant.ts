export const COOKIE_NAME = "session";
export const SALT_ROUNDS = 12;
export const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

/** Password-reset token TTL: 1 hour in milliseconds */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** JWT expiry strings used when signing tokens */
export const TOKEN_EXPIRY_REMEMBER    = "7d";
export const TOKEN_EXPIRY_SESSION     = "1d";