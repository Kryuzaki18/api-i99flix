import type { FastifyRequest, FastifyReply } from "fastify";
import User from "../schemas/users.schema.js";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();

    const { email } = request.user as { email: string };
    const user = await User.findOne({ email }).lean();

    if (!user) {
      return reply.code(401).send({ error: "Session expired or invalid" });
    }

    if (!user.isVerified) {
      return reply.code(403).send({ error: "Email address not verified" });
    }
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
