/**
 * Reusable preHandler hook that verifies the JWT session cookie.
 * Attach to any route that requires authentication.
 *
 * Usage:
 *   fastify.get('/protected', { preHandler: [requireAuth] }, handler)
 */

import type { FastifyRequest, FastifyReply } from "fastify";

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
