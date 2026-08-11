import { scopesIncludeDriveFile } from "@/integrations/google/oauth";

export { scopesIncludeDriveFile };

export function spreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
