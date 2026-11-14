# AI ("Super Intelligence") usage disclosure

Space Apps 2026 asks every submission to say how AI tools were used. AI-generated images and video need a visible
watermark, and AI-generated code, data and audio must be acknowledged in text and metadata
([Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)).

## Tools

| Tool | Used for |
|---|---|
| Claude Code (Anthropic) | Web research and summaries of the hackathon rules, datasets, papers and prior work; feasibility analysis; first drafts of the docs; the code of the research dashboard |
| GitHub Copilot | Code completion during the build |

## Where the ideas came from

Team members wrote the candidate ideas (Lunar Shield, Slip Day, Trailbreaker, Earth analog search, Research Navigator,
Pollen & Bee, lunar hardware) before the research started. AI was used to assess them.

## Labelling rules for this repo

- AI-assisted source files start with a header comment: `# AI-assisted: <tool>, reviewed by <name>`.
- AI-generated images and video frames carry a visible "AI-generated" watermark.
- Generated media contains no NASA logos, flags or mission insignia.

## Log

| Date | Tool | What | Reviewed by |
|---|---|---|---|
| 2026-11-14 | Claude Code | `research/` reports, hackathon map, decision dashboard, README and CLAUDE.md drafts | _team_ |
| 2026-11-14 | Claude Code + Miro MCP | Miro "Idea review" section (ranking table, idea cards with sources, method notes); `research/00-methodology.md`; evidence lists in the dashboard | _team_ |
| 2026-11-14 | Claude Code | Feasibility of new Miro stickies (lunar solar-farm heatmap, data-center heat reframe); test scripts in `research/prototypes/`; dashboard entries | _team_ |
| 2026-11-14 | Claude Code | Lunar Shield UX prototype (synthetic data) and solution-architecture draft (`research/05-lunar-shield-architecture.md`) | _team_ |
| 2026-11-14 | Claude Code | Lunar Shield v2 feasibility, real-event backtest scripts (), physics-based UX simulation | _team_ |
