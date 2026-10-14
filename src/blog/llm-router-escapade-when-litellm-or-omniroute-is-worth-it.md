---
title: "LLM Router Escapade: When LiteLLM or OmniRoute Is Worth It"
date: 2026-10-13
tags: [blog, claude-code]
status: evergreen
---

TL;DR. Use LLM gateways when you have multiple subscriptions or API providers and want a unified interface, as well as a graceful fallback to cheaper models/providers once quota runs out. Complexity routing: kills your cache more than it saves cost. When to use each:

- [LiteLLM](https://github.com/BerriAI/litellm) if you rotate subscriptions, or want OpenAI models usable in Claude Code. It converts Anthropic Messages requests into OpenAI chat completions.
- [OmniRoute](https://github.com/diegosouzapw/OmniRoute) if you want free-tier aggregation. It promises ~1.62B free tokens a month across 150+ free tiers, though signing up for that many accounts is tedious.

The premise: I have a Claude Pro subscription but my weekly usage inevitably runs out by day 5, leaving me dry for 2 days. I tried to find ways to seamlessly fallback from my Claude sub to APIs.

I started out [trying to replace the subscription with a cheaper one](/blog/api-vs-subscriptions/). The remaining lever was the models. DS Flash and GPT Luna were the best for cost/performance at the time, according to [Artificial Analysis](https://artificialanalysis.ai/models/comparisons/deepseek-v4-flash-vs-gpt-5-6-luna). DS Flash is verbose, so I run it on low reasoning effort; Luna I'd run at xhigh.

I got keys for both [DeepSeek's API](https://platform.deepseek.com), and [NanoGPT](https://nano-gpt.com), a PAYG aggregator. You can manually wire them up via env vars, better yet create a function in bashrc with all the variables exported. [This writeup is where I learned that trick](https://ai.georgeliu.com/p/deepseek-v4-in-claude-code-kilo-code). Now I got `claude`, [`deepclaude`](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code/), [`nanocc`](https://docs.nano-gpt.com/integrations/claude-code), but I didn't wanna keep manually switching between them. [I don't really recommend the API route though](/blog/api-vs-subscriptions/).

![The deepclaude() bashrc function: exports ANTHROPIC_BASE_URL, ANTHROPIC_AUTH_TOKEN, and model overrides pointing Claude Code at DeepSeek's API, then execs claude](/assets/img/blog/token-saving-tools-for-claude-code--deepclaude.png)

Hence I looked into **LiteLLM** — it's positioned as the one unified interface for all your API providers. My initial idea was to route Opus through my subscription and override Sonnet with DS Flash / GPT Luna, which are cheaper. I got the shape wrong: pointing only Opus at the subscription meant everything else hit the API from the first request, so it billed me on API whether or not I'd used up my subscription quota. What I should have done is point every tier at the subscription and let it fall back to the next tier only once that's exhausted.

I ran into some hiccups with context size. Since Sonnet 5 the window has been 1M by default, but the 200k ceiling shows up when you route through an external API: it assumes 200k without an override. That's what the `[1m]` suffix on the model name is for, i.e. `claude-sonnet-5[1m]`.

## Auto-routing and the cache

Auto-routing uses semantic meaning to route requests to the cheapest capable model. I did try it. It burned through half my monthly usage in a day by routing everything to frontier. Properly setting one up is a commitment with lots of tuning. It might be worth it if you're on API and routing between frontier and cheaper OSS models; if so, enable session affinity (aka sticky routing). On a subscription it's not worth it: the quota is heavily subsidized and fixed.

I measured the cache side too. Direct single-provider access hits 87%+ cache rate. An adaptive router tanked it to 0–60%. Pinning a single provider (Claude) through OmniRoute reached 84%, which is low but biased: the fallback chain was still configured underneath, so some requests could still escape to another provider. Treat it as a floor rather than a clean measure of session affinity. The alternative wasn't 87% either, since once the subscription is exhausted it's routing or waiting for the reset. Routers don't just add complexity — they structurally cost cache hits. Manual switching won.

Instance-wide across the whole trial, OmniRoute's caching numbers: an 81.2% cache rate and an 88.1% cache reuse ratio. The per-provider breakdown below is that same whole-trial history, so Claude's row there won't match the pinned experiment's 84%.

![OmniRoute's cache dashboard: 81.2% cache rate, 88.1% cache reuse ratio, 205,776,507 cache read tokens, 12,328,602 cache write tokens](/assets/img/blog/token-saving-tools-for-claude-code--cache-overview.png)

Broken down by provider, nanogpt's cache rate trails the rest despite a comparable cache reuse ratio — probably skewed from switching between many different models, whereas with the other providers I'd only ever run one or two of theirs.

![Per-provider cache breakdown: nanogpt's cache rate sits at 63.5% against a 94.0% reuse ratio, well below claude, deepseek, and the opencode providers](/assets/img/blog/token-saving-tools-for-claude-code--cache-rate.png)

## OmniRoute

Another tool I tried is **OmniRoute** — a model router like LiteLLM. It promises ~1.62B free tokens a month by aggregating different free tiers from various services, via API keys, PATs, and OAuth. This was honestly a bit fishy, since it downright abuses TOS for many of those providers. But I figured that's not how I'd use it — more like a fallback between services I already pay for — so I pushed on.

My use case was routing Claude Code through a cascade from Sonnet -> DS Flash (API) -> DS Flash (NanoGPT), with GPT Luna as fallback for vision. I've used `cache-optimized` as the routing strategy for this combo. I got some 503s after sending images to DeepSeek, which doesn't have vision support, which is why Luna went at the end of the cascade.

But my main gripe with OmniRoute is that websearch and webfetch don't work out of the box. It uses searXNG and DDG but quickly gets rate-limited, and webfetch (actually scraping the sites) doesn't work at all. Both work flawlessly when logged into Claude Code directly. OmniRoute supports adding search providers, but at this point it was running late and my patience had grown thin from tinkering all day.

I gave it a second chance later. Registered for Firecrawl and Linkup. Then I instantly hit "Structurally heavy chat request capacity is busy; retry shortly," which meant I couldn't run two sessions simultaneously. Tracked it to a known [issue](https://github.com/diegosouzapw/OmniRoute/issues/10183). Downgrading to `omniroute@3.8.48` as the issue suggested broke `better-sqlite3`, which silently fell back to the `sql.js` WASM driver, leaked memory on every probe, and eventually OOM'd the process, killing the Next.js dashboard with a 500. Had to manually rebuild the native binding in two separate `node_modules` copies (top-level and `dist/`) to get the service running again.

The biggest win of the whole trial turned out to be the [pile of compression engines](/blog/token-saving-tools-for-claude-code/) OmniRoute bundles. Those don't need a router.

## The proxy tradeoff

Running Claude Code against an API instead of your subscription login is what disables `/remote-control` and the Claude.ai MCP connectors (the ones you sign into via the webapp). Headroom and Caveman aren't special here, and neither is OmniRoute: any proxy sitting in the request path does the same, and so does pointing Claude Code straight at an external API like DeepSeek. MCP servers you set up locally are unaffected. This isn't a bug; it's how API routing works. You can't have both at the same time.

If you rely on `/remote-control` or cloud connectors, skip the proxies entirely — Caveman's skill (output terseness) and RTK (shell output compression) work without intercepting traffic and still give you meaningful savings.

## Where I landed

By this point I exhausted my DeepSeek API, leaving me with two providers. I went full circle from wanting seamless model switching to settling with a manual fallback: `/exit`, `cc`, `/resume`.

What I run now is LiteLLM and OpenCode Go. The router means I can seamlessly switch to CommandCode or Claude Pro whenever. The rule I ended up with is [Fábio Akita's](https://akitaonrails.com/en/2026/10/03/understanding-the-jev-hype-what-is-it-for/): don't adopt an intermediate layer until it hurts not to have it.

**Worth it: one endpoint.** I rotate subscriptions often, so a single address in front of all of them beats rewiring Claude Code each time. The same setup gives you a quota fallback: Opus until the subscription runs dry, then Sonnet, then a cheap API.

**Not worth it: routing for savings.** Your context scatters across providers and kills cache reuse; you lose more on cache than you save on routing. The reason it never wins is [the subsidy](/blog/api-vs-subscriptions/).

LiteLLM and OmniRoute are close enough feature-wise that the pick came down to positioning: LiteLLM sells a gateway for your providers, OmniRoute free-tier aggregation. I've kept LiteLLM for fallbacks.
