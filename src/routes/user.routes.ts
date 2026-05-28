import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import bcrypt from "bcrypt";

import { ROUTES } from "../config/app-routes.js";
import { ErrorBody } from "../schemas/shared.schema.js";
import { SALT_ROUNDS, COOKIE_NAME } from "../constants/auth.constant.js";
import User from "../schemas/users.schema.js";

const ChangePasswordSchema = {
  description: "Changes the authenticated user's password. Requires the current password for verification.",
  tags: ["User"],
  security: [{ cookieAuth: [] }],
  body: Type.Object({
    oldPassword: Type.String({ minLength: 1 }),
    newPassword: Type.String({ minLength: 7 }),
  }),
  response: {
    200: Type.Object({ message: Type.String() }),
    400: ErrorBody,
    401: Type.Object({ error: Type.String() }),
  },
};

const DeleteAccountSchema = {
  description: "Permanently deletes the authenticated user's account after password confirmation.",
  tags: ["User"],
  security: [{ cookieAuth: [] }],
  body: Type.Object({
    password: Type.String({ minLength: 1 }),
  }),
  response: {
    200: Type.Object({ message: Type.String() }),
    400: ErrorBody,
    401: Type.Object({ error: Type.String() }),
  },
};

const userRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  fastify.put(
    ROUTES.CHANGE_PASSWORD,
    { schema: ChangePasswordSchema },
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const { email } = request.user;
        const { oldPassword, newPassword } = request.body as {
          oldPassword: string;
          newPassword: string;
        };

        const user = await User.findOne({ email });
        if (!user) return reply.code(401).send({ error: "Unauthorized" });

        const isSocialAccount = user.password.startsWith("__social__");
        if (isSocialAccount) {
          return reply.code(400).send({
            error: "Social sign-in accounts cannot change their password here.",
          });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
          return reply.code(400).send({ error: "Current password is incorrect." });
        }

        if (oldPassword === newPassword) {
          return reply.code(400).send({
            error: "New password must be different from your current password.",
          });
        }

        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.save();

        return reply.code(200).send({ message: "Password updated successfully." });
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );

  fastify.delete(
    ROUTES.DELETE_ACCOUNT,
    { schema: DeleteAccountSchema },
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const { email } = request.user;
        const { password } = request.body as { password: string };

        const user = await User.findOne({ email });
        if (!user) return reply.code(401).send({ error: "Unauthorized" });

        const isSocialAccount = user.password.startsWith("__social__");

        if (!isSocialAccount) {
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return reply.code(400).send({ error: "Password is incorrect." });
          }
        }

        await User.updateOne({ email }, { isDeleted: true, deletedAt: new Date() });

        reply.clearCookie(COOKIE_NAME, { path: "/" });
        return reply.code(200).send({ message: "Account deleted successfully." });
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );
};

export default userRoutes;
