import { readFileSync, readdirSync } from "fs";
import path from "path";
import type { Cursor, GmailClient, HostConnection, RawEmail } from "@/integrations/types";

const FIXTURES_DIR = path.join(process.cwd(), "fixtures", "airbnb-emails");

export class MockGmailClient implements GmailClient {
  async listAirbnbMessages(
    _host: HostConnection,
    since: Cursor
  ): Promise<{ emails: RawEmail[]; nextCursor: Cursor }> {
    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".eml"));
    const startIndex = since.value ? parseInt(since.value, 10) : 0;
    const nextFiles = files.slice(startIndex, startIndex + 10);

    const emails: RawEmail[] = nextFiles.map((file, index) => {
      const body = readFileSync(path.join(FIXTURES_DIR, file), "utf8");
      return {
        id: `mock-${file}`,
        threadId: `thread-${file}`,
        snippet: body.slice(0, 120),
        body,
        receivedAt: new Date(Date.now() - index * 60000).toISOString(),
      };
    });

    const nextCursor: Cursor = {
      value: emails.length === 0 ? since.value : String(startIndex + emails.length),
    };

    return { emails, nextCursor };
  }
}
