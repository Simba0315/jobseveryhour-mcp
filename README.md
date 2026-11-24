# Jobs Every Hour MCP server

[![Simba0315/jobseveryhour-mcp MCP server](https://glama.ai/mcp/servers/Simba0315/jobseveryhour-mcp/badges/score.svg)](https://glama.ai/mcp/servers/Simba0315/jobseveryhour-mcp)
[![Jobs Every Hour MCP connector](https://glama.ai/mcp/connectors/com.jobseveryhour/jobs/badges/score.svg)](https://glama.ai/mcp/connectors/com.jobseveryhour/jobs)

An [MCP](https://modelcontextprotocol.io) server that lets Claude, ChatGPT, Cursor and other AI assistants search open jobs from
[Jobs Every Hour](https://jobseveryhour.com/): jobs read every hour from employers' own career pages (Greenhouse, Lever, Ashby,
Workday, iCIMS and other hiring systems). Closed jobs are removed, and every job links to a page whose Apply button goes to the
employer's own application.

It reads the site's [free JSON API](https://jobseveryhour.com/api/), which needs no key and no account.

## Tools

| Tool | What it returns |
| --- | --- |
| `latest_jobs` | The newest open jobs (optionally remote only) |
| `jobs_by_skill` | Jobs that ask for a skill: Python, React, SQL, Kubernetes, Salesforce... |
| `jobs_by_category` | Jobs in a field: engineering, healthcare, sales, operations... |
| `jobs_by_location` | Jobs in a country, region or city: united-states, europe, london... |
| `jobs_by_company` | Jobs at one employer, from its own career page |
| `list_feeds` | The skills, categories, locations and companies you can ask for, with job counts |

Each tool returns up to 30 of the newest jobs with title, employer, place, remote flag, advertised pay, posting date and link.

## Fastest: the hosted server (no install)

Jobs Every Hour runs the same data as a remote MCP server over Streamable HTTP, with a word search over every open job:

```
https://jobseveryhour.com/mcp
```

Tools there: `search_jobs` (words matched in title, company, skills, place and text, best match first, optional remote filter) and
`get_job` (one posting in full). In Claude, add it under Settings → Connectors → Add custom connector; in Cursor or VS Code, add
`{"url": "https://jobseveryhour.com/mcp"}` as a server. No key, no account.

## Install the local server

Needs Node.js 18 or newer.

**Claude Desktop** (`claude_desktop_config.json`), **Cursor** (`.cursor/mcp.json`) and other clients that start a local server:

```json
{
  "mcpServers": {
    "jobseveryhour": {
      "command": "npx",
      "args": ["-y", "github:Simba0315/jobseveryhour-mcp"]
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add jobseveryhour -- npx -y github:Simba0315/jobseveryhour-mcp
```

Then ask, for example: "Find remote Python jobs posted this week", "What is Stripe hiring for?" or "Show nursing jobs in Texas".

## Notes

- Feeds change every hour; the server caches each one for an hour.
- Use of the data: free for personal and commercial projects with a link back to the job page or to jobseveryhour.com.
- Issues and ideas: open an issue in this repository.

## License

MIT
