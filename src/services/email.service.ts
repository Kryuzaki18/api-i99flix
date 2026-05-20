

import nodemailer, { type Transporter } from "nodemailer";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const TEMPLATES  = join(__dirname, "../templates");

function loadTemplate(filename: string): string {
  return readFileSync(join(TEMPLATES, filename), "utf-8");
}

function render(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template,
  );
}

export interface EmailConfig {
  SMTP_HOST:     string;
  SMTP_PORT:     number;
  SMTP_SECURE:   boolean;
  SMTP_USER:     string;
  SMTP_PASS:     string;
  EMAIL_FROM:    string;
  CLIENT_ORIGIN: string;
  LOGO_URL:      string;
}

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

export interface VerificationEmailPayload {
  to:        string;
  name:      string;
  verifyUrl: string;
}

export interface EmailService {
  sendWelcome(payload: WelcomeEmailPayload): Promise<void>;
  sendVerificationEmail(payload: VerificationEmailPayload): Promise<void>;
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
      rejectUnauthorized: false,
    },
  });

  // Verify SMTP connection at startup so misconfiguration surfaces in logs immediately
  transporter.verify().then(() => {
    console.log("[Mailer] SMTP connection verified");
  }).catch((err: Error) => {
    console.error("[Mailer] SMTP connection FAILED — emails will not be sent:", err.message);
  });

  const welcomeTemplate           = loadTemplate("welcome.template.html");
  const verifyEmailTemplate       = loadTemplate("verify-email.template.html");
  const resetPasswordTemplate     = loadTemplate("reset-password.template.html");
  const passwordChangedTemplate   = loadTemplate("password-changed.template.html");

  return {

    async sendWelcome({ to, name }: WelcomeEmailPayload): Promise<void> {
      const html = render(welcomeTemplate, {
        NAME:          name,
        LOGO_URL:      config.LOGO_URL,
        CLIENT_ORIGIN: config.CLIENT_ORIGIN,
      });

      await transporter.sendMail({
        from:    config.EMAIL_FROM,
        to,
        subject: "Welcome to i99flix 🎬 — Your account is ready",
        html,
      });
    },

    async sendVerificationEmail({ to, name, verifyUrl }: VerificationEmailPayload): Promise<void> {
      const html = render(verifyEmailTemplate, {
        NAME:          name,
        VERIFY_URL:    verifyUrl,
        LOGO_URL:      config.LOGO_URL,
        CLIENT_ORIGIN: config.CLIENT_ORIGIN,
      });

      await transporter.sendMail({
        from:    config.EMAIL_FROM,
        to,
        subject: "Verify your i99flix email address ✉️",
        html,
      });
    },

    async sendPasswordReset({ to, name, resetUrl }: PasswordResetEmailPayload): Promise<void> {
      const html = render(resetPasswordTemplate, {
        NAME:          name,
        RESET_URL:     resetUrl,
        LOGO_URL:      config.LOGO_URL,
        CLIENT_ORIGIN: config.CLIENT_ORIGIN,
      });

      await transporter.sendMail({
        from:    config.EMAIL_FROM,
        to,
        subject: "Reset your i99flix password 🔑",
        html,
      });
    },

    async sendPasswordChanged({ to, name, email, changedAt }: PasswordChangedEmailPayload): Promise<void> {
      const html = render(passwordChangedTemplate, {
        NAME:          name,
        EMAIL:         email,
        CHANGED_AT:    changedAt,
        LOGO_URL:      config.LOGO_URL,
        CLIENT_ORIGIN: config.CLIENT_ORIGIN,
      });

      await transporter.sendMail({
        from:    config.EMAIL_FROM,
        to,
        subject: "Your i99flix password was changed 🔐",
        html,
      });
    },
  };
}
