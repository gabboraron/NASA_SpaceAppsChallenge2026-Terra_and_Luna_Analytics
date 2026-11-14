# NASA Space Apps Challenge 2026: Pollination Marketplace

Python backend + TypeScript frontend. The repo contains only this project; earlier candidate ideas live in git history only.
Project summary: the `project-context` skill. Build plan: `docs/implementation_plans/nasa_space_apps_48_hour_hackathon_mvp_planv3.md`
(decisions D1–D24, work packages WP0–WP25; one GitHub issue per WP).

## Layout
- `src/pollination/` FastAPI app: `models.py` (API contract), `contract.py` (routes), `config.py` (pydantic-settings),
  `datafiles.py`, `geo.py`, `weeks.py` (season calendar), `state.py`, `engine/` (calculator, phenology, timeline, matching), `nasa/` (cache, POWER, HLS, SMAP)
- `verification/` standalone checks of the model against past ground truth (hive scales, iNaturalist, PEP725); own README, not in CI
- `tests/` pytest; `frontend/` React + Vite + TS + CSS Modules + MapLibre (+ Terra Draw)
- `data/` committed config/geometry (parcels, Natura 2000, phenology, synthetic actors, ranking); raw NASA data is never committed; the only exception is the small warmed response cache `data/nasa-cache.zip` (set up with `docs/cache_setup.md`)
- `scripts/` one-off data builders + Earthdata probe; `docs/` plan + `ENGINEERING_GUIDE.md` (git/commit/release, security, testing)
- `compose.yaml`, `Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`: Docker stack
- `pyproject.toml` is the single source of tool config; `uv.lock` is committed
- `.github/` CI, PR-title check, Dependabot; `.pre-commit-config.yaml` local gate; `.claude/` skills + hooks; `repos/` reference clones (gitignored)

## Python standards (enforced by tooling, not just by this file)
- Python 3.12+. **Package management is uv only**: `uv add <pkg>` / `uv add --dev <pkg>` / `uv remove` / `uv sync` / `uv run <cmd>`. Never use pip, `pip install`, or hand-edit dependencies or `uv.lock`. Commit `uv.lock`. (If `uv` isn't on PATH, use `python -m uv`.)
- Run tools through uv: `uv run ruff`, `uv run pyright`, `uv run pytest`.
- Tool versions are pinned per project in `pyproject.toml` / `uv.lock`. Never rely on or install global copies of ruff/pyright/pytest; always `uv run`.
- Ruff's `PL` rules cover Pylint (standalone Pylint is not used); Pyright strict is the same engine as Pylance, so editor and CLI agree.
- Full type hints on every signature, return type included. Use `list[str]`, `X | None`. No bare `Any` without a reason comment. Must pass `pyright` strict.
- Google-style docstrings on all public modules/classes/functions (summary, Args, Returns, Raises). Don't repeat types in docstrings.
- PEP 8 / PEP 257 via ruff. Never add `# noqa` or `# type: ignore` without a one-line reason.
- Pythonic: pathlib, f-strings, comprehensions, dataclasses/pydantic, context managers. No `print()` in src or scripts; use `logging`.
- A PostToolUse hook auto-fixes and checks every edited `.py` file. If it reports errors, fix them before moving on.
- Before saying "done": `uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run pytest`. This is exactly what CI runs.
- Library/API questions (torch, pandas, pydantic...): use context7, don't guess signatures.

## Testing
- Unit tests mock HTTP (`pytest-httpx`). Anything touching a NASA source must **also be checked against live data**
  (probe script in a scratch dir, not committed) and the result stated in the PR. Example: the live check of WP6 showed
  POWER uses the MERRA-2 grid (0.5° lat × 0.625° lon), not the plan's 0.5°.
- Docker changes: `docker compose up -d --build --wait`, then `curl localhost:8080/api/health`; CI runs the same smoke test.

## Skill routing (one default per job)
- New feature or design: `superpowers:brainstorming`, then `superpowers:writing-plans`. Hackathon: keep plans under one page.
- Implementation: follow `ponytail` (full): smallest complete change, stdlib first.
- Non-trivial logic: `superpowers:test-driven-development`.
- Bugs/failures: `superpowers:systematic-debugging`.
- Review: `/code-review` for PRs, `ponytail-review` for quick checks; `code-simplifier` after big changes.
- Claiming completion: `superpowers:verification-before-completion`.
- Don't use the `mattpocock-skills` tdd / diagnosing-bugs / code-review skills; they duplicate the above.
- Update this file with `claude-md-management:revise-claude-md` after sessions.

## AI-engineering conventions
- Validate data/config with pydantic; no hard-coded paths, keys or hyperparameters in code.
- Seed all randomness; log seeds. Secrets only from env vars, never committed (`.env` is denied).
- Note array/tensor shapes and dtypes in docstrings (`NDArray[np.float32]`, `(batch, seq, dim)`).

## Git and commits
- Trunk-based: short-lived branches (`feat/`, `fix/`, `chore/`, `docs/`, `build/`) off `main`, squash-merge PRs. Never force-push shared branches.
- Conventional Commits, enforced by a commit-msg hook: `type(scope): imperative summary` (feat, fix, perf, refactor, test, docs, build, ci, chore, revert). `!` or `BREAKING CHANGE:` for breaking changes. SemVer: feat=minor, fix=patch, breaking=major.
- One logical change per commit; checks must pass on every commit. Never use `--no-verify`.
- Pick work from GitHub issues (one per WP); assign yourself before starting; the PR closes the issue.

## CI/CD
- GitHub Actions (`.github/workflows/ci.yml`) runs on every push to main and every PR: `check` (`uv sync --locked`, ruff, ruff format check, pyright, pytest with coverage), `frontend` (npm ci, tsc, eslint, prettier, vite build), `docker` (compose build + smoke test). Keep it green; don't merge red.
- pre-commit (`.pre-commit-config.yaml`) runs the same Python checks locally. Install once with `uv run pre-commit install`.
- CI also runs `pip-audit` on the locked deps and a gitleaks secret scan; the PR title must be a Conventional Commit.
- Dependabot updates uv deps and Actions weekly. Dependency changes go through `uv add` so the lockfile stays in sync (CI fails on a stale lock).

## Run
- Docker: `docker compose up --build` → map at http://localhost:8080, API docs at http://127.0.0.1:8000/docs.
  NASA cache lives in the `nasa-cache` volume. Optional `.env` (Earthdata creds, `WEB_PORT`, `API_PORT`, `VITE_USE_MOCKS`).
- Local: `uv run uvicorn pollination.api:app --reload` + `cd frontend && npm run dev` (Vite proxies `/api` → :8000).
- The API image's runtime needs `libexpat1` for rasterio's bundled GDAL; keep it when changing the base image.

## Pollination API contract

Update `src/pollination/models.py` and the generated frontend types together
in the same PR when changing the contract. From the repository root, start
`uv run uvicorn pollination.api:app` and regenerate in a second terminal:

```sh
npx --yes openapi-typescript@7.13.0 http://127.0.0.1:8000/openapi.json -o frontend/src/api/schema.d.ts
```

Backend routes use the paths in issue #8. Strip the browser-facing `/api`
prefix in the frontend proxy (Vite in dev, nginx in Docker). Timeline weeks are numbered 1–26 from March 1.
WP2 responses are synthetic fixtures; live data and verification state belong to WP13.

## Domain rules (from the plan; don't break them)
- Present the product as general and worldwide; never name the pilot region in public-facing text (README, UI).
  Pilot region bbox: lon 21.6–22.4, lat 47.7–48.05 (`Settings.bbox`). Demo years 2022 (drought) vs 2024.
- Every displayed value carries a `Provenance` (Reported / Observed / Estimated / Missing, source, `observed_at`,
  interpolated, note). Interpolated weeks are never presented as observations. NASA failures → `Missing` with a reason, never fabricated values.
- Bloom: sunflower from HLS NDYI; apple, sour cherry, black locust from POWER GDD + grower-declared window.
  SMAP is a ~9 km cell-level stress flag, not a per-parcel value. Nectar rule is a labelled heuristic.
- Phenology parameters in `data/phenology.json` need a cited source per value; never invent them.
- Actors are synthetic (`synthetic: true`), parcels are illustrative; label both in the UI.
- Calculator wording: "contribution after incremental costs", "benefit relative to the alternative"; never "net profit",
  no "score/100", no yield claims.

## Hackathon rules that affect the build
- **Submission deadline: Sun 15 Nov 2026 23:59 CET.** Demo = video ≤ 30 s or ≤ 7 slides (pitch team owns it).
- ≥ 1 NASA dataset, integral to the solution · English · public final link, no login · cite all sources ·
  no promotion of commercial products · no PII · no NASA logos in generated media.
- AI use is allowed for building; `AI_USAGE.md` states which tools we use (no per-change log). Watermark AI images/video.

## Team and roles
- Patrik P. Süli: research, software architecture. Bence Majer: AI engineering, data science.
  Benedek Máté: geophysics, pitching, technical writing. Yhair Sifuentes: BI, business model. Sándor Burian: role to be added.
- Plan tracks: DATA (NASA clients, cache, geometry, phenology), ENGINE (models, engine, API, tests), FRONT (React map).
  Pitch video, slides and business brief are owned by a separate pitch team.

## Repo maintenance (this repo IS the submission)
- The final project link points at this repo, so it must look professional and stay public-safe.
- `README.md` holds only stable content (what it is, how to run it, data & citations, team).
  No status tables, progress, CI/last-commit badges or placeholders; progress lives in GitHub issues.
- No hand-written Markdown logs in the repo (no decision log, AI-use log, ADRs). History lives in git and GitHub
  issues/PRs; lasting rules go in this file or the plan. A `CHANGELOG.md` generated by commitizen on bump is fine.
- Large or downloaded data never goes into git: cache under `.cache/` (gitignored) and document how to re-download it.
- License: Mozilla Public License 2.0 (`LICENSE`). Third-party data keeps its own licence; list it in the README.
- Every claim or dataset used in the pitch needs a source URL. Never present an estimate as a fact.
