#!/usr/bin/env node
// score-opportunity.mjs — scores an opportunity JSON against scripts/rules.json.
// Reads opportunity JSON from stdin, writes { verdict, reasons[] } to stdout.
// Verdicts: ATTACK (fits all rules), WATCH (fits with caveats), SKIP (hard rule violated).
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const rules = JSON.parse(readFileSync(join(here, "rules.json"), "utf8"));

function main() {
  const opp = JSON.parse(readFileSync(0, "utf8"));
  const hard = [], soft = [];
  const text = `${opp.program || ""} ${opp.sponsor || ""}`.toLowerCase();

  if (rules.hard.no_upfront_kyc && opp.requirements?.kyc === "upfront")
    hard.push("requires upfront KYC documents");
  if (rules.hard.no_investment && opp.requirements?.investment)
    hard.push("requires real-money investment");
  if (rules.hard.accepted_chains?.length && opp.chain &&
      !rules.hard.accepted_chains.includes(opp.chain))
    hard.push(`chain ${opp.chain} not in accepted rails (${rules.hard.accepted_chains.join(", ")})`);
  if (rules.hard.no_memecoins && /meme|memecoin/.test(text))
    hard.push("memecoin program");

  if (opp.prize_amount != null && opp.prize_amount < (rules.soft.min_prize_usd || 0))
    soft.push(`prize ${opp.prize_amount} below soft minimum`);
  if (rules.soft.prefer_deadline_present && !opp.deadline)
    soft.push("no explicit deadline stated");

  const verdict = hard.length ? "SKIP" : soft.length ? "WATCH" : "ATTACK";
  process.stdout.write(JSON.stringify({
    verdict,
    reasons: [...hard.map(r => "HARD: " + r), ...soft.map(r => "SOFT: " + r)],
    opportunity: { sponsor: opp.sponsor, program: opp.program, prize_amount: opp.prize_amount,
                   prize_currency: opp.prize_currency, deadline: opp.deadline, chain: opp.chain }
  }, null, 2) + "\n");
}

main();
