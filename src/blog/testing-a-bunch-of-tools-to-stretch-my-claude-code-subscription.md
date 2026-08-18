---
title: Token-Saving Tools for Claude Code
date: 2026-08-11
tags: [blog, claude-code]
status: evergreen
---

TL;DR. When to use each tool:

- Use [LiteLLM](https://github.com/BerriAI/litellm) if you have a lot of API keys / subscriptions to manage and are serving multiple users — suitable for teams.
- Use [OmniRoute](https://github.com/diegosouzapw/OmniRoute) if you're free or low budget and need to squeeze the most inference out of it. It's tedious registering for so many accounts, and it's borderline against TOS — consider [OpenCode](https://github.com/sst/opencode)'s free models instead.
- [RTK](https://github.com/rtk-ai/rtk) for free token savings for shell outputs.
- [Headroom](https://github.com/headroomlabs-ai/headroom) if you want to maximize token savings and don't mind some config.
- [Caveman](https://github.com/juliusbrussee/caveman) if you don't mind the tone change.

For the past few days I've looked into various ways to optimize cost. I was initially looking to replace my Claude Pro subscription entirely with a cheaper subscription like OpenCode Go or PAYG API.

But I quickly realized that vendor subscriptions are so heavily subsidized that even under moderate use, it far outprices API given the same model, Sonnet 5. Since picking the same model is moot, I also looked into replacing my workflow with cheaper models. Right now DS 0731 Flash and GPT 5.6 Luna are the best for cost/performance, according to [Artificial Analysis](https://artificialanalysis.ai/models/comparisons/deepseek-v4-flash-vs-gpt-5-6-luna).

> Update (2026-08-17): DeepSeek's official API got hit with a major price hike plus peak-hour pricing — Flash's new peak rate is now roughly what Pro used to cost. Some providers (via OpenRouter/NanoGPT) still offer Flash near the old pricing. I also prefer running it on low reasoning effort since its GA release, else it overthinks, and I don't get much done. ([source](https://explainx.ai/blog/deepseek-v4-price-increase-live-gpt-5-6-comparison-august-2026))

The premise: I have a Claude Pro subscription but my weekly usage inevitably runs out by day 5, leaving me dry for 2 days.

I tried to find ways to seamlessly fallback from my Claude sub to APIs. I got keys for both [DeepSeek's API](https://platform.deepseek.com), and [NanoGPT](https://nano-gpt.com), a PAYG aggregator.

You can manually wire them up via env vars, better yet create a function in bashrc with all the variables exported. Now I got `claude`, [`deepclaude`](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code/), [`nanocc`](https://docs.nano-gpt.com/integrations/claude-code), but I didn't wanna keep manually switching between them.

![The deepclaude() bashrc function: exports ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, and model overrides pointing Claude Code at DeepSeek's API, then execs claude](/assets/img/blog/stretching-your-claude-code-subscription--deepclaude.png)

Hence I looked into **LiteLLM** — it's positioned as the one unified interface for all your API providers.

My initial idea was to route Opus through my subscription and override Sonnet with DS Flash 0731 / GPT 5.6 Luna, which are cheaper. But, the way I configured it, it will charge me on API regardless of whether I've used up my subscription quota or not.

I ran into some hiccups with Claude Code defaulting to 200k context, where you'd need to append `[1m]` to the model name, i.e. `claude-sonnet-5[1m]` to get the full 1M context.

I haven't tried auto-routing, which uses semantic meaning to route requests to the cheapest capable model. It's promising, but my guess is it would break caching since you're routing between 3+ different models. So if you're looking into this, definitely enable session affinity (aka sticky routing).

Another tool I discovered is **OmniRoute** — a model router like LiteLLM. It promises ~1.5B tokens for free by aggregating different free tiers from various services, via API keys, PATs, and OAuth. This was honestly a bit fishy, since it downright abuses TOS for many of those providers. But I figured that's not how I'd use it — more like a fallback between services I already pay for — so I pushed on.

My use case was routing Claude Code through a cascade from Sonnet -> DS Flash (API) -> DS Flash (NanoGPT), with GPT Luna as fallback for vision. I've used `cache-optimized` as the routing strategy for this combo.

I got some 503s after sending images to DeepSeek, which doesn't have vision support. That's why I added Luna to the end of the cascade.

But my main gripe with OmniRoute is that websearch and webfetch don't work out of the box. It uses searXNG and DDG but quickly gets rate-limited, and webfetch (actually scraping the sites) doesn't work at all. Both work flawlessly when logged into Claude Code directly. OmniRoute supports adding search providers, but at this point it was running late and my patience had grown thin from tinkering all day.

The biggest win, though, was that OmniRoute comes bundled with a lot of different compression engines. Most notable:

- **RTK (Rust Token Killer)** — a standalone CLI tool that compresses tool outputs like bash, grep, ls, git, etc. You can use hooks to enforce it on every command, or instruct your model via system prompt to use it selectively on large, repetitive outputs. OmniRoute bundles its own TypeScript reimplementation of it, and since OmniRoute already sits as a proxy in front of Claude Code, it automatically rewrites bash calls into RTK-shortened output — no hooks needed. Claude actually lauded it for being clean and concise.

- **Headroom + CCR** — a proxy that compresses structured output (JSON, code, etc.). Large blocks of text are replaced with a reference and a hash, instructing the model to retrieve the original via tool call if needed — creating huge token savings. I hadn't yet set up OmniRoute's MCP before enabling compression, so Claude noticed its prompts were being injected and context replaced, with no way to retrieve the original, and hard refused. So be sure your model can call the retrieve tool before enabling this.

- **Caveman** — "why use many token when few do trick". It uses regex rules to rip out pleasantries, filler, etc. The lite setting was bearable; full was unacceptable, borderline gibberish, and I'm not desperate enough for tokens to tolerate that. This turned Claude from warm, somewhat verbose into concise and efficient — kind of undoing preference training (RLHF), sounding like a much cheaper model. Not a downside, but it is a tradeoff.

![OmniRoute's effective prompt compression pipeline: session-dedup → ccr → headroom → caveman](/assets/img/blog/stretching-your-claude-code-subscription--compression-pipeline.png)

The other compression tools were too aggressive for my taste.

Together, these tools cut ~13% of filtered tokens — 46.5M tokens saved across 3,555 requests over 30 days from the pipeline alone.

![OmniRoute's 30-day compression dashboard: 46,475,926 tokens saved across 3,555 requests, 13% average savings](/assets/img/blog/stretching-your-claude-code-subscription--compression-stats.png)

Caching numbers: an 81.2% cache rate and 88.1% cache reuse ratio.

![OmniRoute's cache dashboard: 81.2% cache rate, 88.1% cache reuse ratio, 205,776,507 cache read tokens, 12,328,602 cache write tokens](/assets/img/blog/stretching-your-claude-code-subscription--cache-overview.png)

Broken down by provider, nanogpt's cache rate trails the rest despite a comparable cache reuse ratio — probably skewed from switching between many different models, whereas with the other providers I'd only ever run one or two of theirs.

![Per-provider cache breakdown: nanogpt's cache rate sits at 63.5% against a 94.0% reuse ratio, well below claude, deepseek, and the opencode providers](/assets/img/blog/stretching-your-claude-code-subscription--cache-rate.png)

The thing is, none of these token-saving engines require OmniRoute — I just discovered them through it, since they're bundled together. LiteLLM can apparently be integrated with Headroom too.

My conclusion: I'm overengineering this. Logging in would let me keep all the benefits: `/remote-control`, my MCP connectors, websearch/fetch. And setting an alias in `.bashrc` with env variables linking to an external provider is trivial and doesn't mess with my setup. I'll just install the compression engines directly into Claude Code.

By this point I exhausted my DeepSeek API, leaving me with two providers. I basically went full circle from wanting seamless model switching to settling with a fallback `nanocc`, now called `cc`. `/exit`, `cc`, `/resume` does what I want with less overhead.

## Update (2026-08-17)

I gave OmniRoute a second chance. Registered for Firecrawl and Linkup. Then I instantly hit "Structurally heavy chat request capacity is busy; retry shortly," which meant I couldn't run two sessions simultaneously. Tracked it to a known [issue](https://github.com/diegosouzapw/OmniRoute/issues/10183).

Downgraded to `omniroute@3.8.48` as the issue suggested, which landed me into a different mess: the downgrade broke `better-sqlite3` (an optional native dependency), it silently fell back to the `sql.js` WASM driver, which can't read WAL-mode databases, leaked memory on every probe, and eventually OOM'd the process, killing the Next.js dashboard with a 500. Had to manually rebuild the native binding in two separate `node_modules` copies (top-level and `dist/`) to get the service running again.

So the conclusion stands. It's trivial to create a bash alias in `.bashrc` that points Claude Code at an external API, or just switch to OpenCode, which can connect all sorts of providers at once. And I don't have to risk my Claude account getting banned.
