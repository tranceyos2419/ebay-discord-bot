# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm i            # install dependencies (README standardizes on pnpm; no lockfile is committed)
pnpm run start    # run the bot in dev via tsx (executes TypeScript directly, no build step)
make run          # alias for `pnpm run start`
pnpm run build    # type-check / emit with tsc per tsconfig.json
```

There is **no test suite** — `pnpm test` intentionally errors out.

Requires a `.env` file with `DISCORD_TOKEN`. `src/config/load-env.ts` throws on startup if it is missing.

## Architecture

A single-purpose Discord bot: a user uploads a CSV to a Discord channel, and the bot fans the rows out into per-researcher threads.

**Entry flow:** `src/index.ts` → `startBot()` in `src/service/bot.ts`, which holds the entire application. There are no commands or routers — all behavior lives in one `messageCreate` handler.

**The one handler** ([src/service/bot.ts](src/service/bot.ts)) fires only when the message **both** mentions the bot **and** carries a `.csv` attachment. It then:
1. Fetches and parses the attached CSV (`csv-parse/sync`, `columns: true`) into `ThreadData[]`.
2. Groups rows by the `In Charge Of` column → a channel key `research-<person>`, where `<person>` is lowercased with all non-letters stripped.
3. Locates the guild's `Research` **category** (matched case-insensitively by name) and the `Researcher` **role** (for mentions).
4. Within each matched channel, sub-groups rows by a composite `Identity`-`Deadline` key, and creates **one thread per group**, titled `MM/DD <Identity>` (deadline parsed from a `M/D` string).
5. Posts row details into each thread, chunked by `MAX_THREADS_PER_PERSON` (10), each message mentioning the `Researcher` role.

**Discord server assumptions** (the bot silently skips or logs, never creates, missing structures):
- A category literally named `Research` must exist.
- Target channels must be `GuildText` named exactly `research-<person>` **and** parented to the `Research` category — a channel with the right name under a different parent is ignored.
- A role named `Researcher` is used for mentions; falls back to the literal string `@Researcher` if absent.
- The `MessageContent` gateway intent is enabled (also toggle it in the Discord Developer Portal).

## Gotchas

- **Two entry points.** Only `src/index.ts` is wired to `start`. The root-level [index.ts](index.ts) is a separate standalone script that just logs every incoming message — it is not part of the running bot.
- **`Est. Prfoit` is a deliberate typo.** The CSV header, the `ThreadData` field, and the record mapping all misspell "Profit" consistently. Keep the spelling aligned with the source CSV headers; do not "fix" one side in isolation.
- **CSV column names are the contract.** `src/service/bot.ts` maps rows by exact header string (`'eBay Item Id'`, `'JP Keyword'`, `'T.P.C.A.'`, etc.). Adding/renaming a column means updating both [src/types/thread_data.ts](src/types/thread_data.ts) and the `records.map` in [src/service/bot.ts](src/service/bot.ts).

## Branching

Per the README: feature work on `feature/[name]` (or `bugfix/[name]`) branches, merged into `dev`; `main` is production.
