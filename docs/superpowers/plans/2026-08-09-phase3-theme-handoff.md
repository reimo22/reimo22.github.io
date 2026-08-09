# Phase 3 Theme — Handoff (banner redesign, not yet applied)

**Branch:** `worktree-phase3-theme`
**Worktree:** `.claude/worktrees/phase3-theme`
**Status:** Phase 3's original scope (CSS tokens, ASCII banner mechanism,
contrast, mobile-first layout, `prefers-reduced-motion` gating) was
implemented via subagent-driven-development, reviewed clean, and committed
(`bd500d6` → `e81f458`). **After that**, visual review turned up a contrast
complaint and led to five rounds of redesign exploration in a shared
Artifact, none of which is in the repo yet. This doc is the bridge: what was
decided, what the exact assets are, and what's left to actually build.

Artifact used for all mockups (still live, keeps updating on republish):
`https://claude.ai/code/artifact/524dfc73-61f1-422b-bc09-8adfe26c23ad`

Local copy of the latest mockup HTML (source of truth for the exact
strings/CSS below):
`/tmp/claude-1000/-var-home-user-Documents-reimo22-github-io/b273bbe9-1430-4fd5-a01a-ccb14d0f4727/scratchpad/dino-banner-options.html`
— this is in the session scratchpad, **not** in the repo, and will not
survive past this session. Everything needed from it is copied below.

## Why this redesign happened

Original Phase 3 shipped a purple/gray palette that passed WCAG numerically
(4.5:1 / 3:1) but read as washed-out in light mode — user feedback: "the
contrast on light mode is pretty bad," the purple looked pale even though it
technically cleared the ratio. That turned into "what if the banner was
Chrome-dino themed" (not a playable game, just visual), which went through
several rounds of feedback before landing on the composition below.

## Decisions locked in

**Light mode — off-white, monochrome, no purple:**

- Background `#f7f5f0`, ink `#201e1a` (21.6:1 contrast — comfortably clears
  AAA, no accent-color contrast question to relitigate)
- Banner content: the ASCII dino only. **Confirmed.**
- A cactus companion piece was explored (dino-game "obstacle" theme) but the
  user wasn't happy with the shape — **paused, not cut.** Revisit if wanted;
  don't build it into `main.css` yet.
- Links carry an underline instead of a color shift, since there's no
  second hue to lean on in this palette.

**Dark mode — unchanged palette, new banner composition:**

- Palette is exactly what's already in `main.css`'s
  `@media (prefers-color-scheme: dark)` block — no changes:
  `--color-bg: #14111c; --color-fg: #e8e3f5; --color-muted: #b3aac9; --color-accent: #c9a6ff; --color-border: #6d6494;`
- Banner layout: dino at the far left, a cratered full moon at the far
  right (`justify-content: space-between`), a sparse field of static ASCII
  stars filling the gap between them, and 4 animated shooting stars layered
  over the whole scene.
- The moon is not hand-drawn — see "Real-photo ASCII assets" below.
- All motion gated behind `prefers-reduced-motion: no-preference`, which
  happens to be the literal Phase 3 checklist item ("prefers-reduced-motion
  gating for any motion effects") — this composition satisfies it directly.

## Real-photo ASCII assets (how they were made, and the exact output)

Wrote a small Pillow-based converter
(`/tmp/claude-1000/.../scratchpad/img2ascii.py`, also scratchpad-only,
copied in full below) that crops an image to its non-black bounding box and
maps luminance to a 10-character density ramp `" .:-=+*#%@"`. Ran it against
two public-domain/CC-licensed source photos, not a hand-placed grid:

- **Full moon (chosen):** NASA/JPL/USGS, Galileo spacecraft, Dec 7 1992.
  Public domain (US government work).
  Source: `https://upload.wikimedia.org/wikipedia/commons/b/b3/Full_moon.jpeg`
  Generated at 34 columns — the crater shading in the output below is real
  data from the photo (Tycho, the mare basins), not decoration.
- **Crescent moon (drafted, not chosen):** Thomas Bresson (ComputerHotline),
  CC BY 2.0, April 18 2010.
  Source: `https://upload.wikimedia.org/wikipedia/commons/4/4c/Crescent-moon.jpg`
  Not used in the final composition — full moon won.
- **Dino silhouette:** traced from the real Chromium T-Rex sprite path (not
  guessed), sourced from the Wikimedia Commons redraw of the offline-error
  dino: `https://commons.wikimedia.org/wiki/File:Chromium_T-Rex-error-offline.svg`.
  This SVG path exists as a drafted alternative (pixel-accurate `<path>`,
  see round-1/2 mockups) but **the ASCII dino from the original Phase 3
  implementation was kept instead** — the user picked "ASCII dino" over the
  SVG pixel version early on. The SVG path is documented here in case that
  choice gets revisited, but is not part of the current plan.
- **License note to resolve before shipping:** the full-moon photo is public
  domain (safe). Double-check whether any attribution file/credits page
  convention exists on this site before publishing — not currently a
  blocker, just unverified.

`img2ascii.py` (recreate in scratchpad or anywhere; needs Pillow — a venv
was created at `/tmp/claude-1000/.../scratchpad/venv` in this session, won't
survive either):

```python
import sys
from PIL import Image

RAMP = " .:-=+*#%@"


def crop_to_content(img, threshold=12):
    gray = img.convert("L")
    bbox = gray.point(lambda p: 255 if p > threshold else 0).getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def to_ascii(path, out_cols, char_aspect=0.5):
    img = Image.open(path).convert("L")
    img = crop_to_content(img)
    w, h = img.size
    rows = max(1, round((h / w) * out_cols * char_aspect))
    img = img.resize((out_cols, rows), Image.LANCZOS)
    px = img.load()
    lines = []
    for y in range(rows):
        line = []
        for x in range(out_cols):
            v = px[x, y]
            idx = min(len(RAMP) - 1, v * len(RAMP) // 256)
            line.append(RAMP[idx])
        lines.append("".join(line).rstrip())
    return "\n".join(lines)


if __name__ == "__main__":
    path, cols = sys.argv[1], int(sys.argv[2])
    print(to_ascii(path, cols))
```

Invocation used: `python3 img2ascii.py full_moon.jpg 34`

## Final exact content (copy-paste ready)

**Dino (unchanged from what's already in `src/assets/ascii/home.txt`-style
usage — this is the wide/hero art, already exists in the repo, not new):**

```
              __
             / _)
      .-^^^-/ /
   __/       /
  <__.|_|-|_|
```

**Full moon, cratered (new — needs its own `.txt` file, e.g.
`src/assets/ascii/moon.txt`):**

```
          .-=+*###**++=-.
       .-=++++**#***##%##+-:
     .:-=============+##*+**+:
    ..-==-----=*++++=+***+++**+
  ...:-:...::--=+*++=+=+****++**.
 ..:-::::::::-===-:---=+*#*****#+
 ..:-:::::::-===-:::::-****+=--+=:
:...::-=-----=+=-::-:::=-=**:.:+=-
-..:=--+*+=-:--::-=-.....:-++=+-+-
:...:--==--::-===++:...:::-::--==:
:-...:---=-====*##*+=-:=+=:..:===:
 ==--:-::=-=+*+*#**##+=++*=-:-==-
  =*-.:----:=*+*****#%*--++====-
   -+-----::=********##*+****+:
    .-+++***#%%###********#+-
       :=+#%%%%##*******+=:
          :-+*##**++==-.
```

**Star field (new — sits between dino and moon, 14 stars, spread to fill
the gap; needs its own element/content, not necessarily a `.txt` file since
it's layout-dependent):**

```
   ·                                                              .

                          *

.                                                                        ·

                  ·                          *

     *                                                       .

                                    ·
.                          *                                       ·
```

**Shooting stars — 4, staggered, same down-right diagonal, gated on
`prefers-reduced-motion`:**

```html
<span class="shooting-star" style="top: -0.5rem; left: -1.5rem; --dx: 18rem; --dy: 6rem; --dur: 4.5s; --delay: 0s">✦</span>
<span class="shooting-star" style="top: -1rem; left: 20%; --dx: 14rem; --dy: 5rem; --dur: 5.2s; --delay: 3.1s">✦</span>
<span class="shooting-star" style="top: 0.5rem; left: 45%; --dx: 16rem; --dy: 5.5rem; --dur: 6s; --delay: 1.8s">✦</span>
<span class="shooting-star" style="top: -0.3rem; left: 68%; --dx: 15rem; --dy: 5.2rem; --dur: 7s; --delay: 0.9s">✦</span>
```

```css
.shooting-star {
  position: absolute;
  font-size: 0.7rem;
  color: var(--color-accent);
  opacity: 0;
}

.shooting-star::before {
  content: "";
  position: absolute;
  top: 0.45em;
  right: 100%;
  width: 5rem;
  height: 1px;
  background: linear-gradient(to left, currentColor, transparent);
  transform-origin: right center;
  transform: rotate(24deg);
}

@media (prefers-reduced-motion: no-preference) {
  .shooting-star {
    animation-name: shoot;
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.4, 1);
    animation-iteration-count: infinite;
    animation-duration: var(--dur);
    animation-delay: var(--delay);
  }
}

@keyframes shoot {
  0% {
    transform: translate(0, 0);
    opacity: 0;
  }
  4% {
    opacity: 1;
  }
  28% {
    transform: translate(var(--dx), var(--dy));
    opacity: 0;
  }
  100% {
    transform: translate(var(--dx), var(--dy));
    opacity: 0;
  }
}
```

**Layout for the dark-mode banner row (dino / stars / moon):**

```css
.banner-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
}

.stargap {
  flex: 1 1 auto;
  color: var(--color-muted); /* or a dedicated dim token — check contrast */
}

.moon {
  margin-right: 1.75rem; /* breathing room before the right edge */
}
```

Font sizes in the mockup (`0.68rem` dino/body, `0.44rem` moon, `0.5rem`
stars) were tuned for the mockup's card width, not the real site — will
need re-tuning against the actual banner container and the existing
narrow/wide breakpoint (`width >= 40rem`) once this is in `main.css`.

## What's NOT done yet — the actual TODO

1. Create `src/assets/ascii/moon.txt` (full moon content above) and decide
   whether it needs a narrow-viewport variant like the dino does
   (`home.txt` / `home-narrow.txt` pattern in `.eleventy.js`'s `ascii`
   shortcode).
2. Decide how the star field and shooting stars get into the template —
   likely `src/index.njk` markup changes plus new CSS in `main.css`, not
   the `ascii` shortcode (the star field's layout is CSS-driven, the moon
   uses the same shortcode mechanism as the dino).
3. Split light/dark banner content in the template: light mode shows dino
   only, dark mode shows dino + stars + moon + shooting stars. Current
   `.eleventy.js` `ascii` shortcode and `src/index.njk` don't have a
   theme-conditional path yet — this is new.
4. Update `src/assets/css/main.css` light-mode tokens:
   `--color-bg: #f7f5f0; --color-fg: #201e1a;` and drop/rework
   `--color-accent`/`--color-border` for the monochrome-with-underlines
   approach (no purple accent in light mode at all — nav links, body links
   need underline treatment instead of color).
5. Add the shooting-star CSS + `@keyframes` + `prefers-reduced-motion`
   gate to `main.css`, using `--color-accent` (dark mode's existing
   `#c9a6ff`) instead of the mockup's hardcoded `#e8e3f5`.
6. Re-run contrast verification on the new light-mode pair (`#201e1a` on
   `#f7f5f0` — already computed at 21.6:1, should just need confirming
   against real rendered CSS, not just the formula).
7. Narrow-viewport pass: the `space-between` dino/moon layout with a 54rem
   `min-width` in the mockup will not fit a phone screen — needs a
   stacked or hidden-on-narrow fallback, consistent with the existing
   `banner-narrow`/`banner-wide` pattern already in `main.css`.
8. `npm run lint && npx eleventy && npx html-validate _site` after changes.
9. Append a Phase 3 build-log entry addendum to
   `src/blog/building-this-site.md` covering this redesign round (the
   existing Phase 3 entry only covers the original implementation, not
   this banner rework).
10. Re-check the two Phase 3 checklist boxes this touches in `TASKS.md`
    (`main.css` tokens, contrast) — they're currently checked from the
    *original* implementation; confirm they still hold after these changes
    or leave a note if scope grew beyond what was originally checked off.
11. Resume the paused `finishing-a-development-branch` menu (merge
    locally / push+PR / keep-as-is) once all of the above is green.

## Known unknowns / open questions for next session

- Cactus: still wanted eventually, no shape has been approved yet. Don't
  build it speculatively.
- Star field color: mockup used `#7d75a0` (a hand-picked dim purple), not
  a token that exists in `main.css` — either add a new token or reuse
  `--color-muted` (`#b3aac9` in dark mode) and check how it looks.
- No live browser preview was available all session — Claude in Chrome
  was never confirmed connected (`/chrome` produced no output). Everything
  above was judged from static/animated Artifact mockups only. Worth
  connecting it next session before final visual sign-off, since exact
  spacing/sizing has only been eyeballed at mockup scale, not the real
  site's banner container.
