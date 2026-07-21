function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function flag(name: string, defaultValue = false): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}

export const env = {
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  cronSecret: process.env.CRON_SECRET ?? "",

  // Email of the first platform admin. On first sign-in this user is auto-added to the admins table.
  adminBootstrapEmail: (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "").trim().toLowerCase(),

  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  supabaseSecretKey: () =>
    required(
      "SUPABASE_SECRET_KEY",
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  dbEncryptionKey: () =>
    required("SUPABASE_DB_ENCRYPTION_KEY", process.env.SUPABASE_DB_ENCRYPTION_KEY),

  googleClientId: () => required("GOOGLE_OAUTH_CLIENT_ID", process.env.GOOGLE_OAUTH_CLIENT_ID),
  googleClientSecret: () =>
    required("GOOGLE_OAUTH_CLIENT_SECRET", process.env.GOOGLE_OAUTH_CLIENT_SECRET),
  googleRedirectUri: () =>
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/auth/google/callback`,

  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
  googleServiceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "",

  whatsappGraphVersion: process.env.WHATSAPP_GRAPH_VERSION ?? "v23.0",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
  whatsappWabaId: process.env.WHATSAPP_WABA_ID ?? "",
  whatsappSystemUserToken: process.env.WHATSAPP_SYSTEM_USER_TOKEN ?? "",
  whatsappWebhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "",
  metaAppSecret: process.env.META_APP_SECRET ?? "",

  smsProvider: process.env.SMS_PROVIDER ?? "msg91",
  smsApiKey: process.env.SMS_API_KEY ?? "",

  useMockWhatsApp: flag("USE_MOCK_WHATSAPP", true),
  useMockGmail: flag("USE_MOCK_GMAIL", false),
  useMockSheets: flag("USE_MOCK_SHEETS", false),
  useMockSms: flag("USE_MOCK_SMS", true),

  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "phase12" ? "phase12" : "full",
};
