# Eslam Abdel Nasser

**Full-Stack Web Developer — Cairo, Egypt**

Seven years building production websites and the systems behind them. Laravel,
CakePHP and plain-PHP back-ends; React, Next.js and Vue on the front; and
bilingual Arabic/English interfaces where right-to-left is a first-class
requirement rather than a `dir="rtl"` afterthought.

Much of my work is **Arabic-language news, media and fact-checking platforms** —
newsrooms that need to publish fast, in Arabic, at scale. The rest is education,
humanitarian and corporate work across Egypt, the Gulf, the UK and Australia.

🏢 **TakTek** &nbsp;·&nbsp; 🌍 English / العربية &nbsp;·&nbsp; ⭐ 5.0 on Mostaql

[**LinkedIn**](https://www.linkedin.com/in/imsemooo/) &nbsp;·&nbsp; [**Upwork**](https://www.upwork.com/freelancers/imsemoo) &nbsp;·&nbsp; [**Mostaql**](https://mostaql.com/u/imsemoo/portfolio) &nbsp;·&nbsp; [**Portfolio**](https://imsemoo.github.io/Portfolio-Dark/)

---

## What I'm building

### احسبلي — [Ahsebli](https://ahsebli.com/)

Over 100 Arabic financial calculators for Saudi Arabia, the Gulf and Egypt:
salaries and end-of-service, Islamic loans and murabaha, zakat, gold at today's
price, income and VAT, currency — plus health and everyday tools.

Search is the whole distribution channel, so the plumbing is part of the
product: generated sitemap, RSS and Open Graph images, a glossary, category
hubs, and seasonal landing pages that go up when the search volume does. It is
an installable PWA with a service worker, so a calculator someone saved keeps
working offline.

### Devlo CMS — twenty-four newsrooms out of one codebase · *code private*

The platform behind six of the sites listed further down, [Quds News
Network](https://qudsn.co/) and [Maktoob Media](https://maktoobmedia.com/) among
them: one Laravel application, one deploy, twenty-four Arabic news sites, each
with its own theme, its own modules, its own languages and its own editorial
team.

| | |
|---|---|
| **Scale** | 456 Livewire components · 839 Blade views · 66 models · 247 migrations |
| **Tenancy** | 113 feature flags — nothing reaches a site that did not ask for it |
| **Access** | 40 permission modules × 4 actions, mirrored and re-synced by command |
| **Languages** | 5,874 keys in Arabic, English and Turkish, right-to-left throughout |
| **Guards** | 50 artisan commands, six of which exist to fail on a mistake nobody can see |
| **Demo** | [demo.taktek.co](https://demo.taktek.co/dashboard) |

Every dangerous mistake a fleet makes is silent: a feature leaking to
twenty-three other clients, a permission that exists on the route and nowhere
else, a missing English string that renders in Arabic because the fallback
locale is Arabic. So each of those has a command that fails, rather than a
convention that holds. [How it is put together](case-studies/devlo-cms.md).

### [Matn](https://imsemoo.github.io/matn-site/) — a CMS for hand-built newsroom sites · *code private*

After seven years of building newsrooms one at a time, the recurring problem was
always the same: the client needs to edit their site, and every page builder
destroys the design doing it.

Matn is the answer. The client opens their real page inside the admin panel,
clicks a heading to rewrite it and clicks a photo to swap it. There is no page
builder and no drag-and-drop — **the design stays locked**. Pages live in the
database rather than as files, every page shares one layout, and no URL carries
a `.html` extension.

| | |
|---|---|
| **Stack** | CakePHP 5.1 · PHP 8.1+ · MySQL 8 |
| **Panel** | English and Arabic, right-to-left throughout |
| **Quality** | PHPCS, PHPStan and 1,500 PHPUnit tests, all gated in CI |
| **Analytics** | First-party, no third-party trackers — session maths on SQL window functions |

---

## Performance, accessibility and SEO — measured weekly

<!-- PSI:START -->

A screenshot of a score proves nothing — it is a picture of one good run.
The table below is re-measured every Monday by a GitHub Action that calls
Google's PageSpeed Insights API and rewrites this section. Paste the same URL
into [pagespeed.web.dev](https://pagespeed.web.dev/) and you get the same report.

Each number is the median of three runs per device, because one run is not a
measurement — the same page answered 90, 79 and 80 on mobile within minutes.

A site joins this table when it passes, not when it ships: no category
below 90 on either device, held across three runs rather than caught once.
The rest of the fleet is measured on the same schedule and worked on until
it earns a row.

### مسند — [musnadye.com](https://musnadye.com/)

Arabic news and claim verification · Design and full-stack

![mobile scores](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fimsemoo%2Fimsemoo%2Fmain%2Fdata%2Fbadges%2Fmusnadye-com-mobile.json) ![desktop scores](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fimsemoo%2Fimsemoo%2Fmain%2Fdata%2Fbadges%2Fmusnadye-com-desktop.json)

| | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Mobile | **92** | **100** | **100** | **100** | 2.9 s | 0.014 | 90 ms |
| Desktop | **100** | **100** | **100** | **100** | 0.5 s | 0.011 | 40 ms |

<sub>Measured 14 September 2026 · Lighthouse 13.4.1 · [raw results](data/psi) · [workflow](.github/workflows/pagespeed.yml)</sub>
<!-- PSI:END -->


---

## Case studies

Four pieces of work where the interesting part was the diagnosis, written up
with the numbers and the rejected ideas rather than only the wins.

| | |
|---|---|
| [**Twenty-four newsrooms out of one codebase**](case-studies/devlo-cms.md) | The four invariants a multi-tenant CMS runs on, and the six commands that fail when something invisible goes wrong — a leaked feature flag, an unsynced permission, a string that was never a key |
| [**A template directive ate one key out of every site's structured data**](case-studies/json-ld-context-leak.md) | A literal `@context` in a Blade template compiles as Laravel's own directive, so 45 files shipped JSON-LD that parsed perfectly and meant nothing. Invisible in the browser, invisible in a diff — found by compiling the views instead of reading them |
| [**What a performance audit of a live newsroom actually finds**](case-studies/newsroom-performance-audit.md) | 749 KB of fonts down to 78 KB, a preload that was hurting, an optimisation I measured and threw away, and the Cloudflare rule that explains the TTFB nobody could move |
| [**Twenty-one newsrooms, twenty-one broken share cards**](case-studies/share-cards-that-actually-render.md) | Why a favicon, a WebP or a 400 KB image turns a shared link into a bare blue line on WhatsApp — and the one route, one service, one command that ended it |

---

## Production work

Live sites. Role stated exactly as it was.

### News, media & fact-checking

| Site | What it is | My role |
|---|---|---|
| [**Quds News Network**](https://qudsn.co/) | Palestinian news network — high-volume Arabic newsroom | Design **and** full-stack · Devlo CMS |
| [**Tayaqan**](https://tayqan.net/) — تيقن | Community platform for verifying news and claims | Design **and** full-stack · Devlo CMS |
| [**Maktoob Media**](https://maktoobmedia.com/) | Independent outlet covering human rights and minorities | Front-end (Figma → build), then the performance and security pass · Devlo CMS |
| [**Hodhod**](https://hodhodpal.ps/) — الهدهد | Palestinian news network | Full-stack (Figma → build) · Devlo CMS |
| [**Adeni Cast**](https://adenicast.com/) — عدني كاست | Independent Arabic podcast platform | Design **and** full-stack · Devlo CMS |
| [**Saleh Al-Arouri Archive**](https://al-arouri.net/) | Independent documentary archive | Design and front-end · Devlo CMS |

### Education, humanitarian & corporate

| Site | What it is | My role |
|---|---|---|
| [**OzCar**](https://www.ozcar.com.au/) | Australian car marketplace, a top-10 site in its market | Front-end (XD → build) |
| [**BESA**](https://www.besaeg.com/) | Study-abroad platform | Front-end (Figma → build) |
| [**Yedi Başak**](https://yedibasak.uk/) | UK humanitarian aid and charity | Full-stack, Laravel |
| [**HandsOnTV**](https://handsontv.co.uk/) | UK media organisation | Front-end (XD → build) |
| [**Power Line Egypt**](https://powerlineegypt.com/) | Engineering and contracting company | WordPress |

---

## Stack

**Back-end**
`PHP 8` · `Laravel` · `Livewire` · `CakePHP 5` · `MySQL` · `WordPress` · `REST APIs` · `Composer` · `PHPUnit` · `PHPStan`

**Front-end**
`JavaScript (ES6+)` · `TypeScript` · `React` · `Next.js` · `Vue 3` · `SCSS` · `Tailwind` · `Bootstrap` · `jQuery` · `GSAP` · `AOS`

**Craft**
Arabic/English bilingual UI · RTL layout with logical properties · responsive from 375 px up · semantic HTML · accessible forms · Figma and XD to pixel-accurate markup · on-page SEO · PWAs that work offline

**Tools**
`Git` · `GitHub Actions` · `Figma` · `Adobe XD` · `Laragon` · `VS Code`

---

## Code here on GitHub

Most client back-ends stay private. This is what I can show:

| Repo | What it is | Live |
|---|---|---|
| [`yassiru`](https://github.com/imsemoo/yassiru) | **يسّروا** — a Laravel + Vue platform for making marriage attainable: candidate matching, premarital courses and counselling, guarantee-fund savings circles, group weddings and digital contracts. Dockerised, Sanctum, Spatie roles | — |
| [`kevla-campa`](https://github.com/imsemoo/kevla-campa) | **KEVLA CAMPA** — marketing site for a Kevlar and carbon-fibre teardrop caravan. Plain HTML, CSS and ES modules with no build step: scroll scenes on CSS view timelines with a JavaScript fallback, page-to-page view transitions, self-hosted variable fonts. No axe-core violations across 24 page states | [↗](https://imsemoo.github.io/kevla-campa/) |
| [`mohajer`](https://github.com/imsemoo/mohajer) | News platform for migrants and refugees in Egypt and the Middle East | [↗](https://imsemoo.github.io/mohajer/) |
| [`yottasrc`](https://github.com/imsemoo/yottasrc) | Web-hosting provider site and client dashboard — bilingual EN/AR, multi-currency | — |
| [`besa`](https://github.com/imsemoo/besa) | The BESA front-end, 30+ hand-built pages | [↗](https://www.besaeg.com/) |
| [`Buruj`](https://github.com/imsemoo/Buruj) | Corporate site with a multi-step application form | [↗](https://imsemoo.github.io/Buruj/) |
| [`Intimedev`](https://github.com/imsemoo/Intimedev) | Agency site, scroll-driven animation | [↗](https://imsemoo.github.io/Intimedev/) |

---

## Get in touch

Open to full-stack and front-end work — [LinkedIn](https://www.linkedin.com/in/imsemooo/) · [Upwork](https://www.upwork.com/freelancers/imsemoo) · [Mostaql](https://mostaql.com/u/imsemoo/portfolio)
