import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { ROUTES } from "../config/app-routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const TEMPLATES  = join(__dirname, "../templates");

const baseStyles = readFileSync(join(TEMPLATES, "base.styles.css"), "utf-8");

function loadTemplate(filename: string): string {
  return readFileSync(join(TEMPLATES, filename), "utf-8")
    .replaceAll("{{BASE_STYLES}}", baseStyles);
}

function render(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template,
  );
}

const SAMPLE: Record<string, string> = {
  NAME:          "Jane Doe",
  EMAIL:         "jane.doe@example.com",
  LOGO_URL:      "/i99flix-logo.png",
  CLIENT_ORIGIN: "http://localhost:5173",
  VERIFY_URL:    "http://localhost:5173/verify-email?token=sample-token-abc123",
  RESET_URL:     "http://localhost:5173/reset-password?token=sample-token-abc123",
  CHANGED_AT:    new Date().toUTCString(),
};

const TEMPLATES_MAP: Record<string, string> = {
  welcome:          "welcome.template.html",
  "verify-email":   "verify-email.template.html",
  "reset-password": "reset-password.template.html",
  "password-changed": "password-changed.template.html",
};

const devRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get<{ Params: { template: string } }>(ROUTES.DEV_EMAIL_TEMPLATE,
    async (request, reply) => {
      const { template } = request.params;
      const filename = TEMPLATES_MAP[template];

      if (!filename) {
        return reply.code(404).send(
          `Unknown template "${template}". Available: ${Object.keys(TEMPLATES_MAP).join(", ")}`,
        );
      }

      const html = render(loadTemplate(filename), SAMPLE);
      return reply.code(200).header("Content-Type", "text/html; charset=utf-8").send(html);
    },
  );
};

export default devRoutes;
