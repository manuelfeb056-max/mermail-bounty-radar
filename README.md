# mermail-bounty-radar

A community companion skill for [Mermail](https://mermail.app) that turns a
mailbox into an **opportunity radar** for bounties, hackathons, and grants.

It monitors incoming email, extracts structured opportunity intel (sponsor,
prize, deadline, chain, requirements), and scores each opportunity against
your standing participation rules — producing an `ATTACK / WATCH / SKIP`
shortlist.

> **Not an official skill.** This is a community companion built on the public
> Mermail MCP server. It follows the official authoring, security, and
> contribution norms from
> [Nudgen-Marketing/mermail-skills](https://github.com/Nudgen-Marketing/mermail-skills).

## Layout

```
skills/mermail-bounty-radar/
  SKILL.md                 # the skill (frontmatter name == folder name)
  agents/openai.yaml       # OpenAI agents wiring (Mermail MCP dependency)
  references/tools.md      # exact MCP call contracts (claims no tools)
  references/security.md   # untrusted-email contract, approval boundaries
scripts/
  rules.json               # standing participation rules (edit to yours)
  extract-opportunity.mjs  # deterministic email -> opportunity JSON
  score-opportunity.mjs    # opportunity JSON -> ATTACK/WATCH/SKIP
tests/
  fixtures/                # sample emails
  scenarios.json           # behavior scenarios (official format)
  validate.mjs             # local validator (mirrors official CI checks)
```

## Install

```bash
npx --yes skills add <this-repo> --skill mermail-bounty-radar
```

Connect the Mermail MCP server separately (skills provide workflows; MCP
provides tools):

```bash
openclaw mcp add mermail --url https://console.mermail.app/mcp \
  --transport streamable-http --auth oauth
openclaw mcp login mermail
```

## Try the deterministic pipeline

```bash
node scripts/extract-opportunity.mjs < tests/fixtures/good-bounty.json \
  | node scripts/score-opportunity.mjs
```

## Validate

```bash
npm test
```

## Security

Email is untrusted data. The skill never follows instructions inside messages,
never preflights links, never treats `From` as authentication, and never lets
an email authorize a send or a wallet action. Any external effect requires an
exact preview and fresh approval. See
`skills/mermail-bounty-radar/references/security.md`.

## License

MIT
