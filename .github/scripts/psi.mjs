#!/usr/bin/env node
/**
 * Re-measure every site in .github/psi-sites.json with Google's PageSpeed
 * Insights API and write the results into the repository:
 *
 *   data/psi/<slug>.json                latest full summary, per site
 *   data/psi/history.ndjson             one appended line per site per run
 *   data/badges/<slug>-<strategy>.json  shields.io endpoint payloads
 *   README.md                           the table between the PSI markers
 *
 * The numbers are Google's own: anybody can paste the same URL into
 * https://pagespeed.web.dev/ and get them back.
 *
 * Usage: node .github/scripts/psi.mjs [--dry] [--all] [--only=a,b]
 *        --only only these sites (substring of the URL or the name)
 *        --samples=N runs per strategy; the median record is published (default 3, or 1 with --dry)
 *        --dry  print the rendered section, write nothing
 *        --all  measure sites flagged "psi": false too (pair it with --dry)
 * Env:   PAGESPEED_API_KEY (required in CI; the anonymous quota is shared
 *        across the whole internet and is usually exhausted)
 */

import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITES = path.join(ROOT, '.github', 'psi-sites.json');
const README = path.join(ROOT, 'README.md');
const START = '<!-- PSI:START -->';
const END = '<!-- PSI:END -->';

const STRATEGIES = ['mobile', 'desktop'];
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const DRY = process.argv.includes('--dry');
// Comma-separated substrings matched against the URL or the name, so one run
// can re-measure the site that just changed instead of the whole fleet.
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '')
  .slice(7)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const KEY = process.env.PAGESPEED_API_KEY || '';
// A publish is worth three runs per strategy; a dry look is one, because it
// exists to answer "roughly where is this site" over the whole fleet.
const SAMPLES = Number(
  (process.argv.find((a) => a.startsWith('--samples=')) || '').slice(10) || (DRY ? 1 : 3)
);

const slugify = (url) =>
  new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lighthouse's own thresholds, so a badge is never greener than the gauge. */
function colorFor(score) {
  if (score === null || score === undefined) return 'lightgrey';
  if (score >= 90) return 'brightgreen';
  if (score >= 50) return 'orange';
  return 'red';
}

async function runPsi(url, strategy) {
  const q = new URLSearchParams({ url, strategy });
  for (const c of CATEGORIES) q.append('category', c);
  if (KEY) q.set('key', KEY);
  const endpoint = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?' + q;

  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      // PSI can hold a connection open for a minute and then drop the body
      // ("terminated"). An explicit deadline makes that a retry rather than a
      // dead run.
      const res = await fetch(endpoint, {
        headers: { 'User-Agent': 'imsemoo-profile-psi' },
        signal: AbortSignal.timeout(120000),
      });
      if (res.ok) return res.json();
      const body = await res.text();
      lastError = new Error('PSI ' + res.status + ' for ' + url + ' (' + strategy + '): ' + body.slice(0, 300));
      // 429 and 5xx are worth waiting out; any other 4xx will not fix itself.
      if (res.status !== 429 && res.status < 500) throw lastError;
    } catch (err) {
      lastError = err;
    }
    if (attempt < 4) await sleep(attempt * 15000);
  }
  throw lastError;
}

const score = (lhr, id) => {
  const raw = lhr && lhr.categories && lhr.categories[id] ? lhr.categories[id].score : null;
  return typeof raw === 'number' ? Math.round(raw * 100) : null;
};

const metric = (lhr, id) => {
  const audit = (lhr && lhr.audits && lhr.audits[id]) || {};
  return { value: audit.numericValue ?? null, display: audit.displayValue ?? null };
};

/** CrUX field data — present only once a site has enough real traffic. */
function fieldData(result) {
  const exp = result && result.loadingExperience;
  if (!exp || !exp.metrics) return null;
  const pick = (k) => (exp.metrics[k] ? exp.metrics[k].percentile : null);
  return {
    overall: exp.overall_category ?? null,
    lcp_ms: pick('LARGEST_CONTENTFUL_PAINT_MS'),
    inp_ms: pick('INTERACTION_TO_NEXT_PAINT'),
    cls: pick('CUMULATIVE_LAYOUT_SHIFT_SCORE'),
  };
}

function summarise(result) {
  const lhr = result.lighthouseResult;
  return {
    scores: {
      performance: score(lhr, 'performance'),
      accessibility: score(lhr, 'accessibility'),
      'best-practices': score(lhr, 'best-practices'),
      seo: score(lhr, 'seo'),
    },
    metrics: {
      lcp: metric(lhr, 'largest-contentful-paint'),
      cls: metric(lhr, 'cumulative-layout-shift'),
      tbt: metric(lhr, 'total-blocking-time'),
      fcp: metric(lhr, 'first-contentful-paint'),
      si: metric(lhr, 'speed-index'),
    },
    field: fieldData(result),
    lighthouseVersion: (lhr && lhr.lighthouseVersion) || null,
    fetchTime: (lhr && lhr.fetchTime) || new Date().toISOString(),
    finalUrl: (lhr && (lhr.finalDisplayedUrl || lhr.finalUrl)) || null,
  };
}

/**
 * One PSI run is not a measurement. The same site answered 90, then 79, then
 * 80 on mobile within minutes, so a single sample can put a site over or under
 * the bar by chance. Take N runs and publish the MEDIAN record whole — never a
 * metric-by-metric mix, which would describe a page that never existed.
 */
async function measure(url, strategy, samples) {
  const runs = [];
  for (let i = 0; i < samples; i++) {
    if (i) await sleep(3000);
    runs.push(summarise(await runPsi(url, strategy)));
  }
  const ranked = [...runs].sort(
    (a, b) => (a.scores.performance ?? -1) - (b.scores.performance ?? -1)
  );
  const median = ranked[Math.floor(ranked.length / 2)];
  return {
    ...median,
    samples: runs.length,
    performanceSamples: runs.map((r) => r.scores.performance),
  };
}

const cell = (n) => (n === null || n === undefined ? '—' : String(n));
const shown = (m) => (m && m.display ? m.display.replace(/ /g, ' ') : '—');

function renderSection(entries, measuredAt) {
  const lines = [];
  lines.push('');
  lines.push('A screenshot of a score proves nothing — it is a picture of one good run.');
  lines.push('The table below is re-measured every Monday by a GitHub Action that calls');
  lines.push("Google's PageSpeed Insights API and rewrites this section. Paste the same URL");
  lines.push('into [pagespeed.web.dev](https://pagespeed.web.dev/) and you get the same report.');
  lines.push('');
  lines.push('Each number is the median of three runs per device, because one run is not a');
  lines.push('measurement — the same page answered 90, 79 and 80 on mobile within minutes.');
  lines.push('');
  lines.push('A site joins this table when it passes, not when it ships: no category');
  lines.push('below 90 on either device, held across three runs rather than caught once.');
  lines.push('The rest of the fleet is measured on the same schedule and worked on until');
  lines.push('it earns a row.');
  lines.push('');

  for (const entry of entries) {
    const site = entry.site;
    const results = entry.results;
    const host = new URL(site.url).hostname.replace(/^www\./, '');
    const slug = slugify(site.url);

    lines.push('### ' + site.name + ' — [' + host + '](' + site.url + ')');
    lines.push('');
    const sub = [site.note, site.role].filter(Boolean).join(' · ');
    if (sub) {
      lines.push(sub);
      lines.push('');
    }

    const badge = (strategy) =>
      '![' + strategy + ' scores](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fimsemoo%2Fimsemoo%2Fmain%2Fdata%2Fbadges%2F' +
      slug + '-' + strategy + '.json)';
    lines.push(badge('mobile') + ' ' + badge('desktop'));
    lines.push('');

    lines.push('| | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const strategy of STRATEGIES) {
      const label = strategy === 'mobile' ? 'Mobile' : 'Desktop';
      const r = results[strategy];
      if (!r) {
        lines.push('| ' + label + ' | — | — | — | — | — | — | — |');
        continue;
      }
      lines.push(
        '| ' + label +
          ' | **' + cell(r.scores.performance) + '**' +
          ' | **' + cell(r.scores.accessibility) + '**' +
          ' | **' + cell(r.scores['best-practices']) + '**' +
          ' | **' + cell(r.scores.seo) + '**' +
          ' | ' + shown(r.metrics.lcp) +
          ' | ' + shown(r.metrics.cls) +
          ' | ' + shown(r.metrics.tbt) + ' |'
      );
    }
    lines.push('');

    const withField = STRATEGIES.map((s) => results[s]).find((r) => r && r.field && r.field.overall);
    if (withField) {
      const f = withField.field;
      const secs = (ms) => (ms === null ? '—' : (ms / 1000).toFixed(2) + ' s');
      lines.push(
        'Field data (real Chrome users, 28-day rolling): **' + f.overall + '** — ' +
          'LCP ' + secs(f.lcp_ms) + ' · ' +
          'INP ' + (f.inp_ms === null ? '—' : f.inp_ms + ' ms') + ' · ' +
          'CLS ' + (f.cls === null ? '—' : (f.cls / 100).toFixed(2)) + '.'
      );
      lines.push('');
    }
  }

  const version = entries
    .flatMap((e) => STRATEGIES.map((s) => e.results[s] && e.results[s].lighthouseVersion))
    .find(Boolean);
  lines.push(
    '<sub>Measured ' + measuredAt + (version ? ' · Lighthouse ' + version : '') +
      ' · [raw results](data/psi) · [workflow](.github/workflows/pagespeed.yml)</sub>'
  );
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const all = JSON.parse(await readFile(SITES, 'utf8'));
  // A site is published once it earns it: "psi": false keeps it out of the
  // README table. `--all` measures every site anyway, which is what a dry run
  // is for — the numbers go to the job log and nowhere else.
  let sites = process.argv.includes('--all') ? all : all.filter((s) => s.psi !== false);
  if (ONLY.length) sites = sites.filter((s) => ONLY.some((o) => s.url.includes(o) || s.name.includes(o)));
  await mkdir(path.join(ROOT, 'data', 'psi'), { recursive: true });
  await mkdir(path.join(ROOT, 'data', 'badges'), { recursive: true });

  if (!KEY) {
    console.warn('! PAGESPEED_API_KEY is not set — the anonymous quota is shared and usually exhausted.');
  }

  const entries = [];
  const failures = [];

  for (const site of sites) {
    const slug = slugify(site.url);
    const results = {};

    for (const strategy of STRATEGIES) {
      process.stdout.write('· ' + site.url + ' (' + strategy + ') … ');
      try {
        const summary = await measure(site.url, strategy, SAMPLES);
        results[strategy] = summary;
        console.log(
          Object.entries(summary.scores)
            .map(([k, v]) => k + ' ' + cell(v))
            .join('  ') +
            (summary.samples > 1
              ? '   (median of ' + summary.samples + ': perf ' + summary.performanceSamples.join('/') + ')'
              : '')
        );
      } catch (err) {
        console.log('failed');
        console.error('  ' + err.message);
        failures.push(site.url + ' (' + strategy + ')');
      }
      await sleep(2000); // stay well inside the per-minute quota
    }

    if (!Object.keys(results).length) continue;
    entries.push({ site, results });
    if (DRY) continue;

    const record = { name: site.name, url: site.url, measuredAt: new Date().toISOString(), results };
    await writeFile(path.join(ROOT, 'data', 'psi', slug + '.json'), JSON.stringify(record, null, 2) + '\n');
    await appendFile(path.join(ROOT, 'data', 'psi', 'history.ndjson'), JSON.stringify(record) + '\n');

    for (const strategy of STRATEGIES) {
      const r = results[strategy];
      if (!r) continue;
      const s = r.scores;
      const worst = Math.min.apply(null, Object.values(s).filter((v) => v !== null));
      await writeFile(
        path.join(ROOT, 'data', 'badges', slug + '-' + strategy + '.json'),
        JSON.stringify(
          {
            schemaVersion: 1,
            label: strategy,
            message:
              'perf ' + cell(s.performance) +
              ' · a11y ' + cell(s.accessibility) +
              ' · bp ' + cell(s['best-practices']) +
              ' · seo ' + cell(s.seo),
            color: colorFor(Number.isFinite(worst) ? worst : null),
            cacheSeconds: 3600,
          },
          null,
          2
        ) + '\n'
      );
    }
  }

  if (!entries.length) {
    console.error('No site could be measured — leaving README and data untouched.');
    process.exit(1);
  }

  const measuredAt = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const section = renderSection(entries, measuredAt);

  const readme = await readFile(README, 'utf8');
  const from = readme.indexOf(START);
  const to = readme.indexOf(END);
  if (from === -1 || to === -1 || to < from) {
    console.error('README is missing the ' + START + ' / ' + END + ' markers.');
    process.exit(1);
  }
  const next = readme.slice(0, from + START.length) + '\n' + section + readme.slice(to);

  if (DRY) process.stdout.write('\n' + section + '\n');
  else await writeFile(README, next);

  if (failures.length) {
    console.error('Measured with gaps — failed: ' + failures.join(', '));
    process.exit(1);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
