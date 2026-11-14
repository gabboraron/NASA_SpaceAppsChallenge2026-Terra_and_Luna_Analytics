# NASA Space Apps Challenge 2026

Python-only AI engineering project. Challenge/goal/stack details: see the `project-context` skill.

## Layout
- `src/` code, `tests/` pytest tests, `pyproject.toml` is the single source of tool config; `uv.lock` is committed
- `docs/ENGINEERING_GUIDE.md` is the full standards doc (read it for rationale, git/commit/release rules, security, testing)
- `.github/` CI, PR-title check, Dependabot; `.pre-commit-config.yaml` local gate
- `.claude/skills/` project skills (ponytail*, project-context); `.claude/hooks/` enforcement hooks
- `repos/` cloned reference repos (gitignored)

## Python standards (enforced by tooling, not just by this file)
- Python 3.12+. **Package management is uv only**: `uv add <pkg>` / `uv add --dev <pkg>` / `uv remove` / `uv sync` / `uv run <cmd>`. Never use pip, `pip install`, or hand-edit dependencies or `uv.lock`. Commit `uv.lock`. (If `uv` isn't on PATH, use `python -m uv`.)
- Run tools through uv: `uv run ruff`, `uv run pyright`, `uv run pytest`.
- Tool versions are pinned per project in `pyproject.toml` / `uv.lock`. Never rely on or install global copies of ruff/pyright/pytest; always `uv run`.
- Ruff's `PL` rules cover Pylint (standalone Pylint is not used); Pyright strict is the same engine as Pylance, so editor and CLI agree.
- Full type hints on every signature, return type included. Use `list[str]`, `X | None`. No bare `Any` without a reason comment. Must pass `pyright` strict.
- Google-style docstrings on all public modules/classes/functions (summary, Args, Returns, Raises). Don't repeat types in docstrings.
- PEP 8 / PEP 257 via ruff. Never add `# noqa` or `# type: ignore` without a one-line reason.
- Pythonic: pathlib, f-strings, comprehensions, dataclasses/pydantic, context managers. No `print()` in src; use `logging`.
- A PostToolUse hook auto-fixes and checks every edited `.py` file. If it reports errors, fix them before moving on.
- Before saying "done": `uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run pytest`. This is exactly what CI runs.
- Library/API questions (torch, pandas, pydantic...): use context7, don't guess signatures.

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
- Trunk-based: short-lived branches (`feat/`, `fix/`, `chore/`, `docs/`) off `main`, squash-merge PRs. Never force-push shared branches.
- Conventional Commits, enforced by a commit-msg hook: `type(scope): imperative summary` (feat, fix, perf, refactor, test, docs, build, ci, chore, revert). `!` or `BREAKING CHANGE:` for breaking changes. SemVer: feat=minor, fix=patch, breaking=major.
- One logical change per commit; checks must pass on every commit. Never use `--no-verify`.

## CI/CD
- GitHub Actions (`.github/workflows/ci.yml`) runs on every push to main and every PR: `uv sync --locked`, ruff, ruff format check, pyright, pytest with coverage. Keep it green; don't merge red.
- pre-commit (`.pre-commit-config.yaml`) runs the same checks locally. Install once with `uv run pre-commit install`.
- CI also runs `pip-audit` on the locked deps and a gitleaks secret scan; the PR title must be a Conventional Commit.
- Dependabot updates uv deps and Actions weekly. Dependency changes go through `uv add` so the lockfile stays in sync (CI fails on a stale lock).
- Work on feature branches and open PRs into `main`; use `superpowers:finishing-a-development-branch` when done.
