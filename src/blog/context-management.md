---
title: Context Management in Claude Code
date: 2026-10-13
tags: [blog, claude-code]
status: evergreen
---

TL;DR. LLMs assume what you don't tell them, so the instinct is to feed a session everything the topic touches. The window can't hold it, and the cost of what's in it is mostly about caching. What works for me:

- Keep the cache warm. It's the biggest lever on cost: reads are frequently discounted 90% or more, and the cache only lasts about five minutes.
- Keep the always-loaded instructions small. Point at detail instead of inlining it.
- Shape the session: batch work, don't switch models mid-task, compact long sessions, hand off when switching or deferring.
- Review in a fresh context: a new session or a subagent, ideally a different model. The one that wrote the code is the worst one to check it.

Window sizes and tool behavior here are current as of October 2026.

## The window

Computers do exactly what you tell them. LLMs assume what you don't. Both facts push toward packing a session with context, and the window pushes back. Everything in it rides along on every request. In a coding session that's the whole transcript: every command, every file, every tangent. A long one costs more with every turn.

When the window fills, Claude Code compacts the conversation into a summary and keeps going. It works, but the summary is not the transcript. I set [autocompact](https://code.claude.com/docs/en/context-window) to fire at 300k and don't see the point of going past 500k: context rot degrades quality and cost balloons.

## The cache

For cost, the cache is the most important level. Anthropic's [lessons from building Claude Code](https://claude.dev/blog/lessons-from-building-claude-code-prompt-caching-is-everything/) put it in the title: prompt caching is everything.

The cache on a session lasts about five minutes in most cases, and cache reads are frequently discounted 90% or more, so a cold read costs way more than a warm one. Never let it go cold: no idle gaps mid-task, and before a prolonged break, wrap up the session or compact it rather than paying full price to re-read everything later. Pick the model before the first message too: switching models or toggling tools mid-conversation rebuilds the context from scratch, uncached.

## Keep the loaded instructions small

Only what every task needs stays loaded. The rest is pointers to detail that comes in when the task asks for it.

My global CLAUDE.md is one page of pointers — each one says where the detail lives and when to read it. My memory index is one line per note, and the note itself loads only when it's relevant. When a document needs something that lives elsewhere, I link it instead of copying it in. My notes hold the material; a session pulls in only what the task needs.

## Session shape

Sessions carry overhead beyond the tokens you'd count. [One breakdown of Pro usage](https://docs.bswen.com/blog/2026-02-05-optimize-claude-pro-usage/) puts ten short sessions at about 10x the overhead of one long session carrying the same ten questions, so I batch errands into one sitting instead of scattering them.

Handoffs are for switching sessions or deferring work to a future one. Where each move fits:

| Case                                    | Move                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Session running too long                | Compact it, with a prompt like `/compact im implementing x feature` to steer what the summary keeps                                      |
| Different problem needs its own session | Fork it off, or let it wait in a handoff                                                                                                 |
| Switching sessions or deferring work    | Handoff: the model writes the state of the work and the next step, so the next session starts from that instead of re-reading everything |
| Changing models                         | A fresh session on the new model instead of the uncached rebuild                                                                         |

[Plan-level cost is a separate question](/blog/api-vs-subscriptions/).

## Don't feed the window

Heavy workflow frameworks eat context for structure. I scrapped [obra/superpowers](https://github.com/obra/superpowers) over this. It split a small feature into an eight-step plan, it brainstormed when nothing needed brainstorming, my context and usage would be gone by step two, and I couldn't tell if it made a difference. My workflow is ship fast, break fast and iterate. As [Fábio Akita](https://www.akitaonrails.com/en/2026/09/17/talking-about-my-ai-skills/) puts it, more tools don't always lead to better outcomes.

The same rule applies to me mid-session. When a task turns up something unrelated, I park it in a note and come back to it after, so the window stays about one thing.

## Review in a fresh context

My reviewer never inherits the authoring context: a new session or a subagent, whichever is convenient. Ideally a different model too, since another model brings different bias and blindspots ([Arena on judge self-preference](https://arena.ai/blog/llm-judge-self-preference)). [Claude Code's best practices](https://code.claude.com/docs/en/best-practices#add-an-adversarial-review-step) call this an adversarial review step. The review traffic stays out of the authoring window too.

The tokens that tool output brings in are [worth cutting too](/blog/token-saving-tools-for-claude-code/).
