# AI ("Super Intelligence") usage disclosure

Space Apps 2026 asks every submission to say how AI tools were used. AI-generated images and video need a visible
watermark, and AI-generated code, data and audio must be acknowledged in text and metadata
([Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)).

## Tools

| Tool | Used for |
|---|---|
| Claude Code (Anthropic) | Research-phase analysis of candidate ideas; code, tests and docs for the pollination marketplace (each change reviewed by a team member) |
| GitHub Copilot | Code completion during the build |

## Where the ideas came from

Team members wrote the candidate ideas before the research started (see "Ideas we considered" in the README); AI was
used to assess them, not to invent them. The chosen solution grew out of the team's Pollen & Bee EO Monitor idea.

## Labelling rules for this repo

- AI-assisted source files start with a header comment: `# AI-assisted: <tool>, reviewed by <name>`.
- AI-generated images and video frames carry a visible "AI-generated" watermark.
- Generated media contains no NASA logos, flags or mission insignia.

## Log

Research-phase entries refer to files that were later removed from the working tree; they remain in git history.

| Date | Tool | What | Reviewed by |
|---|---|---|---|
| 2026-11-14 | Claude Code | `research/` reports, hackathon map, decision dashboard, README and CLAUDE.md drafts | _team_ |
| 2026-11-14 | Claude Code + Miro MCP | Miro "Idea review" section (ranking table, idea cards with sources, method notes); `research/00-methodology.md`; evidence lists in the dashboard | _team_ |
| 2026-11-14 | Claude Code | Feasibility of new Miro stickies (lunar solar-farm heatmap, data-center heat reframe); test scripts in `research/prototypes/`; dashboard entries | _team_ |
| 2026-11-14 | Claude Code | Lunar Shield UX prototype (synthetic data) and solution-architecture draft (`research/05-lunar-shield-architecture.md`) | _team_ |
| 2026-11-14 | Claude Code | Lunar Shield v2 feasibility, real-event backtest scripts (`research/prototypes/lunar-shield-backtest/`), physics-based UX simulation | _team_ |
| 2026-11-14 | Claude Code | WP6 NASA POWER client (`src/pollination/nasa/power.py`) + tests, incl. live-data grid check | Patrik P. Süli |
| 2026-11-14 | Claude Code | Lint fix of `scripts/probe_earthdata.py`; Docker Compose stack and CI docker job; repo cleanup, README, CLAUDE.md, DECISIONS.md rewrite | Patrik P. Süli |
