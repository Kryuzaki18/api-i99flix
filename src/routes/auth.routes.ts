import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import bcrypt from "bcrypt";
import crypto from "crypto";

import { ROUTES } from "../config/app-routes.js";
import { EMAIL_REGEX } from "../constants/regex.constant.js";
import { ErrorBody } from "../schemas/shared.schema.js";
import {
  COOKIE_NAME,
  SALT_ROUNDS,
  THIRTY_DAYS_SECONDS,
  RESET_TOKEN_TTL_MS,
  TOKEN_EXPIRY_REMEMBER,
  TOKEN_EXPIRY_SESSION,
} from "../constants/auth.constant.js";
import User from "../schemas/users.schema.js";
import { createEmailService } from "../services/email.service.js";

const cookieOptions = (maxAgeSeconds?: number) => {
  return {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax' as const,
    path:     '/',
    ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds } : {}),
  };
};

const SignupSchema = {
  description:
    "Registers a new user. Validates email format, name/email uniqueness, and hashes the password with bcrypt before persisting.",
  tags: ["Authentication"],
  body: Type.Object({
    name: Type.String({
      minLength: 2,
      maxLength: 100,
    }),
    email: Type.String({
      minLength: 10,
      maxLength: 100,
      pattern: EMAIL_REGEX.source,
    }),
    password: Type.String({ minLength: 7 }),
  }),
  response: {
    201: Type.Object({ message: Type.String() }),
    400: ErrorBody,
    409: Type.Object({ error: Type.String(), field: Type.String() }),
    422: Type.Object({ error: Type.String() }),
  },
};

const MeSchema = {
  description:
    "Returns the current authenticated session payload. Requires a valid session cookie.",
  tags: ["Authentication"],
  security: [{ cookieAuth: [] }],
  response: {
    200: Type.Boolean(),
    401: Type.Object({ error: Type.String() }),
  },
};

const SigninSchema = {
  description:
    "Verifies user credentials by fetching account details and issues a secure httpOnly session cookie. " +
    "When rememberMe is true the cookie persists for 7 days; otherwise it is a session cookie.",
  tags: ["Authentication"],
  body: Type.Object({
    email: Type.String({
      minLength: 10,
      maxLength: 100,
      pattern: EMAIL_REGEX.source,
    }),
    password: Type.String({ minLength: 7 }),
    rememberMe: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: Type.Object({ message: Type.String() }),
    400: ErrorBody,
    401: Type.Object({ error: Type.String() }),
  },
};

const SignoutSchema = {
  description: "Clears the session cookie and terminates the current session.",
  tags: ["Authentication"],
  response: {
    200: Type.Object({ message: Type.String() }),
  },
};

const ForgotPasswordSchema = {
  description:
    "Accepts an email address and, if an account exists, stores a short-lived reset token. " +
    "Always returns 200 to prevent user enumeration.",
  tags: ["Authentication"],
  body: Type.Object({
    email: Type.String({
      minLength: 10,
      maxLength: 100,
      pattern: EMAIL_REGEX.source,
    }),
  }),
  response: {
    200: Type.Object({ message: Type.String() }),
    400: ErrorBody,
  },
};

const ResetPasswordSchema = {
  description:
    "Verifies the reset token and updates the user's password. " +
    "Token is single-use and expires after 1 hour.",
  tags: ["Authentication"],
  body: Type.Object({
    token: Type.String({ minLength: 1 }),
    password: Type.String({ minLength: 7 }),
  }),
  response: {
    200: Type.Object({ message: Type.String() }),
    400: ErrorBody,
  },
};

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  const mailer = createEmailService(fastify.config);

  fastify.post(
    ROUTES.SIGNUP,
    {
      schema: SignupSchema,
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { name, email, password } = request.body as {
        name: string;
        email: string;
        password: string;
      };

      if (!EMAIL_REGEX.test(email)) {
        return reply.code(422).send({ error: "Invalid email address format" });
      }

      const existingByEmail = await User.findOne({
        email: email.toLowerCase().trim(),
      }).lean();

      if (existingByEmail) {
        return reply
          .code(409)
          .send({ error: "Email address is already taken", field: "email" });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      try {
        await User.create({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
        });

        mailer
          .sendWelcome({ to: email.toLowerCase().trim(), name: name.trim() })
          .catch((err: Error) =>
            request.log.error(
              { err, message: err.message },
              "Failed to send welcome email",
            ),
          );

        return reply
          .code(201)
          .send({ message: "Account created successfully" });
      } catch (error: any) {
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern ?? {})[0] ?? "field";
          return reply.code(409).send({
            error: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken`,
            field,
          });
        }
        request.log.error(error);
        return reply.code(400).send({
          error: error.message || "Failed to create account",
          details: error.errors,
        });
      }
    },
  );

  fastify.get(ROUTES.ME, { schema: MeSchema }, async (request, reply) => {
    try {
      await request.jwtVerify();
      const { email } = request.user;

      if (email) {
        const user = await User.findOne({ email }).lean();
        if (!user) {
          return reply.code(401).send({ error: "Session expired or invalid" });
        }
        return reply.code(200).send(true);
      } else {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    } catch {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });

  fastify.post(
    ROUTES.SIGNIN,
    {
      schema: SigninSchema,
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      try {
        const { email, password, rememberMe } = request.body as {
          email: string;
          password: string;
          rememberMe?: boolean;
        };

        if (!EMAIL_REGEX.test(email)) {
          return reply
            .code(401)
            .send({ error: "Invalid email address format" });
        }

        const user = await User.findOne({
          email: email.toLowerCase().trim(),
        }).lean();

        const dummyHash =
          "$2b$12$invalidhashfortimingattackprevention000000000000000000";
        const passwordToCompare = user?.password ?? dummyHash;
        const isPasswordValid = await bcrypt.compare(
          password,
          passwordToCompare,
        );

        if (!user || !isPasswordValid) {
          return reply.code(400).send({ error: "Invalid email or password" });
        }

        const tokenExpiry = rememberMe ? TOKEN_EXPIRY_REMEMBER : TOKEN_EXPIRY_SESSION;
        const token = fastify.jwt.sign(
          { email: user.email },
          { expiresIn: tokenExpiry },
        );

        const options = rememberMe
          ? cookieOptions(THIRTY_DAYS_SECONDS)
          : cookieOptions(); 

        reply.setCookie(COOKIE_NAME, token, options);
        return reply.code(200).send({ message: "Signed in successfully" });
      } catch (error: any) {
        if (error.status && error.status >= 400 && error.status < 500) {
          return reply
            .code(401)
            .send({ error: error.details?.msg || "Invalid credentials." });
        }
        return reply.code(400).send({
          error: error.message || "Failed to sign in",
          details: error.details,
        });
      }
    },
  );

  fastify.post(
    ROUTES.SIGNOUT,
    { schema: SignoutSchema },
    async (_request, reply) => {
      reply.clearCookie(COOKIE_NAME, { path: '/' });
      return reply.code(200).send({ message: "Signed out successfully" });
    },
  );

  fastify.post(
    ROUTES.FORGOT_PASSWORD,
    {
      schema: ForgotPasswordSchema,
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const { email } = request.body as { email: string };

      if (!EMAIL_REGEX.test(email)) {
        return reply.code(400).send({ error: "Invalid email address format" });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });

      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

        user.resetToken = token;
        user.resetTokenExpiry = expiry;
        await user.save();

        const resetUrl = `${fastify.config.CLIENT_ORIGIN}/reset-password?token=${token}`;

        mailer
          .sendPasswordReset({
            to: user.email,
            name: user.name,
            resetUrl,
          })
          .catch((err: Error) =>
            request.log.error(
              { err, message: err.message },
              "Failed to send password reset email",
            ),
          );
      }

      return reply.code(200).send({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    },
  );

  fastify.post(
    ROUTES.RESET_PASSWORD,
    {
      schema: ResetPasswordSchema,
      config: { rateLimit: { max: 10, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const { token, password } = request.body as {
        token: string;
        password: string;
      };

      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() },
      });

      if (!user) {
        return reply
          .code(400)
          .send({ error: "Reset link is invalid or has expired." });
      }

      user.password = await bcrypt.hash(password, SALT_ROUNDS);
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();

      const changedAt =
        new Date().toLocaleString("en-US", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "UTC",
        }) + " UTC";

      mailer
        .sendPasswordChanged({
          to: user.email,
          name: user.name,
          email: user.email,
          changedAt,
        })
        .catch((err: Error) =>
          request.log.error(
            { err, message: err.message },
            "Failed to send password-changed email",
          ),
        );

      return reply
        .code(200)
        .send({ message: "Password updated successfully." });
    },
  );
};

export default authRoutes;
