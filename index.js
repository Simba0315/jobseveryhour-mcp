#!/usr/bin/env node
// MCP server for Jobs Every Hour: open jobs in every field, mostly in the United States, read from employers' own career pages
// and rechecked around the clock. It reads the site's free JSON API (https://jobseveryhour.com/api/), which needs no key.
// The feeds change several times a day, so answers are cached for an hour.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API = "https://jobseveryhour.com/api/v1/";
const HOUR = 3600 * 1000;
const cache = new Map();

async function getJson(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < HOUR) return hit.data;
  const res = await fetch(API + path, { headers: { "user-agent": "jobseveryhour-mcp/1.0.2" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Jobs Every Hour API answered ${res.status} for ${path}`);
  const data = await res.json();
  cache.set(path, { at: Date.now(), data });
  return data;
}

const slugify = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function feeds(kind) {
  const index = await getJson("index.json");
  return (index?.feeds || []).filter((f) => f.feed.includes(`/api/v1/${kind}/`))
    .map((f) => ({ name: f.name, slug: f.feed.split("/").pop().replace(/\.json$/, ""), total: f.total }));
}

function summary(feed, limit, remoteOnly) {
  let jobs = feed.jobs || [];
  if (remoteOnly) jobs = jobs.filter((j) => j.remote);
  jobs = jobs.slice(0, limit);
  const lines = jobs.map((j, i) => `${i + 1}. ${j.title} at ${j.company} | ${j.location || "location not stated"}${j.remote ? " | remote" : ""}`
    + `${j.salary ? " | " + j.salary : ""} | posted ${j.posted || "?"}\n   ${j.url}`);
  return `${feed.name}: ${feed.total.toLocaleString("en-US")} open on Jobs Every Hour (updated ${feed.updated}). `
    + `Newest ${jobs.length} shown; every link opens the job, whose Apply button goes to the employer's own page.\n\n`
    + (lines.join("\n") || "No jobs in this feed right now.") + `\n\nAll of them: ${feed.url}`;
}

async function byKind(kind, value, limit, remoteOnly) {
  const slug = slugify(value);
  const feed = await getJson(`${kind}/${slug}.json`);
  if (feed) return summary(feed, limit, remoteOnly);
  const all = await feeds(kind);
  const words = slug.split("-").filter(Boolean);
  const close = all.filter((f) => words.some((w) => f.slug.includes(w))).slice(0, 15);
  return `No ${kind.replace(/s$/, "")} feed named "${value}". `
    + (close.length ? "Close matches: " + close.map((f) => `${f.name} (${f.slug}, ${f.total})`).join("; ")
      : `Use list_feeds with kind "${kind}" to see the ${all.length} that exist.`);
}

const text = (t) => ({ content: [{ type: "text", text: t }] });
const limit = z.number().int().min(1).max(30).default(10).describe("How many of the newest jobs to show, 1 to 30");
const remoteOnly = z.boolean().default(false).describe("Only remote jobs");
// Every tool only reads public job postings: nothing is changed or deleted, and the jobs are those of thousands of employers.
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: true };

const COVERAGE = "open jobs in every field (healthcare, engineering, sales, skilled trades, retail, office, education, government and more), "
  + "mostly in the United States, plus remote jobs and jobs in many other countries";
const server = new McpServer({ name: "jobseveryhour", version: "1.0.2" }, {
  instructions: `Jobs Every Hour: ${COVERAGE}. Every job is read from the employer's own career page (US federal jobs from USAJOBS), `
    + "and the lists are rechecked around the clock, so closed jobs drop out. latest_jobs gives the newest; jobs_by_skill, jobs_by_category, "
    + "jobs_by_location and jobs_by_company narrow them; list_feeds says what exists. Each job shows the place, the pay when the posting "
    + "states it and the posting date. Always give the person the job's link; people apply on the employer's own site.",
});

server.registerTool("latest_jobs", {
  title: "Newest jobs",
  description: `The newest ${COVERAGE} on Jobs Every Hour, read from employers' own career pages (Workday, Greenhouse, iCIMS, Lever, Ashby and more) `
    + "and rechecked around the clock. Each job has the place, the pay when stated, the posting date and its link.",
  inputSchema: { limit, remote_only: remoteOnly },
  annotations,
}, async ({ limit, remote_only }) => text(summary(await getJson(remote_only ? "remote.json" : "latest.json"), limit, false)));

server.registerTool("jobs_by_skill", {
  title: "Jobs by skill",
  description: "Open jobs that ask for a skill, in any field: Python, SQL, Excel, Salesforce, CPR, forklift, patient care, customer service and more.",
  inputSchema: { skill: z.string().describe("A skill, e.g. Python or CPR"), limit, remote_only: remoteOnly },
  annotations,
}, async ({ skill, limit, remote_only }) => text(await byKind("skills", skill, limit, remote_only)));

server.registerTool("jobs_by_category", {
  title: "Jobs by category",
  description: "Open jobs in a field of work: healthcare, engineering, sales, manufacturing and trades, retail and hospitality, education, "
    + "operations, finance, supply chain, customer service, marketing, design, legal and more.",
  inputSchema: { category: z.string().describe("A field of work, e.g. healthcare"), limit, remote_only: remoteOnly },
  annotations,
}, async ({ category, limit, remote_only }) => text(await byKind("categories", category, limit, remote_only)));

server.registerTool("jobs_by_location", {
  title: "Jobs by location",
  description: "Open jobs in a country, US state, region or large city, such as united-states, texas, california, new-york, chicago, canada, london or europe.",
  inputSchema: { location: z.string().describe("A country, US state, region or city, e.g. Texas"), limit, remote_only: remoteOnly },
  annotations,
}, async ({ location, limit, remote_only }) => text(await byKind("locations", location, limit, remote_only)));

server.registerTool("jobs_by_company", {
  title: "Jobs at a company",
  description: "Open jobs at one employer, read from its own career page.",
  inputSchema: { company: z.string().describe("A company name, e.g. Stripe"), limit, remote_only: remoteOnly },
  annotations,
}, async ({ company, limit, remote_only }) => text(await byKind("companies", company, limit, remote_only)));

server.registerTool("list_feeds", {
  title: "What can be searched",
  description: "The skills, categories, locations or companies that have a feed, with the number of open jobs in each.",
  inputSchema: { kind: z.enum(["skills", "categories", "locations", "companies"]), contains: z.string().optional().describe("Only names containing this text") },
  annotations,
}, async ({ kind, contains }) => {
  let all = await feeds(kind);
  if (contains) all = all.filter((f) => f.name.toLowerCase().includes(contains.toLowerCase()) || f.slug.includes(slugify(contains)));
  all.sort((a, b) => b.total - a.total);
  return text(`${all.length} ${kind}:\n` + all.slice(0, 200).map((f) => `${f.name} (${f.slug}): ${f.total}`).join("\n")
    + (all.length > 200 ? `\n... and ${all.length - 200} more; narrow it with "contains".` : ""));
});

await server.connect(new StdioServerTransport());
