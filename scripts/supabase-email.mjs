// Configures Supabase Auth email: Resend SMTP, rate limit and the branded, bilingual (EN / FR-CA) templates.
//   node scripts/supabase-email.mjs            → apply
//   node scripts/supabase-email.mjs --preview  → write rendered previews to ./email-preview/ (no API calls)
// Reads RESEND_API_KEY from .env and SUPABASE_ACCESS_TOKEN from .env.supabase (both git-ignored).
//
// Links: the app passes `emailRedirectTo = <origin>/auth/confirm?next=…` (src/lib/origin.ts emailLinkTarget), so the
// templates append `&token_hash=…&type=…` to {{ .RedirectTo }} — token-hash verification works on any device.
// Language: user_metadata.locale ("fr" | "en"), set at sign-up and refreshed at login.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const PROJECT_REF = "yvateuufdvxmaowgcjch";
const SITE = "https://www.wagstays.ca";
const LOGO = `${SITE}/brand/wagstays-logo-192.png`;
const SENDER = { email: "no-reply@wagstays.ca", name: "WagStays" };

const env = (file, key) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8").match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");

// {{ if eq (printf "%v" .Data.locale) "fr" }} works even when the user has no metadata (prints "<no value>")
const L = (en, fr) => `{{ if eq (printf "%v" .Data.locale) "fr" }}${fr}{{ else }}${en}{{ end }}`;

const C = {
  bg: "#FFF8F4",
  card: "#FFFFFF",
  ink: "#221A12",
  muted: "#53483E",
  line: "#EFE7DE",
  button: "#A23E24",
  green: "#226150",
};
const FONT = `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

function layout({ preheader, title, intro, button, link, after, note }) {
  const btn = button
    ? `<tr><td align="center" style="padding:8px 0 24px">
         <a href="${link}" style="display:inline-block;background:${C.button};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;line-height:48px;height:48px;padding:0 32px;border-radius:999px;font-family:${FONT}">${button}</a>
       </td></tr>
       <tr><td style="font-size:13px;line-height:20px;color:${C.muted};padding:0 0 8px">${L("Button not working? Copy this link into your browser:", "Le bouton ne fonctionne pas? Copiez ce lien dans votre navigateur :")}</td></tr>
       <tr><td style="font-size:12px;line-height:18px;word-break:break-all;padding:0 0 24px"><a href="${link}" style="color:${C.green}">${link}</a></td></tr>`
    : "";
  return `<!doctype html>
<html lang="{{ if eq (printf "%v" .Data.locale) "fr" }}fr-CA{{ else }}en-CA{{ end }}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td align="center" style="padding:0 0 24px">
        <a href="${SITE}" style="text-decoration:none"><img src="${LOGO}" width="174" height="40" alt="WagStays" style="display:block;border:0;height:40px;width:174px"></a>
      </td></tr>
      <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:24px;padding:32px 28px;font-family:${FONT};color:${C.ink}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:24px;line-height:32px;font-weight:800;color:${C.ink};padding:0 0 12px">${title}</td></tr>
          <tr><td style="font-size:16px;line-height:26px;color:${C.muted};padding:0 0 24px">${intro}</td></tr>
          ${btn}
          ${after ? `<tr><td style="font-size:15px;line-height:24px;color:${C.muted};padding:0 0 16px">${after}</td></tr>` : ""}
          <tr><td style="border-top:1px solid ${C.line};padding:16px 0 0;font-size:13px;line-height:20px;color:${C.muted}">${note}</td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:24px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted}">
        WagStays Technologies Inc. · Toronto, Ontario<br>
        <a href="${SITE}{{ if eq (printf "%v" .Data.locale) "fr" }}/fr{{ end }}/privacy" style="color:${C.muted}">${L("Privacy Policy", "Politique de confidentialité")}</a>
        &nbsp;·&nbsp;
        <a href="${SITE}{{ if eq (printf "%v" .Data.locale) "fr" }}/fr{{ end }}/account/support/new" style="color:${C.muted}">${L("Help & Support", "Aide et soutien")}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const hi = L(`Hi{{ if .Data.firstName }} {{ .Data.firstName }}{{ end }},`, `Bonjour{{ if .Data.firstName }} {{ .Data.firstName }}{{ end }},`);
const ignore = L("Didn't ask for this? You can safely ignore this email.", "Vous n'avez rien demandé? Vous pouvez ignorer ce courriel en toute sécurité.");
const expires = L("For your security, this link expires in 1 hour and can be used once.", "Pour votre sécurité, ce lien expire dans 1 heure et ne peut être utilisé qu'une fois.");
const link = (type) => `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=${type}`;

const TEMPLATES = {
  confirmation: {
    subject: L("Confirm your WagStays account", "Confirmez votre compte WagStays"),
    content: layout({
      preheader: L("One click and you're in — welcome to WagStays.", "Un clic et c'est parti — bienvenue chez WagStays."),
      title: L("Welcome to WagStays! 🐾", "Bienvenue chez WagStays! 🐾"),
      intro: `${hi}<br>${L("Thanks for signing up. Please confirm your email address to finish creating your account.", "Merci de vous être inscrit. Veuillez confirmer votre adresse courriel pour terminer la création de votre compte.")}`,
      button: L("Confirm my email", "Confirmer mon courriel"),
      link: link("signup"),
      note: `${expires} ${ignore}`,
    }),
  },
  recovery: {
    subject: L("Reset your WagStays password", "Réinitialisez votre mot de passe WagStays"),
    content: layout({
      preheader: L("Choose a new password for your WagStays account.", "Choisissez un nouveau mot de passe pour votre compte WagStays."),
      title: L("Reset your password", "Réinitialisez votre mot de passe"),
      intro: `${hi}<br>${L("We received a request to reset the password for your WagStays account. Click below to choose a new one.", "Nous avons reçu une demande de réinitialisation du mot de passe de votre compte WagStays. Cliquez ci-dessous pour en choisir un nouveau.")}`,
      button: L("Choose a new password", "Choisir un nouveau mot de passe"),
      link: link("recovery"),
      note: `${expires} ${L("If you didn't request this, your password stays the same — you can ignore this email.", "Si vous n'avez pas fait cette demande, votre mot de passe reste inchangé — vous pouvez ignorer ce courriel.")}`,
    }),
  },
  email_change: {
    subject: L("Confirm your new email address", "Confirmez votre nouvelle adresse courriel"),
    content: layout({
      preheader: L("Confirm the change to your WagStays login email.", "Confirmez la modification de votre courriel de connexion WagStays."),
      title: L("Confirm your new email", "Confirmez votre nouveau courriel"),
      intro: `${hi}<br>${L("You asked to change your WagStays login email from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>. Confirm the change below.", "Vous avez demandé à remplacer votre courriel de connexion WagStays <strong>{{ .Email }}</strong> par <strong>{{ .NewEmail }}</strong>. Confirmez la modification ci-dessous.")}`,
      button: L("Confirm new email", "Confirmer le nouveau courriel"),
      link: link("email_change"),
      note: `${expires} ${L("If you didn't ask for this, please contact our support team right away.", "Si vous n'avez pas fait cette demande, veuillez communiquer immédiatement avec notre équipe de soutien.")}`,
    }),
  },
  invite: {
    subject: L("You're invited to WagStays", "Vous êtes invité sur WagStays"),
    content: layout({
      preheader: L("Your WagStays account is ready — set it up in one click.", "Votre compte WagStays est prêt — configurez-le en un clic."),
      title: L("You're invited to WagStays", "Vous êtes invité sur WagStays"),
      intro: `${hi}<br>${L("An account has been created for you on WagStays. Accept the invitation to set your password and get started.", "Un compte a été créé pour vous sur WagStays. Acceptez l'invitation pour choisir votre mot de passe et commencer.")}`,
      button: L("Accept invitation", "Accepter l'invitation"),
      link: link("invite"),
      note: `${expires} ${ignore}`,
    }),
  },
  magic_link: {
    subject: L("Your WagStays sign-in link", "Votre lien de connexion WagStays"),
    content: layout({
      preheader: L("Sign in to WagStays with one click.", "Connectez-vous à WagStays en un clic."),
      title: L("Sign in to WagStays", "Connectez-vous à WagStays"),
      intro: `${hi}<br>${L("Click below to sign in to your account.", "Cliquez ci-dessous pour vous connecter à votre compte.")}`,
      button: L("Sign in", "Se connecter"),
      link: link("magiclink"),
      note: `${expires} ${ignore}`,
    }),
  },
  reauthentication: {
    subject: L("{{ .Token }} is your WagStays verification code", "{{ .Token }} est votre code de vérification WagStays"),
    content: layout({
      preheader: L("Your WagStays verification code.", "Votre code de vérification WagStays."),
      title: L("Your verification code", "Votre code de vérification"),
      intro: `${hi}<br>${L("Enter this code to confirm it's you:", "Entrez ce code pour confirmer votre identité :")}
        <div style="margin:20px 0 4px;font-size:32px;line-height:40px;font-weight:800;letter-spacing:6px;color:${C.green}">{{ .Token }}</div>`,
      note: `${L("This code expires in 1 hour.", "Ce code expire dans 1 heure.")} ${ignore}`,
    }),
  },
  password_changed_notification: {
    subject: L("Your WagStays password was changed", "Votre mot de passe WagStays a été modifié"),
    content: layout({
      preheader: L("A quick security notice about your account.", "Un avis de sécurité concernant votre compte."),
      title: L("Your password was changed", "Votre mot de passe a été modifié"),
      intro: `${hi}<br>${L("The password for your WagStays account ({{ .Email }}) was just changed.", "Le mot de passe de votre compte WagStays ({{ .Email }}) vient d'être modifié.")}`,
      note: L("If this was you, there's nothing else to do. If not, reset your password right away and contact our support team.", "Si c'était vous, vous n'avez rien d'autre à faire. Sinon, réinitialisez immédiatement votre mot de passe et communiquez avec notre équipe de soutien."),
    }),
  },
  email_changed_notification: {
    subject: L("Your WagStays email address was changed", "Votre adresse courriel WagStays a été modifiée"),
    content: layout({
      preheader: L("A quick security notice about your account.", "Un avis de sécurité concernant votre compte."),
      title: L("Your email address was changed", "Votre adresse courriel a été modifiée"),
      intro: `${hi}<br>${L("The login email for your WagStays account was changed from {{ .OldEmail }} to {{ .Email }}.", "Le courriel de connexion de votre compte WagStays est passé de {{ .OldEmail }} à {{ .Email }}.")}`,
      note: L("If you didn't make this change, contact our support team right away.", "Si vous n'avez pas fait cette modification, communiquez immédiatement avec notre équipe de soutien."),
    }),
  },
};

const config = {
  site_url: SITE,
  smtp_host: "smtp.resend.com",
  smtp_port: "465",
  smtp_user: "resend",
  smtp_admin_email: SENDER.email,
  smtp_sender_name: SENDER.name,
  rate_limit_email_sent: 100,
  mailer_notifications_password_changed_enabled: true,
  mailer_notifications_email_changed_enabled: true,
};
for (const [key, t] of Object.entries(TEMPLATES)) {
  config[`mailer_subjects_${key}`] = t.subject;
  config[`mailer_templates_${key}_content`] = t.content;
}

if (process.argv.includes("--preview")) {
  // crude stand-in for Go templates: pick a language branch and fill sample values
  const render = (s, fr) =>
    s
      .replace(/\{\{ if \.Data\.firstName \}\}([\s\S]*?)\{\{ end \}\}/g, "$1")
      .replace(/\{\{ if eq \(printf "%v" \.Data\.locale\) "fr" \}\}([^{]*?)\{\{ end \}\}/g, (_, f) => (fr ? f : ""))
      .replace(/\{\{ if eq \(printf "%v" \.Data\.locale\) "fr" \}\}([\s\S]*?)\{\{ else \}\}([\s\S]*?)\{\{ end \}\}/g, (_, f, e) => (fr ? f : e))
      .replace(/\{\{ if eq \(printf "%v" \.Data\.locale\) "fr" \}\}([\s\S]*?)\{\{ end \}\}/g, (_, f) => (fr ? f : ""))
      .replaceAll("{{ .Data.firstName }}", "Emily")
      .replaceAll("{{ .RedirectTo }}", `${SITE}/auth/confirm?next=%2F`)
      .replaceAll("{{ .TokenHash }}", "pkce_0123456789abcdef")
      .replaceAll("{{ .Token }}", "48213907")
      .replaceAll("{{ .Email }}", "emily@example.ca")
      .replaceAll("{{ .NewEmail }}", "emily.new@example.ca")
      .replaceAll("{{ .OldEmail }}", "emily.old@example.ca");
  const out = process.env.PREVIEW_DIR || "email-preview";
  mkdirSync(out, { recursive: true });
  for (const [key, t] of Object.entries(TEMPLATES))
    for (const fr of [false, true]) writeFileSync(`${out}/${key}-${fr ? "fr" : "en"}.html`, render(t.content, fr).replace("<title>", `<title>${render(t.subject, fr)} — `));
  console.log(`previews written to ${out}/`);
} else {
  const token = env(".env.supabase", "SUPABASE_ACCESS_TOKEN");
  const resendKey = env(".env", "RESEND_API_KEY");
  if (!token || !resendKey) throw new Error("SUPABASE_ACCESS_TOKEN (.env.supabase) and RESEND_API_KEY (.env) are required");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...config, smtp_pass: resendKey }),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const after = await res.json();
  console.log("applied:", { smtp_host: after.smtp_host, smtp_admin_email: after.smtp_admin_email, rate_limit_email_sent: after.rate_limit_email_sent, site_url: after.site_url });
}
