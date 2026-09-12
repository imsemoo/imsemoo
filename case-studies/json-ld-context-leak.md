# A template directive ate one key out of every site's structured data

**Where** A Laravel/Blade CMS serving 21 Arabic news sites from one codebase
**Symptom** None. Nothing errored, nothing looked wrong, no tool complained out loud
**Blast radius** 45 view files, most of the fleet, for as long as the templates had existed

---

## What was actually shipping

Every article page carried a JSON-LD block for Google — `NewsArticle`, headline,
author, publisher, dates. It was built the obvious way, inside the template:

```blade
<script type="application/ld+json">
{!! json_encode([
    '@context' => 'https://schema.org',
    '@type'    => 'NewsArticle',
    'headline' => $post->title,
]) !!}
</script>
```

What reached the browser was this, with the key replaced by roughly two hundred
characters of compiled PHP:

```json
{ "<?php $__contextArgs = []; ... ?>": "https://schema.org",
  "@type": "NewsArticle", "headline": "…" }
```

Blade compiles templates before anything is rendered, and `@context` is one of
its own directives. A literal `'@context'` sitting in template text — even
inside a PHP array that is only ever passed to `json_encode` — is compiled as
that directive, and the string it emits becomes the key.

The result is JSON that still **parses**. It is syntactically valid, it renders
nothing visible, and it survives every check that asks "is this valid JSON".
What it does not have is a context, and a schema.org node without `@context` is
not structured data — it is a dictionary. Google reads it as nothing.

## Why it stayed hidden

- **Invisible in the browser.** Structured data is in a `<script>` tag; the page
  looks identical.
- **Invisible in a diff.** The source says `'@context' => 'https://schema.org'`.
  The bug lives in the compile step, not in the text you review.
- **Invisible to the obvious test.** "Does the page contain `@context`?" passes:
  the source does. "Is the JSON valid?" passes too.
- **Invisible to the rich-results test, unless you read it carefully** — it
  reports the item as not detected rather than as malformed.

## Finding every instance

Grep cannot answer this, because the string being searched for is in every file
whether or not it breaks. The question is not *is `@context` written here*, it
is *does this file still contain `@context` after Blade has compiled it*. So the
detector compiles each view and looks for the tell-tale of the directive's own
output:

```php
$compiler = app('blade.compiler');

foreach ($views as $file) {
    $source = file_get_contents($file);
    if (!str_contains($source, '@context')) continue;                 // nothing to do
    if (str_contains($compiler->compileString($source), '__contextArgs')) {
        echo $file, "\n";                                             // leaks
    }
}
```

No rendering, no database, no HTTP — it compiles strings. It ran over the whole
`resources/views` tree in a couple of seconds and returned the exact file list:
every site's layout, plus most single-post templates. 45 files.

## The fix, and the trap inside the fix

Build the array where Blade is not looking, and echo the encoded string:

```blade
@php
    $schema = [
        '@context' => 'https://schema.org',   // a PHP file: Blade never sees this
        '@type'    => 'NewsArticle',
        'headline' => $post->title,
    ];
@endphp
<script type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) !!}</script>
```

Then a second trap, found the expensive way on the first site: **the literal
word `@php` must never appear inside a Blade comment.** Raw-block extraction
runs *before* comment stripping, so a comment that mentions the directive eats
its own closer and swallows everything up to the next one. A `<head>` quietly
lost its JSON-LD, its style stack and its credits — and still returned 200.
Documentation about this bug now spells the directives out in prose.

## Verifying it

The assertion is not "the source contains `@context`" — that was always true.
It is **"the rendered response does not contain `__contextArgs`"**, which is the
only thing the failure actually produces. Rendered, asserted, per site, with the
page cache purged first so the check does not read a copy made before the fix.

## What I took from it

A bug with no symptom needs a detector, not a review. The review had passed on
these files repeatedly — for years, by everyone — because reading the source is
reading the wrong artifact. Once the question was asked of the *compiled*
output, the whole fleet answered in two seconds.

The same reasoning now runs as a guard on three other invisible-by-design
failures in the same codebase: translation keys that fall back to Arabic
instead of erroring, share images crawlers silently refuse, and news items
gated to nobody.
