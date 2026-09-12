# Devlo CMS — twenty-four newsrooms out of one codebase

**What** A multi-tenant publishing platform: one Laravel application, one deploy, twenty-four Arabic news sites, each with its own theme, its own modules, its own languages and its own editorial team
**My role** Architecture and full-stack — the dashboard, the theme layer, the guards, the deploy
**Live demo** [demo.taktek.co](https://demo.taktek.co/dashboard)

Six of the sites listed on my profile run on it, including
[Quds News Network](https://qudsn.co/) and [Maktoob Media](https://maktoobmedia.com/).

---

## The shape of it

| | |
|---|---|
| Sites served from one codebase | **24** (plus the demo) |
| Livewire components | **456** |
| Blade views | **839** |
| Eloquent models · migrations | **66** · **247** |
| Feature flags | **113** |
| Permission modules × 4 actions each | **40** |
| Artisan commands | **50** |
| Translation keys, in three languages | **5,874** |

Laravel 12 · Livewire 4 · MySQL · Spatie permissions · S3-compatible media · Arabic-first, RTL throughout.

## The problem a fleet actually has

Building one newsroom is a known job. Building twenty-four out of one codebase
changes which mistakes are possible, and all of the dangerous ones are silent:

- a feature written for one client appears on twenty-three other sites;
- a permission is added to the route but not to the sync map, so the module is
  invisible to everyone — or worse, visible to everyone;
- a new string ships untranslated and, because the fallback locale is Arabic,
  renders *in Arabic* on the English panel instead of failing;
- a migration edited in place runs differently on the sites that already ran it;
- a share image is a WebP, and links from that newsroom stop building cards on
  Telegram.

None of these throw. Every one of them is discovered by a client.

## The four invariants everything else follows from

**1. Nothing ships fleet-wide by default.** A new capability is born `false` in
`config/features/default.php` and is turned on in exactly one site's file. The
question "who gets this?" has to be answered in the same commit that writes it.

**2. Permissions are per-module, per-action, and self-guarded.** Route
middleware *and* an `abort_unless` inside every mutating method. Forty modules,
four actions each, mirrored in three places that a single command re-syncs:

```bash
php artisan permissions:sync
```

**3. Every user-facing string is a key, in every enabled language, in the same
commit.** Two different failures live here, so there are two commands. One
answers "is this key present in en and tr?" — the other answers the question the
first one cannot: *is this string a key at all?*

```bash
php artisan devlo:i18n-check    # complete, for every language, or the commit waits
php artisan devlo:i18n-leaks    # a hardcoded string is missing from nothing
```

**4. Migrations are additive and guarded.** `Schema::hasTable`, `hasColumn`,
never an edit to a migration that has already run somewhere. The whole fleet
runs `migrate --force` on deploy; the fleet is not in the same state.

## Turning knowledge into commands

The thing I would keep from this project if I kept nothing else: **every failure
that cannot be seen has a command that fails instead.**

| Command | The invisible failure it catches |
|---|---|
| `devlo:i18n-check` | A missing English key renders Arabic instead of erroring |
| `devlo:i18n-leaks` | A string that was never made translatable is missing from nothing |
| `devlo:share-check` | An og:image crawlers silently refuse — a favicon, a WebP, 400 KB |
| `devlo:news-check` | A release note gated to a site nobody is on, announced to no one |
| `devlo:css-subset` | A stylesheet subset that drops a class the coverage report never saw |
| `permissions:sync` | A module whose permission exists on the route and nowhere else |

They run before a commit lands, not after a client writes in. That list is the
real architecture of the project — more than the directory layout is.

## Per-site behaviour without per-site code

The rule is that a site may differ in *configuration*, not in *behaviour*.
Share previews are the clearest example: every site's `/share/{id}` is the same
controller, the same service and the same view, and the legitimate differences —
a podcast platform whose shareable object is an episode, a site that ships its
own fallback card — are five lines in `config/share.php`.
[The write-up of what that replaced](share-cards-that-actually-render.md) is a
good picture of what "each theme has its own copy" costs after a few years.

The same applies to the panel: a client's dashboard shows the modules their
feature flags enable, translated into the languages their site declares, with
the permissions their accounts hold. One binary, twenty-four experiences.

## What the client actually gets

- **A panel in their language**, right-to-left by default, where every label is
  a key rather than a string someone typed into a template.
- **Only the modules they bought**, because a flag that is off removes the
  route, the sidebar entry and the permission together.
- **A news centre inside the panel** that announces what changed, gated to the
  sites and the accounts a change is actually for — because a feature nobody is
  told about was not shipped.
- **A deploy that does not ask them anything**: pull, migrate, sync, done.

## What I would do differently

The guard commands arrived *after* the failures they catch, one at a time, each
written the day something silent reached a client. They should have been the
first thing built for each subsystem, not the lesson learned from it — writing
the check first also forces the question of what "correct" means for that
subsystem, which is the part that was actually missing.
