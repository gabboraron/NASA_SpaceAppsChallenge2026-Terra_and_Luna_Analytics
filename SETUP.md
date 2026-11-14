# SETUP.md: bring this repo's dev setup to a working state (for agents)

Audience: a Claude Code agent (or human) on a fresh clone, on **Windows or macOS/Linux**.
Run steps in order and stop at the first failure. Never use pip; uv only (see `CLAUDE.md`).
Never use `--no-verify`. Never commit `.env` or secrets.

## 1. Prerequisites (check, install only if missing)

| Tool | Check | Install |
|---|---|---|
| git | `git --version` | Windows: `winget install Git.Git`; macOS: `xcode-select --install` or `brew install git` |
| uv >= 0.9 | `uv --version` | Windows: `winget install astral-sh.uv`; macOS: `brew install uv` (or `curl -LsSf https://astral.sh/uv/install.sh \| sh`) |
| Claude Code | `claude --version` | see https://docs.claude.com/claude-code |

Python 3.12 is pinned in `.python-version`; uv downloads it automatically. If `uv` is not on PATH, use `python -m uv`.
Optional: `gh` (GitHub CLI) for PRs.

## 2. Python environment

```bash
uv sync            # creates .venv from uv.lock (CI uses: uv sync --locked)
```

- `.venv` is **per machine and gitignored**. Never copy or move one between machines or folders
  (it hard-codes absolute paths). If it breaks: delete `.venv`, run `uv sync` again.
- Venv interpreter: Windows `.venv/Scripts/python.exe`, macOS/Linux `.venv/bin/python`.
  Prefer `uv run <cmd>`, which works on both.

## 3. Git hooks (not stored in git, every clone must install them)

```bash
uv run pre-commit install        # installs pre-commit AND commit-msg hooks
uv run pre-commit run --all-files
```

- Hooks: gitleaks, ruff check, ruff format, pyright, `uv lock --check`, commitizen (Conventional Commits).
- gitleaks is fetched by pre-commit from GitHub (needs network on first run).
- Verify the commit-msg gate: `git commit -m "bad message"` must be rejected, `git commit -m "chore: x"` accepted.

## 4. Claude Code: project config

Project config lives in `.claude/settings.json` (committed). Personal overrides go in
`.claude/settings.local.json` (gitignored).

1. Open Claude Code **in the repo root** and accept the "trust this project" prompt, otherwise the
   project hooks and permissions do not load.
2. Check `/hooks`: there must be a PostToolUse `Edit|Write` hook running
   `uv run python .claude/hooks/py_check.py`. It uses the venv's python (Windows or macOS/Linux
   path chosen automatically), auto-fixes ruff, and reports ruff/pyright errors with exit code 2.
   If `.venv` is missing it silently does nothing, so run step 2 first.
3. Test it: write a `.py` file under `src/` with a missing type hint; the hook must report errors.
   Delete the test file afterwards.

## 5. Claude Code: plugins (per user, not in git)

`enabledPlugins` in `settings.json` only switches plugins on. Each user must install them once.
In Claude Code run `/plugin`, add the marketplaces if missing, then install:

| Plugin | Marketplace |
|---|---|
| superpowers | anthropic-plugin-directory |
| code-review-anthropics | anthropic-plugin-directory |
| code-simplifier | anthropic-plugin-directory |
| claude-md-management | anthropic-plugin-directory |
| context7 | anthropic-plugin-directory |
| mattpocock-skills | claude-plugins-official (`anthropics/claude-plugins-official`) |

Then `/reload-plugins` or restart. Check that `/skills` lists `superpowers:*`, `mattpocock-skills:*`,
`ponytail*` and `project-context`. The `ponytail*` and `project-context` skills are project-local
(`.claude/skills/`), so they need no install. Playwright is not required.
If `/plugin` shows a name that differs from the table, trust `/plugin` and update `settings.json`.

## 6. Verify (exactly what CI runs)

```bash
uv run ruff check . && uv run ruff format --check . && uv run pyright && uv run pytest
```

All four must pass before saying "done".

## 7. GitHub side (once, by a repo admin)

- `.github/workflows/ci.yml` runs on push to `main` and every PR (uv sync --locked, ruff, format,
  pyright, pytest + 80% coverage, pip-audit, gitleaks). `pr-title.yml` requires a Conventional Commit PR title.
- Repo settings: squash-merge only, require PR + passing CI on `main`, delete branch on merge,
  enable Dependabot (`.github/dependabot.yml`).

## 8. Platform notes and common failures

| Symptom | Cause / fix |
|---|---|
| `uv trampoline failed to canonicalize script path` | `.venv` was moved/copied. Delete it, `uv sync`. |
| Hook never reports anything | `.venv` missing, or project not trusted. Redo steps 2 and 4. |
| `python: command not found` on macOS | Use `python3` or `uv run python`; the hook already uses `uv run`. |
| `pre-commit` hook says `uv: command not found` | uv not on PATH for git's shell; add it to PATH, restart terminal. |
| Line endings noise (Windows <-> macOS) | Keep `core.autocrlf` as `true` on Windows, `input` on macOS; do not reformat whole files. |
| CI fails with stale lock | Changed dependencies without `uv add` / `uv lock`. Run `uv lock` and commit `uv.lock`. |
| Commit rejected by commitizen | Use `type(scope): imperative summary` (feat, fix, chore, docs, ...). |

## 9. Do not

- `pip install`, hand-edit `uv.lock`, commit `.venv`, `.env`, `repos/*` contents, or `.claude/settings.local.json`.
- Install global ruff/pyright/pytest; always `uv run`.
