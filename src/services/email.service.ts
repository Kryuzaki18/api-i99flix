/**
 * Email service — Nodemailer wrapper for 99Flix transactional emails.
 *
 * Reads SMTP credentials from the app config and sends HTML emails
 * using pre-built templates stored in src/templates/.
 *
 * Template variables are replaced via simple {{KEY}} interpolation so
 * there is no extra templating dependency.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *   import { createEmailService } from '../services/email.service.js';
 *   const mailer = createEmailService(app.config);
 *   await mailer.sendWelcome({ to: 'user@example.com', name: 'Alice' });
 *   await mailer.sendPasswordReset({ to: 'user@example.com', name: 'Alice', resetUrl: '...' });
 */

import nodemailer, { type Transporter } from "nodemailer";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ── Resolve template directory relative to this file ─────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const TEMPLATES  = join(__dirname, "../templates");

// ── Template loader ───────────────────────────────────────────────────────────

function loadTemplate(filename: string): string {
  return readFileSync(join(TEMPLATES, filename), "utf-8");
}

function render(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template,
  );
}

// ── Config shape (subset of FastifyInstance["config"]) ───────────────────────

export interface EmailConfig {
  SMTP_HOST:     string;
  SMTP_PORT:     number;
  SMTP_SECURE:   boolean;
  SMTP_USER:     string;
  SMTP_PASS:     string;
  EMAIL_FROM:    string;
  CLIENT_ORIGIN: string;
}

// ── Payload types ─────────────────────────────────────────────────────────────

export interface WelcomeEmailPayload {
  to:   string;
  name: string;
}

export interface PasswordResetEmailPayload {
  to:       string;
  name:     string;
  resetUrl: string;
}

export interface PasswordChangedEmailPayload {
  to:        string;
  name:      string;
  email:     string;
  changedAt: string;
}

// ── Service factory ───────────────────────────────────────────────────────────

export interface EmailService {
  sendWelcome(payload: WelcomeEmailPayload): Promise<void>;
  sendPasswordReset(payload: PasswordResetEmailPayload): Promise<void>;
  sendPasswordChanged(payload: PasswordChangedEmailPayload): Promise<void>;
}

export function createEmailService(config: EmailConfig): EmailService {
  const transporter: Transporter = nodemailer.createTransport({
    host:   config.SMTP_HOST,
    port:   config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
    tls: {
      // Allow self-signed certs in dev; in production this is fine since
      // Gmail/SendGrid use valid certs anyway.
      rejectUnauthorized: false,
    },
  });

  // Load templates once at service creation time
  const welcomeTemplate           = loadTemplate("welcome.template.html");
  const resetPasswordTemplate     = loadTemplate("reset-password.template.html");
  const passwordChangedTemplate   = loadTemplate("password-changed.template.html");

  return {
    /**
     * Sends the "Account created" welcome email.
     */
    async sendWelcome({ to, name }: WelcomeEmailPayload): Promise<void> {
      const html = render(welcomeTemplate, {
        NAME:          name,
        CLIENT_ORIGIN: config.CLIENT_ORIGIN,
      });

      await transporter.sendMail({
        from:    config.EMAIL_FROM,
        to,
        subject: "Welcome to 99Flix 🎬 — Your account is ready",
        html,
      });
    },

    /**
     * Sends the "Reset your password" email containing the reset link.
     */
    async sendPasswordReset({ to, name, resetUrl }: PasswordResetEmailPayload): Promise<void> {
      const html = render(resetPasswordTemplate, {
        NAME:          name,
        RESET_URL:     resetUrl,
        CLIENT_ORIGIN: config.CLIENT_ORIGIN,
      });

      await transporter.sendMail({
        from:    config.EMAIL_FROM,
        to,
        subject: "Reset your 99Flix password 🔑",
        html,
      });
    },

    /**
     * Sends the "Password changed" confirmation email after a successful reset.
     */
    async sendPasswordChanged({ to, name, email, changedAt }: PasswordChangedEmailPayload): Promise<void> {
      const html = render(passwordChangedTemplate, {
        NAME:          name,
        EMAIL:         email,
        CHANGED_AT:    changedAt,
        CLIENT_ORIGIN: config.CLIENT_ORIGIN,
      });

      await transporter.sendMail({
        from:    config.EMAIL_FROM,
        to,
        subject: "Your 99Flix password was changed 🔐",
        html,
      });
    },
  };
}
