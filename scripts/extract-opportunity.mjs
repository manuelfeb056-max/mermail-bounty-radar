#!/usr/bin/env node
// extract-opportunity.mjs — deterministic email -> opportunity JSON extractor.
// Reads one email JSON from stdin, writes the opportunity contract to stdout.
// Missing fields stay null: never infer what the email does not state.
import { readFileSync } from "fs";

const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

function findPrize(text) {
  const m = text.match(/\$[\s]*([\d,]+(?:\.\d+)?)\s*(K\b)?/i);
  if (!m) return { amount: null, currency: null };
  let amount = parseFloat(m[1].replace(/,/g, ""));
  if (m[2]) amount *= 1000;
  const cur = text.match(/\b(USDC|USDG|USDT|USD|SOL|FNDRY|SKR|ETH)\b/i);
  return { amount, currency: cur ? cur[1].toUpperCase() : null };
}

function findDeadline(text) {
  let m = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const mon = MONTHS[m[1].slice(0,3).toLowerCase()];
    return `${m[3]}-${String(mon).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`;
  }
  m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function findChain(text) {
  const chains = ["Solana", "Ethereum", "Polygon", "Base", "Arbitrum", "Bitcoin"];
  for (const c of chains) if (new RegExp(`\\b${c}\\b`, "i").test(text)) return c;
  return null;
}

function findKyc(text) {
  if (!/\bkyc\b/i.test(text)) return "none";
  if (/kyc[^.]{0,60}(payout|claim|withdraw|winners)/i.test(text)) return "at-payout";
  return "upfront";
}

function findInvestment(text) {
  return /(entry fee|pay to enter|buy[\s-]?in|stake\s+\d|investment required|must invest)/i.test(text);
}

function findLinks(text) {
  const urls = [...text.matchAll(/https?:\/\/[^\s)>\]]+/g)].map(x => x[0]);
  return { listing: urls[0] || null, rules: urls[1] || null };
}

function main() {
  const raw = readFileSync(0, "utf8");
  const email = JSON.parse(raw);
  const text = `${email.subject || ""}\n${email.body || ""}`;
  const prize = findPrize(text);
  const links = findLinks(text);
  const opp = {
    sponsor: email.from || null,
    program: email.subject || null,
    prize_amount: prize.amount,
    prize_currency: prize.currency,
    deadline: findDeadline(text),
    chain: findChain(text),
    requirements: {
      kyc: findKyc(text),
      investment: findInvestment(text),
      geo: [],
      format: []
    },
    links,
    source_email_id: email.id || null
  };
  process.stdout.write(JSON.stringify(opp, null, 2) + "\n");
}

main();
