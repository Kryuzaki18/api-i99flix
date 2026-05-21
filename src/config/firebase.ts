import admin from "firebase-admin";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

export default fp(async function firebaseAdmin(fastify: FastifyInstance) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: fastify.config.FIREBASE_PROJECT_ID,
    });
  }

  fastify.decorate(
    "verifyFirebaseToken",
    async (idToken: string): Promise<admin.auth.DecodedIdToken> => {
      return admin.auth().verifyIdToken(idToken);
    },
  );
});

declare module "fastify" {
  interface FastifyInstance {
    verifyFirebaseToken: (idToken: string) => Promise<admin.auth.DecodedIdToken>;
  }
}
