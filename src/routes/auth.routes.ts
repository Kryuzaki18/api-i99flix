import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import bcrypt from "bcrypt";

import { ROUTES } from "../config/app-routes.js";
import { EMAIL_REGEX } from "../constants/regex.constant.js";
import { ErrorBody } from "../schemas/shared.schema.js";
import {
  COOKIE_NAME,
  SALT_ROUNDS,
  SEVEN_DAYS_SECONDS,
} from "../constants/auth.constant.js";
import User from "../schemas/users.schema.js";

const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});

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
    "Verifies user credentials by fetching account details and issues a secure httpOnly session cookie.",
  tags: ["Authentication"],
  body: Type.Object({
    email: Type.String({
      minLength: 10,
      maxLength: 100,
      pattern: EMAIL_REGEX.source,
    }),
    password: Type.String({ minLength: 7 }),
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

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post(
    ROUTES.SIGNUP,
    { schema: SignupSchema },
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
      config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      try {
        const { email, password } = request.body as {
          email: string;
          password: string;
        };

        if (!EMAIL_REGEX.test(email)) {
          return reply
            .code(401)
            .send({ error: "Invalid email address format" });
        }

        const user = await User.findOne({
          email: email.toLowerCase().trim(),
        }).lean();

        // Constant-time comparison even on "not found" to prevent user enumeration.
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

        const token = fastify.jwt.sign(
          { email: user.email },
          { expiresIn: "7d" },
        );

        reply.setCookie(COOKIE_NAME, token, cookieOptions(SEVEN_DAYS_SECONDS));
        return reply.code(200).send({ message: "Signed in successfully" });
      } catch (error: any) {
        if (error.status && error.status >= 400 && error.status < 500) {
          return reply
            .code(401)
            .send({ error: error.details?.msg || "Invalid credentials." });
        }
        return reply
          .code(400)
          .send({
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
      reply.clearCookie(COOKIE_NAME, { path: "/" });
      return reply.code(200).send({ message: "Signed out successfully" });
    },
  );
};

export default authRoutes;
