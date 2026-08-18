---
title: Building this site
date: 2026-08-09
tags: [blog, meta]
status: evergreen
---

Chris Titus's [AI-assisted workflow](https://christitus.com/my-ai-workflow/)
showed up on my feed a week or two ago (I'm a sucker for workflow videos),
and it struck me after I used AI to set up [Omniroute](/blog/testing-a-bunch-of-tools-to-stretch-my-claude-code-subscription/),
to finally work on this site — it had been rotting in my future/maybe pile
for months. For anyone who's still procrastinating on projects,
there's literally no excuse anymore with AI agents, DeepSeek is free on OpenCode.

An AI can generate a lot of code, fast. I haven't written a line of code
in ages. My job is now orchestrating agents, understanding architecture,
acting as QA, and making sure what comes out reflects what I wanted.
"Slow is smooth, smooth is fast."

After I ran the above article in Claude, we established that it's
overkill for a static personal site; instead, we took away the essentials:
a spec, a task list, CI, and an agreement that I'd spin up a local server
to test, and read every PR before it merged.

Somewhere in there I also picked up the
[Superpowers](https://github.com/obra/superpowers) plugin, after reading a
couple of [posts from bswen](https://docs.bswen.com/blog/2026-07-24-claude-code-superpower-plugin-still-useful/)
about it. To me, it does what it advertises — adding discrete phases
(skills) for brainstorming, planning, code review, systematic debugging — but it burns tokens, a lot of tokens, and
[bswen's own follow-up](https://docs.bswen.com/blog/2026-07-24-ultracode-workflow-vs-superpower-plugin/)
already has it getting displaced by Claude Code's native plan mode and
workflows. I'm not there yet. One thing at a time — workflows are next.

The site itself forced one real decision: the writeups are markdown source
files pulled from my [htb-writeups](https://github.com/reimo22/htb-writeups) repo. That's what static
site generators are for — turning markdown into webpages. We settled on
eleventy after some discussion.

I thought I had "tests" until around halfway through. Only to realize what I
had was linters wearing a test suite's name tag. I added a real suite.
Got told, correctly, not to overthink it: the site's static anyway.
I added tests still, because they were basically free and a one-time cost,
and free things that catch real bugs are hard to argue against.

Scope creep was the other constant. Left alone, an agent will wander past
the task you gave it. The fix wasn't a longer, more careful prompt, it was
shorter loops: interrupt, redirect, iterate. Partly because that's just how
you keep an agent on target, and partly because a single overloaded
Superpowers or `/code-review` prompt is enough to burn through a whole
5-hour Claude Pro window by itself.

The one time I tried merging to main directly, it bit me with a failed CI.
Always open PRs, and don't skip code reviews — even when it feels like overkill
for a one-line fix. The safety net exists for a reason.

So I protected main: required status checks to pass. Since I'm the only
collaborator, I set up an OpenCode review workflow — comment `/oc` on a
PR and it reviews the diff, leaving comments on anything that looks off.
Sanity check on demand.

[Akita's line](https://akitaonrails.com/en/2026/02/16/vibe-code-zero-to-production-in-6-days-the-m-akita-chronicles/)
on this says it better than I can: "Vibe Coding the right way has only one
path: Extreme Programming!" — pair programming (plan first, out loud), TDD,
and CI, or you're not really doing this, you're just hoping. That's the
whole workflow, really. Everything else is detail.

The repo is [on GitHub](https://github.com/reimo22/reimo22.github.io), if you want to
see how it actually turned out.
