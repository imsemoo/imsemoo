# What a performance audit of a live newsroom actually finds

**Where** maktoobmedia.com — an independent outlet, mostly read on Android phones in India, served from a single-core shared host in Europe
**Brief** "The site feels slow on mobile"
**Constraint** A live newsroom. Nothing may go dark, and no change is worth a regression nobody can see

---

## First: build something that can tell two builds apart

Running Lighthouse against production from a laptop gave results that moved ±20
points between identical runs. Any change worth 5 points is invisible in that
much noise, and a number that cannot resolve the change it is measuring will
approve whatever you already believe.

So the audit started with the rig, not the site:

- two local static servers, each serving one asset tree — `git archive` of the
  old commit, and the new one — behind the **real production HTML**;
- Brotli on both, including `.ttf`, or the old build is made to look worse than
  it is;
- runs **interleaved** old / new / old / new, never all-old-then-all-new, so
  thermal throttling and background noise hit both arms equally;
- five pairs minimum, and the ranges are reported, not the best run.

Everything below was accepted or rejected by that rig.

## What the audit found

| | Before | After |
|---|---|---|
| Webfonts | 749 KB — raw Noto TTFs, plus a duplicate Google Fonts copy of the same family | 78 KB — self-hosted, subsetted WOFF2, headline family aliased onto the body variable file |
| Font Awesome | 302 KB across three faces | 31.6 KB |
| Logo | 46 KB — a 1158×472 PNG, base64'd inside an SVG wrapper | 7.5 KB WebP |
| Author-photo fallback | 70 KB — a 1668×1250 PNG rendered into a 32 px circle | 4.6 KB |
| Bootstrap | 232 KB, 1,295 CSSOM rules | 107 KB, 652 rules (22.8 → 13.3 KB brotli) |
| Dead weight in the repo | 17 MB of fonts and demo images nothing had ever requested | removed |

Then the things that were not weight at all:

- **Third-party scripts were landing mid-paint.** Deferring them to `load` was
  not enough: once the page got light, `load` fired at ~450 ms and the ad stack
  arrived in the middle of the LCP again. They are now released one at a time,
  after the LCP has settled.
- **The LCP preload was re-running a query the page had already run**, so the
  hint that exists to make the hero arrive sooner was making the server do the
  work twice.
- **`<link rel=preload as=font>` measurably hurt** — 36 KB at High priority
  ahead of the stylesheets cost roughly 500 ms of FCP. With `font-display:swap`
  and an image LCP, it buys nothing. Removed.
- **The stylesheet's own comments** cost 1.8 KB of render-blocking transfer.
  Small, but it is the cheapest kilobyte anyone will ever ship.

And three findings that were not performance problems at all, but were found by
reading the same requests:

- `/gaza` — a section the newsroom links from social — was a **permanent**
  redirect to an unrelated article from 2023.
- The header could not fit on a 360 px phone, which is a large share of the
  actual audience.
- The geo lookup answering 429 meant Indian readers were quoted the wrong
  currency, silently, for an unknown period.
- A post title containing the right characters could close the JSON-LD block
  and execute as HTML. That one was a security fix, not a speed fix.

## The change I measured and threw away

`content-visibility: auto` on the off-screen bands is the standard advice for a
long homepage, and it was the obvious next win.

Five interleaved pairs: **84 vs 83**, every range overlapping.

The result is conclusive rather than inconclusive, and that is the interesting
part: Lighthouse never scrolls, so with `content-visibility` on, those bands
were *never rendered at all*. A page doing strictly less work should have
scored higher. It did not — which says the layout being skipped was never the
cost. Selector matching against ~2,000 elements was, and subsetting Bootstrap is
what actually moved it.

It is in the write-up with its numbers, and the note says not to re-propose it
without a new measurement.

## The finding that mattered most, and could not be shipped

TTFB stayed stubborn after everything above, because Cloudflare answered
`cf-cache-status: DYNAMIC` for HTML while every asset said HIT.

`DYNAMIC` does not mean "rejected because of your headers" — that is `BYPASS`.
It means **not eligible for cache by default**. The decisive evidence was on the
same origin and the same zone: an image route rendered by the application, with
no file extension of its own, was being cached with `age=6294`. Cloudflare keys
default eligibility off the URL's extension; HTML has none it recognises.
`s-maxage` and `CDN-Cache-Control` only set the TTL *after* something is
eligible — the origin had been sending them correctly all along.

One Cache Rule fixes it. Edge TTL must respect the origin's cache-control rather
than override it, or an authenticated render's `no-store` stops protecting
logged-in members.

That rule needs dashboard access that was not mine to use, so it shipped as a
document, with the evidence, for whoever holds the account.

## What I took from it

Three things, in the order they cost me time:

1. **Build the instrument before the fix.** Half of this audit is a rig. The
   half that is code would have been guesswork without it.
2. **Report what was rejected.** A performance write-up with no rejected changes
   is a write-up where nothing was actually measured.
3. **"Measured on production" and "served by production" are different claims.**
   The deploy script exiting 0 is not evidence that the bytes you measured are
   the bytes being served. Verify the second one separately.
