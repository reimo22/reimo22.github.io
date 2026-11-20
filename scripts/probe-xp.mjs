// Temporary: finds any authenticated v4 route that exposes progress, so the
// idle counter can key off something reachable. Prints statuses and key paths
// only (never values). Deleted once htb-xp.mjs knows the real signal.
import { keyPaths } from "./htb-xp.mjs";

const BASE = "https://labs.hackthebox.com/api/v4";
const token = process.env.HTB_TOKEN;
if (!token) {
  console.error("HTB_TOKEN is not set");
  process.exit(1);
}
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
};

const paths = [
  "machine/active",
  "machine/owns",
  "machine/list",
  "challenge/owns",
  "user/owns",
  "user/notifications",
  "user/streak",
  "user/dashboard",
  "user/achievements",
  "user/badges",
  "user/subscription",
  "user/team",
  "season/list",
  "season/rankings",
  "ranking/list",
  "dashboard",
  "progress",
  "user/info",
];

for (const path of paths) {
  try {
    const response = await fetch(`${BASE}/${path}`, { headers });
    const body = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = undefined;
    }
    const keys = parsed
      ? keyPaths(parsed).slice(0, 20).join(", ")
      : "(non-JSON)";
    console.log(`${path} -> ${response.status}: ${keys}`);
  } catch (error) {
    console.log(`${path} -> fetch error: ${error.message}`);
  }
}
