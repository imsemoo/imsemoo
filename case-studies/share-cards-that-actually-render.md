# Twenty-one newsrooms, twenty-one different broken share cards

**Where** The same multi-site Laravel CMS: one codebase, 21 Arabic news sites
**Symptom** "Our links look ugly on WhatsApp." Sometimes. On some phones. Not on Facebook
**Why it is hard** Every one of these failures is silent, and each platform fails differently

---

## The thing about share previews

When a reader pastes an article link into WhatsApp, Telegram, Facebook or X,
each platform sends its own crawler, reads its own subset of Open Graph tags,
applies its own rules about image format and size, and — when it does not like
what it finds — shows a bare blue line instead of a card. No error reaches the
publisher. The newsroom finds out when an editor complains that their scoop
looked like a spam link.

Before this work, each of the 21 themes had grown its own `/share/{id}` handler,
and they had drifted:

- several fell back to **the site's favicon** when an article had no picture.
  WhatsApp and Telegram will not build a card from a 32 px icon, so the preview
  collapsed to a line of text.
- one fell back to a **WebP** logo. Telegram does not render it at all.
- several **pre-escaped the description** that Blade then escaped again, so
  readers saw `&amp;amp;` inside the preview text.
- about half were **a bare redirect with no Open Graph tags whatsoever** — they
  worked by accident whenever the destination article happened to have its own.
- one site had **no share route at all**.

Each of those is a five-minute fix in one theme, and a permanent source of
regressions across 21.

## What replaced it

One route, one service, one view, for every site:

```
/share/{id}  →  ShareController  →  SharePreview  →  share-redirect.blade.php
```

The view emits the tags, waits a beat for the crawler to read them, and sends a
human on to the article. The service decides *what* those tags say. Nothing is
per-theme any more — and the per-site differences that are legitimate live in
exactly one file, `config/share.php`:

```php
'defaults' => [
    'post_route'         => null,        // main.<site>.show_post
    'route_params'       => ['slug' => 'slug'],
    'prefix_site_name'   => false,       // see below
    'fallback_image'     => null,        // a real 1200×630 JPEG, or nothing
    'description_length' => 200,
],
```

Two of those defaults are opinions worth stating:

- **`prefix_site_name` is false on purpose.** Telegram and WhatsApp give
  `og:title` a single line, and `og:site_name` already carries the brand.
  Prefixing it ate the part of the headline that earns the click.
- **`description_length` is 200.** Facebook shows around 300 characters,
  WhatsApp and Telegram far fewer. 200 reads as a complete sentence everywhere
  instead of a truncated one somewhere.

A site appears in the `sites` array only when it genuinely differs — a podcast
platform whose shareable object is an episode rather than a post, or a site that
ships its own fallback card because its archive contains articles with no image
at all.

## The rules the fallback image has to obey

This is where the silent failures live, so they are written down as hard rules
rather than left to whoever adds the next site:

| Rule | Why |
|---|---|
| A real 1200×630-ish JPEG or PNG | Crawlers drop a card rather than scale up an icon |
| Never a favicon, never `.ico`, never `.svg` | WhatsApp and Telegram refuse them outright |
| Never WebP | Telegram will not render it |
| Under 300 KB | Over that, some crawlers time out and show nothing |
| Served from the site's own domain, over HTTPS | A cross-origin or mixed-content image is silently skipped |
| Real dimensions declared in `og:image:width`/`height` | Lying about them gets the card cropped or rejected |

## Making it stay fixed

The fix is worthless if the 22nd site can reintroduce any of it, so the rules
are a command rather than a paragraph in a wiki:

```bash
php artisan devlo:share-check
```

It walks every enabled site, resolves what the share route would actually emit,
fetches the resolved image, and asserts the format, the byte size, the
dimensions and the origin. It fails the build, not the editor's evening.

The same idea now guards the other invisible failure classes in that codebase:
one command for missing translations, one for strings that were never made
translatable, one for structured data that does not carry a context, one for
news items gated to nobody.

## What I took from it

A silent, platform-specific failure cannot be reviewed by eye, and will not stay
fixed by documentation. Centralise the behaviour so there is one place to be
right, push the legitimate differences into configuration so they are visible in
one screen, and then write the check that fails when someone is wrong anyway.
