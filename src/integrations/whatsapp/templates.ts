export type TemplateKind = "guest_welcome" | "caretaker_notify" | "host_paste_fallback";

export interface TemplateConfig {
  metaName: string;
  variableKeys: string[];
}

const DEFAULT_TEMPLATES: Record<TemplateKind, Record<"en" | "hi", TemplateConfig>> = {
  guest_welcome: {
    en: {
      metaName: "guest_welcome_en",
      variableKeys: [
        "guest_name",
        "property_name",
        "location_url",
        "check_in",
        "caretaker_name",
        "caretaker_phone",
        "house_rules",
      ],
    },
    hi: {
      metaName: "guest_welcome_hi",
      variableKeys: [
        "guest_name",
        "property_name",
        "location_url",
        "check_in",
        "caretaker_name",
        "caretaker_phone",
        "house_rules",
      ],
    },
  },
  caretaker_notify: {
    en: {
      metaName: "caretaker_notify_en",
      variableKeys: [
        "guest_name",
        "guest_phone",
        "guest_count",
        "nights",
        "check_in",
        "check_out",
        "property_name",
      ],
    },
    hi: {
      metaName: "caretaker_notify_hi",
      variableKeys: [
        "guest_name",
        "guest_phone",
        "guest_count",
        "nights",
        "check_in",
        "check_out",
        "property_name",
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

export function buildTemplateVars(
  keys: string[],
  values: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    result[key] = values[key] ?? "";
  }
  return result;
}
