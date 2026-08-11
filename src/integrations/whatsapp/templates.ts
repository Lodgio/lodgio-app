export type TemplateKind =
  | "guest_welcome"
  | "caretaker_notify"
  | "host_paste_fallback"
  | "host_welcome";

export interface TemplateConfig {
  metaName: string;
  variableKeys: string[];
  /** Override Meta language code when it differs from the registry key (e.g. en_US). */
  languageCode?: string;
}

/**
 * Meta template names + positional variable order.
 * Must match lodgio-build-pack/whatsapp_templates_reference.md exactly.
 */
const DEFAULT_TEMPLATES: Record<TemplateKind, Record<"en" | "hi", TemplateConfig>> = {
  host_welcome: {
    en: {
      metaName: "whatsapp_verification_en",
      variableKeys: [],
    },
    hi: {
      // Not submitted yet — same naming pattern when created.
      metaName: "whatsapp_verification_hi",
      variableKeys: [],
    },
  },
  guest_welcome: {
    en: {
      metaName: "guest_welcome_en",
      variableKeys: [
        "guest_name",
        "check_in",
        "check_in_time",
        "location_url",
        "caretaker_name",
        "caretaker_phone",
        "house_rules",
        "property_name",
      ],
    },
    hi: {
      metaName: "guest_welcome_hi",
      variableKeys: [
        "guest_name",
        "check_in",
        "check_in_time",
        "location_url",
        "caretaker_name",
        "caretaker_phone",
        "house_rules",
        "property_name",
      ],
    },
  },
  caretaker_notify: {
    en: {
      metaName: "caretaker_checkin_en",
      variableKeys: [
        "guest_name",
        "property_name",
        "check_in",
        "check_in_time",
        "check_out",
        "nights",
        "guest_count",
        "guest_phone",
        "booking_source",
      ],
    },
    hi: {
      metaName: "caretaker_checkin_hi",
      variableKeys: [
        "guest_name",
        "property_name",
        "check_in",
        "check_in_time",
        "check_out",
        "nights",
        "guest_count",
        "guest_phone",
        "booking_source",
      ],
    },
  },
  host_paste_fallback: {
    en: {
      metaName: "host_paste_fallback_en",
      variableKeys: ["guest_name", "form_link", "booking_id"],
    },
    hi: {
      metaName: "host_paste_fallback_hi",
      variableKeys: ["guest_name", "form_link", "booking_id"],
    },
  },
};

export function getTemplateConfig(
  kind: TemplateKind,
  language: "en" | "hi",
  overrideName?: string | null
): TemplateConfig {
  const config = DEFAULT_TEMPLATES[kind][language];
  if (overrideName) {
    return { ...config, metaName: overrideName };
  }
  return config;
}

export function getTemplateRef(
  kind: TemplateKind,
  language: "en" | "hi",
  overrideName?: string | null
): { name: string; language: string; variableKeys: string[] } {
  const config = getTemplateConfig(kind, language, overrideName);
  return {
    name: config.metaName,
    language: config.languageCode ?? language,
    variableKeys: config.variableKeys,
  };
}

export function buildTemplateVars(
  keys: string[],
  values: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    // Meta rejects empty body parameters; use a neutral dash for missing data.
    const raw = (values[key] ?? "").trim();
    result[key] = raw || "—";
  }
  return result;
}
