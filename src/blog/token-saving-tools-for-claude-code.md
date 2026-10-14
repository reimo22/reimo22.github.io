---
title: Token-Saving Tools for Claude Code
date: 2026-08-11
tags: [blog, claude-code]
status: evergreen
---

TL;DR. The compression pipeline I measured cut ~13% of filtered tokens for me without touching which model I talk to. Take your picks and don't blindly adopt everything:

- [RTK](https://github.com/rtk-ai/rtk) for free token savings for shell outputs.
- [Headroom](https://github.com/headroomlabs-ai/headroom) if you want to maximize token savings and don't mind some config.
- [ponytail](https://github.com/DietrichGebert/ponytail) to curb overbuilding and scope creep.
- [Caveman](https://github.com/juliusbrussee/caveman) if you don't mind the tone change.
- [i-have-adhd](https://github.com/ayghri/i-have-adhd) for ADHD-readable output that skips the preamble and recap.

I found the compression engines while [trying OmniRoute](/blog/llm-router-escapade-when-litellm-or-omniroute-is-worth-it/), a model router that bundles compression engines alongside model routing for fallbacks. Here's my picks:

- **RTK (Rust Token Killer)** — a standalone CLI tool that compresses tool outputs like bash, grep, ls, git, etc. You can use hooks to enforce it on every command, or instruct your model via system prompt to use it selectively on large, repetitive outputs. OmniRoute bundles its own TypeScript reimplementation of it, and since OmniRoute already sits as a proxy in front of Claude Code, it automatically rewrites bash calls into RTK-shortened output — no hooks needed. Claude actually lauded it for being clean and concise.

- **Headroom + CCR** — a proxy that compresses structured output (JSON, code, etc.). Large blocks of text are replaced with a reference and a hash, instructing the model to retrieve the original via tool call if needed — creating huge token savings. I hadn't yet set up OmniRoute's MCP before enabling compression, so Claude noticed its prompts were being injected and context replaced, with no way to retrieve the original, and hard refused. So be sure your model can call the retrieve tool before enabling this.

- **Caveman** — "why use many token when few do trick". It uses regex rules to rip out pleasantries, filler, etc. The lite setting was bearable; full was unacceptable, borderline gibberish, and I'm not desperate enough for tokens to tolerate that. This turned Claude from warm, somewhat verbose into concise and efficient — kind of undoing preference training (RLHF), sounding like a much cheaper model. Not a downside, but it is a tradeoff.

![OmniRoute's effective prompt compression pipeline: session-dedup → ccr → headroom → caveman](/assets/img/blog/token-saving-tools-for-claude-code--compression-pipeline.png)

The other compression tools were too aggressive for my taste.

Together, these tools cut ~13% of filtered tokens — 46.5M tokens saved across 3,555 requests over 30 days from the pipeline alone.

![OmniRoute's 30-day compression dashboard: 46,475,926 tokens saved across 3,555 requests, 13% average savings](/assets/img/blog/token-saving-tools-for-claude-code--compression-stats.png)

The output side, as I run it now:

- **ponytail** — what I swapped Caveman for. Caveman strips the prose. Ponytail goes after the bigger waste: the model building what nobody asked for. It injects a YAGNI-first decision ladder every turn: skip, reuse, stdlib, native, dependency, one-liner, minimal impl. Its benchmark reports 53% less code and 45% fewer tokens against a no-skill baseline, without stripping validation or security.

- **i-have-adhd** — a ruleset for ADHD-readable output loosely based on _The Adult ADHD Tool Kit_: lead with the next action, numbered steps, no preamble, no recap, no closers. Readability comes first. The skipped preamble and recap save tokens on the side.

What I use day to day: RTK, Headroom, ponytail, and i-have-adhd. No router required for any of it.
