#!/usr/bin/env node
// Builds every SVG used by the profile README into ./assets.
//
// Visual language: an e-ink screen (the same idea behind nodedesk-eink).
// Ink on paper, a handful of gray levels, 1px rules, 1-bit pixel icons and
// dither patterns. No gradients, no glow, no blur, no shadows.
//
// Live data (stars, contributions, languages) comes from the GitHub API when
// a token is available (PROFILE_TOKEN or GITHUB_TOKEN); otherwise the last
// values saved in assets/data.json are reused.
//
// Usage: GITHUB_TOKEN=$(gh auth token) node scripts/build.mjs

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets");
const CACHE = join(OUT, "data.json");
const USER = "JonathanLemes";
const TOKEN = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN || "";

mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- theme ---

// A few of the sixteen gray levels an e-ink panel can show.
const PAPER = "#f2f0eb", STRIPE = "#e8e5de", LIGHT = "#d9d6cf", MID = "#a8a49c", DARK = "#62605a", INK = "#1c1b19";
const MONO = "ui-monospace,'JetBrains Mono','IBM Plex Mono',Menlo,Consolas,'Liberation Mono',monospace";
const CW = 7.8; // average glyph width of the 13px mono face, used for the typing effect

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const svg = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}" font-family="${MONO}">
<title>${esc(title)}</title>
<defs>
  <pattern id="dither-ink" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${MID}"/><rect width="1" height="1" fill="${INK}"/><rect x="1" y="1" width="1" height="1" fill="${INK}"/></pattern>
  <pattern id="dither" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${PAPER}"/><rect width="2" height="2" fill="${MID}"/><rect x="2" y="2" width="2" height="2" fill="${MID}"/></pattern>
  <pattern id="dither-light" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${PAPER}"/><rect width="1" height="1" fill="${MID}"/><rect x="2" y="2" width="1" height="1" fill="${MID}"/></pattern>
</defs>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="6" fill="${PAPER}" stroke="${INK}"/>
${body}
</svg>
`;

const text = (x, y, s, { size = 13, fill = INK, weight = 400, anchor = "start", extra = "" } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`;

// Inverted title bar, the way e-ink dashboards mark a section.
const bar = (w, label, right = "") => `
<path d="M6.5 0.5h${w - 13}a6 6 0 0 1 6 6v21.5h-${w - 1}v-21.5a6 6 0 0 1 6-6z" fill="${INK}"/>
${text(16, 19, label, { size: 12, fill: PAPER, weight: 700 })}
${right ? text(w - 16, 19, right, { size: 12, fill: LIGHT, anchor: "end" }) : ""}`;

const wrap = (s, max) => {
  const lines = [];
  let line = "";
  for (const word of s.split(" ")) {
    if ((line + " " + word).trim().length > max) {
      lines.push(line.trim());
      line = word;
    } else line += " " + word;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
};

// ----------------------------------------------------------- pixel icons ---

const BITMAPS = {
  window: [
    "################",
    "#..............#",
    "#.#.#.#........#",
    "################",
    "#..............#",
    "#.#####..#####.#",
    "#.#####........#",
    "#.#####..####..#",
    "#.#####........#",
    "#.#####..#####.#",
    "#..............#",
    "################",
  ],
  kindle: [
    "..##########..",
    "..#........#..",
    "..#.######.#..",
    "..#........#..",
    "..#.####...#..",
    "..#........#..",
    "..#......#.#..",
    "..#.#...#..#..",
    "..#..#.#...#..",
    "..#...#....#..",
    "..#........#..",
    "..##########..",
    "..#...##...#..",
    "..##########..",
  ],
  phone: [
    "...########...",
    "..#........#..",
    "..#.#......#..",
    "..#..#.....#..",
    "..#.#.###..#..",
    "..#........#..",
    "..#.#####..#..",
    "..#........#..",
    "..#.###....#..",
    "..#........#..",
    "..#..####..#..",
    "..#..####..#..",
    "..#........#..",
    "...########...",
  ],
  tv: [
    "################",
    "#..............#",
    "#.....#........#",
    "#.....##.......#",
    "#.....###......#",
    "#.....####.....#",
    "#.....###......#",
    "#.....##.......#",
    "#.....#........#",
    "#..............#",
    "################",
    ".......##.......",
    ".....######.....",
  ],
};

function pixelIcon(name, x, y, size) {
  const rows = BITMAPS[name];
  const px = Math.floor(size / Math.max(rows.length, rows[0].length));
  const ox = x + Math.round((size - rows[0].length * px) / 2);
  const oy = y + Math.round((size - rows.length * px) / 2);
  let d = "";
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c === "#") d += `M${ox + i * px} ${oy + j * px}h${px}v${px}h-${px}z`;
    }),
  );
  return `<path d="${d}" fill="${INK}" shape-rendering="crispEdges"/>`;
}

// ------------------------------------------------------------ live data ---

const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

const MARKUP = ["CSS", "HTML", "SCSS", "Shell", "Dockerfile", "Makefile", "CMake", "Batchfile", "PowerShell"];

async function fetchLive() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-readme-build" },
    body: JSON.stringify({
      variables: { login: USER },
      query: `query($login:String!){
        user(login:$login){
          repositories(first:100, ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC){
            nodes{ name stargazerCount
              languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{ name } } } }
          }
          contributionsCollection{
            commitContributionsByRepository(maxRepositories:100){
              contributions{ totalCount }
              repository{ isPrivate languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{ name } } } }
            }
            contributionCalendar{ totalContributions
              weeks{ contributionDays{ date contributionCount } } }
          }
        }
      }`,
    }),
  });
  const json = await res.json();
  if (json.errors || !json.data) throw new Error(JSON.stringify(json.errors ?? json));
  const repos = json.data.user.repositories.nodes;
  const cc = json.data.user.contributionsCollection;
  const cal = cc.contributionCalendar;

  // Languages are weighted by where the commits went in the last 12 months,
  // private repos included when the token can see them. Each repo's commits
  // are split across its languages by code size. Only totals are stored, so
  // private repo names never reach this public repo.
  const languages = {};
  const touched = cc.commitContributionsByRepository;
  for (const { contributions, repository } of touched) {
    const edges = repository.languages.edges.filter((e) => !MARKUP.includes(e.node.name));
    const size = edges.reduce((a, e) => a + e.size, 0);
    for (const e of edges) languages[e.node.name] = (languages[e.node.name] ?? 0) + (contributions.totalCount * e.size) / size;
  }
  // Fallback when there are no commits in the window: public code by size.
  if (!Object.keys(languages).length)
    for (const r of repos) for (const e of r.languages.edges) languages[e.node.name] = (languages[e.node.name] ?? 0) + e.size;
  return {
    updated: new Date().toISOString().slice(0, 10),
    stars: Object.fromEntries(repos.map((r) => [r.name, r.stargazerCount])),
    totalStars: repos.reduce((a, r) => a + r.stargazerCount, 0),
    publicRepos: repos.length,
    reposTouched: touched.length,
    privateReposTouched: touched.filter((t) => t.repository.isPrivate).length,
    languages,
    total: cal.totalContributions,
    weeks: cal.weeks.map((w) => w.contributionDays.map((d) => [d.date, d.contributionCount])),
  };
}

let live = cache;
if (TOKEN) {
  try {
    live = await fetchLive();
    writeFileSync(CACHE, JSON.stringify(live, null, 1) + "\n");
    console.log("live data updated");
  } catch (e) {
    console.warn("could not fetch live data, keeping cache:", e.message);
  }
} else console.warn("no token: using cached live data");

// ------------------------------------------------------------------ hero ---

function hero() {
  const W = 1000, H = 320;
  const lines = [
    { t: "$ whoami", cmd: true },
    { t: "jonathan lemes, software engineer, brazil" },
    { t: "$ cat focus", cmd: true },
    { t: "react, react native, next.js, typescript, go" },
    { t: "$ ls ~/open-source", cmd: true },
    { t: "nodedesk  nodedesk-eink  reilai  moonlight-vega-os  jellyfin-vega-os" },
    { t: "$ ", cmd: true, cursor: true },
  ];
  const x = 32, top = 132, lh = 25;
  let t = 0.3;
  const term = lines
    .map((l, i) => {
      const y = top + i * lh;
      if (!l.cmd) {
        // output appears at once, like a real terminal
        const out = `<g opacity="0"><set attributeName="opacity" to="1" begin="${t.toFixed(2)}s" fill="freeze"/>${text(x, y, l.t, { extra: 'xml:space="preserve"' })}</g>`;
        t += 0.15;
        return out;
      }
      // commands are typed one character at a time
      const n = l.t.length;
      const dur = Math.max(0.3, n * 0.06);
      const id = `c${i}`;
      const steps = Array.from({ length: n + 1 }, (_, k) => (k * CW + (k ? 2 : 0)).toFixed(1)).join(";");
      const out = `<clipPath id="${id}"><rect x="${x - 2}" y="${y - 14}" height="20" width="0"><animate attributeName="width" values="${steps}" calcMode="discrete" dur="${dur}s" begin="${t.toFixed(2)}s" fill="freeze"/></rect></clipPath>
${text(x, y, l.t, { fill: DARK, extra: `clip-path="url(#${id})" xml:space="preserve"` })}
${l.cursor ? `<rect x="${x + 2 * CW}" y="${y - 12}" width="8" height="15" fill="${INK}" opacity="0"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.01;0.5;0.51" dur="1.1s" begin="${t.toFixed(2)}s" repeatCount="indefinite"/></rect>` : ""}`;
      t += dur + 0.3;
      return out;
    })
    .join("\n");

  const rx = 700, rw = 268;
  const block = (y, label, value) => `
<rect x="${rx + 0.5}" y="${y + 0.5}" width="${rw}" height="64" fill="none" stroke="${INK}"/>
${text(rx + 14, y + 22, label, { size: 11, fill: DARK })}
${text(rx + 14, y + 49, value, { size: 20, weight: 700 })}`;

  const icons = ["window", "kindle", "phone", "tv"];
  const body = `
${bar(W, "JONATHAN LEMES", "pt · en · es")}
${text(x, 76, "Software Engineer", { size: 30, weight: 700 })}
${text(x, 100, "web, mobile, tv and e-ink", { fill: DARK })}
<path d="M${x} 112.5h630" stroke="${LIGHT}"/>
${term}
${block(46, "first line of code", "2015")}
${block(122, "shipping software since", "2018")}
<rect x="${rx + 0.5}" y="198.5" width="${rw}" height="92" fill="url(#dither-light)" stroke="${INK}"/>
${icons.map((n, i) => `<rect x="${rx + 18.5 + i * 62}" y="218.5" width="52" height="52" fill="${PAPER}" stroke="${INK}"/>${pixelIcon(n, rx + 27 + i * 62, 227, 36)}`).join("")}`;
  return svg(W, H, body, "Jonathan Lemes, Software Engineer");
}

// -------------------------------------------------------------- projects ---

const PROJECTS = [
  {
    repo: "NodeDesk",
    icon: "window",
    desc: "A desktop in the browser for a home server: apps, Docker, files, storage, a web terminal and live monitoring, shipped as one Go binary.",
    tags: ["go", "react", "typescript", "sqlite"],
  },
  {
    repo: "nodedesk-eink",
    icon: "kindle",
    desc: "A jailbroken Kindle as a server dashboard. Go samples the host and draws grayscale PNGs at the device's exact resolution, no headless browser.",
    tags: ["go", "linux", "fbink"],
  },
  {
    repo: "reilai",
    icon: "phone",
    desc: "Start, follow and approve Claude Code and Codex sessions from the terminal, the browser or a phone, over an end-to-end encrypted tunnel.",
    tags: ["bun", "typescript", "reactlynx"],
  },
  {
    repo: "Moonlight-Vega-OS",
    icon: "tv",
    desc: "Game streaming on Fire TV (Vega OS). React Native UI over a C++ TurboModule that wraps moonlight-common-c and reads the gamepad off the JS bridge.",
    tags: ["react native", "c++"],
  },
  {
    repo: "Jellyfin-Vega-OS",
    icon: "tv",
    desc: "A Jellyfin client for Fire TV (Vega OS) with its own HLS player written on top of Media Source Extensions.",
    tags: ["react native", "typescript", "hls"],
  },
];

function projectCard(p) {
  const W = 490, H = 180;
  const stars = live.stars?.[p.repo];
  const lines = wrap(p.desc, 46);
  const body = `
${bar(W, p.repo, stars ? `★ ${stars}` : "")}
<rect x="18.5" y="44.5" width="76" height="76" fill="url(#dither-light)" stroke="${INK}"/>
<rect x="28.5" y="54.5" width="56" height="56" fill="${PAPER}" stroke="${INK}"/>
${pixelIcon(p.icon, 34, 60, 44)}
${lines.map((l, i) => text(112, 58 + i * 19, l, { size: 12.5 })).join("\n")}
<path d="M18 ${H - 39.5}h${W - 36}" stroke="${LIGHT}"/>
${text(18, H - 17, p.tags.join(" · "), { size: 12, fill: DARK })}
${text(W - 18, H - 17, "open ->", { size: 12, fill: DARK, anchor: "end" })}`;
  return svg(W, H, body, `${p.repo}: ${p.desc}`);
}

// -------------------------------------------------------------- activity ---

function activity() {
  const W = 1000, H = 300;
  const weeks = live.weeks ?? [];
  const days = weeks.flat();
  const sorted = days.map((d) => d[1]).filter(Boolean).sort((a, b) => a - b);
  const q = (p) => sorted[Math.floor(p * (sorted.length - 1))] ?? 1;
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const level = (v) => (v === 0 ? 0 : 1 + cuts.filter((c) => v > c).length);
  // Zero is an empty outlined box; any activity is a solid fill, so a day
  // with a single commit never reads as an empty one.
  const scale = [PAPER, MID, "url(#dither-ink)", DARK, INK];
  const cellAttrs = (lv) => (lv === 0 ? `fill="${PAPER}" stroke="${LIGHT}"` : `fill="${scale[lv]}"`);
  const cell = 10, gap = 3, gx = 24, gy = 66;

  const grid = weeks
    .map((w, wi) =>
      w
        .map(([date, v]) => {
          const dow = new Date(date + "T00:00:00Z").getUTCDay();
          return `<rect x="${gx + wi * (cell + gap)}" y="${gy + dow * (cell + gap)}" width="${cell}" height="${cell}" ${cellAttrs(level(v))}><title>${date}: ${v}</title></rect>`;
        })
        .join(""),
    )
    .join("");
  const gridW = 53 * (cell + gap) - gap;

  const weekly = weeks.map((w) => w.reduce((a, d) => a + d[1], 0));
  const wmax = Math.max(1, ...weekly);
  const by = 252, bh = 60;
  const bars = weekly
    .map((v, i) => {
      const h = Math.round((v / wmax) * bh);
      return h ? `<rect x="${gx + i * (cell + gap)}" y="${by - h}" width="${cell}" height="${h}" fill="${INK}"/>` : "";
    })
    .join("");

  const activeDays = days.filter((d) => d[1] > 0).length;
  const sx = gx + gridW + 34;
  const langs = Object.entries(live.languages ?? {}).filter(([n]) => !MARKUP.includes(n));
  const ltotal = langs.reduce((a, [, s]) => a + s, 0) || 1;
  const top = langs.sort((a, b) => b[1] - a[1]).slice(0, 5);
  const lw = W - sx - 24 - 130;

  const stat = (x, y, label, value) => `${text(x, y, label, { size: 11, fill: DARK })}
${text(x, y + 27, value, { size: 23, weight: 700 })}`;

  const body = `
${bar(W, "ACTIVITY", `last 12 months · synced ${live.updated ?? ""}`)}
${text(gx, 54, "contributions per day", { size: 11, fill: DARK })}
${grid}
${text(gx, by - bh - 10, "per week", { size: 11, fill: DARK })}
${bars}
<path d="M${gx} ${by + 0.5}h${gridW}" stroke="${INK}"/>
${text(gx, by + 24, "less", { size: 11, fill: DARK })}
${scale.map((_, i) => `<rect x="${gx + 38 + i * 14}" y="${by + 14}" width="10" height="10" ${cellAttrs(i)}/>`).join("")}
${text(gx + 112, by + 24, "more", { size: 11, fill: DARK })}
<path d="M${sx - 17.5} 44v${H - 64}" stroke="${LIGHT}"/>
${stat(sx, 54, "contributions", (live.total ?? 0).toLocaleString("en-US"))}
${stat(sx + 130, 54, "active days", `${activeDays}`)}
${stat(sx, 110, "repos with commits", `${live.reposTouched ?? live.publicRepos ?? 0}`)}
${stat(sx + 130, 110, "stars", `${live.totalStars ?? 0}`)}
${text(sx, 172, "languages, weighted by commits", { size: 11, fill: DARK })}
${top
  .map(([name, size], i) => {
    const y = 194 + i * 19;
    const pct = size / ltotal;
    return `${text(sx, y, name.toLowerCase(), { size: 11.5 })}
<rect x="${sx + 90}" y="${y - 9}" width="${lw}" height="9" fill="${LIGHT}"/>
<rect x="${sx + 90}" y="${y - 9}" width="${Math.max(2, pct * lw).toFixed(1)}" height="9" fill="${INK}"/>
${text(W - 24, y, `${Math.round(pct * 100)}%`, { size: 11.5, fill: DARK, anchor: "end" })}`;
  })
  .join("\n")}`;
  return svg(W, H, body, "GitHub activity");
}

// ----------------------------------------------------------------- stack ---

function stack() {
  const W = 1000;
  const groups = [
    ["languages", "typescript, javascript, go, python, c++, sql"],
    ["web", "react, next.js, angular, tailwind, shadcn/ui, tanstack query"],
    ["mobile", "react native, expo, ionic, electron, vega os"],
    ["backend", "node.js, bun, elysia, hono, graphql, websocket"],
    ["data", "postgresql, sqlite, drizzle, supabase"],
    ["infra", "docker, aws, gcp, terraform, vercel, linux"],
    ["quality", "jest, cypress, playwright, sentry, tdd"],
    ["ai", "claude code, codex, claude agent sdk, mcp, ollama"],
  ];
  const lh = 26, top = 50;
  const H = top + groups.length * lh + 8;
  const body = `
${bar(W, "STACK", "~/.config/stack")}
${groups
  .map(([k, v], i) => {
    const y = top + i * lh;
    return `${i % 2 ? "" : `<rect x="1" y="${y - 17}" width="${W - 2}" height="${lh}" fill="${STRIPE}"/>`}
${text(24, y, k, { weight: 700 })}
${text(150, y, v, { fill: DARK })}`;
  })
  .join("\n")}`;
  return svg(W, H, body, "Tech stack");
}

// --------------------------------------------------------------- journey ---

function journey() {
  const W = 1000;
  // Ongoing roles carry no date on purpose, so the page never goes stale.
  const rows = [
    { ref: "HEAD", year: "", what: "open source", note: "home server desktop, e-ink dashboard, fire tv clients, ai agent tooling" },
    { ref: "", year: "", what: "Medgrupo", note: "medical education apps: angular, ionic, electron, single-spa microfrontends" },
    { ref: "", year: "", what: "BairesDev", note: "software engineer and team leader for us clients: staffzone, racino.io" },
    { ref: "", year: "", what: "PartiuRolê", note: "co-founder: event and ticketing apps in expo, monorepo api, infra on gcp" },
    { ref: "", year: "", what: "Uniamérica", note: "computer engineering degree" },
    { ref: "", year: "2021", what: "DigitalSys", note: "medpass: real-time telehealth on web and mobile with react native and twilio" },
    { ref: "", year: "2019", what: "Find My Profession", note: "resumezest: payments, admin, live chat; later engineering manager" },
    { ref: "", year: "", what: "Black Bee Drones", note: "computer vision experiments for drones: python, opencv, tensorflow" },
    { ref: "", year: "2018", what: "Advantech", note: "energy management and monitoring central at UNIFEI: node-red, influxdb" },
    { ref: "", year: "2015", what: "CTIG · UNESP", note: "computer technician, where it started" },
  ];
  const lh = 32, top = 58;
  const H = top + rows.length * lh - 4;
  const gx = 32;
  const body = `
${bar(W, "JOURNEY", "git log --graph career")}
<path d="M${gx} ${top - 4}V${top + (rows.length - 1) * lh - 4}" stroke="${INK}" stroke-width="2"/>
${rows
  .map((r, i) => {
    const y = top + i * lh;
    const dot = i === 0
      ? `<rect x="${gx - 6}" y="${y - 10}" width="12" height="12" fill="${INK}"/>`
      : `<rect x="${gx - 5}" y="${y - 9}" width="10" height="10" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>`;
    return `${dot}
${text(gx + 24, y, r.ref || r.year || "·", { fill: DARK, weight: r.ref ? 700 : 400 })}
${text(gx + 84, y, r.what, { weight: 700 })}
${text(gx + 264, y, r.note, { fill: DARK })}`;
  })
  .join("\n")}`;
  return svg(W, H, body, "Career history");
}

// ------------------------------------------------------------------ write ---

const files = {
  "hero.svg": hero(),
  "activity.svg": activity(),
  "stack.svg": stack(),
  "journey.svg": journey(),
};
for (const p of PROJECTS) files[`project-${p.repo.toLowerCase()}.svg`] = projectCard(p);
for (const [name, content] of Object.entries(files)) writeFileSync(join(OUT, name), content);
console.log(`wrote ${Object.keys(files).length} svgs to assets/`);
