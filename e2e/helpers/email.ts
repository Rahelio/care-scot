import { readFileSync } from "fs";

interface CapturedEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Reads the most recent captured email to `to`, and extracts the first URL in its body. */
export function getLatestEmailLink(to: string): string {
  const path = process.env.EMAIL_CAPTURE_FILE;
  if (!path) {
    throw new Error("EMAIL_CAPTURE_FILE is not set — required for e2e tests that read email links");
  }

  const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
  const emails: CapturedEmail[] = lines.map((line) => JSON.parse(line));
  const matches = emails.filter((e) => e.to === to);
  if (matches.length === 0) {
    throw new Error(`No captured email found for ${to}`);
  }

  const latest = matches[matches.length - 1];
  const urlMatch = latest.text.match(/https?:\/\/\S+/);
  if (!urlMatch) {
    throw new Error(`No URL found in captured email to ${to}`);
  }
  return urlMatch[0];
}
