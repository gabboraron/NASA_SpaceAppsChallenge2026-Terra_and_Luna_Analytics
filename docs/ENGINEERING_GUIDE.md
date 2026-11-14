# Engineering Guide

Standards for this repository: Python only, AI engineering, production-grade.
Each rule is marked **[enforced]** (a tool or CI fails when it is broken), **[configured]** (set up in this repo but not blocking), or **[convention]** (human or agent discipline, review-checked). Items marked **[todo]** are recommended but not set up yet.

---

## 1. Principles

1. **Reproducible by default.** Anyone, or CI, gets the same environment from a clean checkout in one command (`uv sync`).
2. **One source of truth.** All tool configuration lives in `pyproject.toml`. No scattered `setup.cfg`, `.flake8`, `mypy.ini`, `requirements.txt`.
3. **Automate what can be automated.** Style, types, security scans and tests are checked by tools, not opinions in review.
4. **Make illegal states unrepresentable.** Use types and validation at boundaries so bugs fail early and loudly.
5. **Smallest complete change.** Do the whole job, but don't add features, abstractions or config nobody asked for (YAGNI). Record deliberate shortcuts as `shortcut: <limit>, <when to upgrade>`.
6. **Evidence before "done".** A task is done when the checks pass, not when the code looks right.

---

## 2. Repository layout

```
.
├── pyproject.toml            # project metadata + ALL tool config  [enforced]
├── uv.lock                   # committed lockfile                  [enforced in CI]
├── .python-version           # pinned interpreter (3.12)
├── src/                      # importable code (src layout)
├── tests/                    # pytest tests, mirrors src/
├── docs/                     # this guide, ADRs, design notes
├── repos/                    # cloned reference repos (gitignored)
├── .github/workflows/ci.yml  # CI pipeline
├── .github/dependabot.yml    # weekly dependency + Actions updates
├── .pre-commit-config.yaml   # local gate, same checks as CI
├── .claude/                  # Claude Code settings, skills, hooks
└── CLAUDE.md                 # instructions for the AI agent
```

- **src layout** prevents accidentally importing the working tree instead of the installed package and keeps tests honest.
- Keep modules small and cohesive. Prefer a few deep modules (simple interface, meaningful behavior) over many shallow ones.
- Entry points (CLI, API, training scripts) are thin: parse input, call library code, format output. Logic lives in importable, testable functions.

---

## 3. Environment and dependency management (uv)

**uv is the only package manager.** Never use `pip`, `pip install`, `poetry` or hand-edit `uv.lock`. Claude Code is also blocked from `pip` in `.claude/settings.json`. [enforced]

| Task | Command |
|---|---|
| Create/refresh env from lockfile | `uv sync` |
| Add a runtime dependency | `uv add <pkg>` |
| Add a dev-only dependency | `uv add --dev <pkg>` |
| Remove a dependency | `uv remove <pkg>` |
| Run anything in the project env | `uv run <cmd>` (e.g. `uv run pytest`) |
| Update one package | `uv lock --upgrade-package <pkg>` |
| Update everything | `uv lock --upgrade` (then run all checks) |
| Verify lockfile is current | `uv lock --check` |
| Pin the Python version | edit `.python-version`, then `uv sync` |

Rules:
- Commit `uv.lock`. CI uses `uv sync --locked` and fails if the lock is stale. [enforced]
- Set `requires-python` in `pyproject.toml` (currently `>=3.12`). Choose the newest version all key dependencies (torch, etc.) support.
- Runtime deps go in `[project] dependencies`. Dev tooling goes in `[dependency-groups] dev`. Never ship dev tools as runtime dependencies.
- Don't add a dependency for a few lines of code. Prefer the standard library, then an already-installed dependency. Check maintenance, licence and size before adding a new one. [convention]
- **Global vs project tools:** install `uv` globally once (`winget install astral-sh.uv`). Ruff, pyright, pytest and pre-commit are pinned **per project** via `pyproject.toml`/`uv.lock`, so your laptop, teammates and CI all use identical versions. Global copies (`uv tool install ruff`) are only for scratch scripts outside a repo; inside a repo always use `uv run ...`. [convention]
- `required-version` is set under `[tool.uv]`. For deployment images use hashed exports (`uv export --locked`). [enforced]

---

## 4. `pyproject.toml` conventions

- `[project]`: name, version, description, `requires-python`, dependencies.
- `[dependency-groups]`: `dev` (ruff, pyright, pytest, pytest-cov, pre-commit). Add further groups (`docs`, `notebooks`) rather than bloating `dev`.
- `[tool.uv]`: `package = false` while this is an application. Switch to a build backend (e.g. `hatchling`) and add `[build-system]` if it becomes a published library.
- `[tool.ruff]`, `[tool.pyright]`, `[tool.pytest.ini_options]`: all tool config here. [enforced by CI]
- Don't loosen a rule globally to make one file pass. Use a narrow `per-file-ignores` entry or an inline ignore with a reason.

---

## 5. Code style: Ruff (the Pylint/flake8/isort/black/pydocstyle replacement)

Ruff does linting **and** formatting. Rule sets enabled in `pyproject.toml`:

| Code | Meaning |
|---|---|
| `E`, `W` | pycodestyle (PEP 8) |
| `F` | pyflakes (unused/undefined names) |
| `I` | import sorting (isort) |
| `N` | pep8-naming |
| `UP` | pyupgrade (modern syntax) |
| `B` | bugbear (likely bugs) |
| `SIM`, `C4` | simplifications, comprehensions |
| `PL` | Pylint rules (this is the Pylint coverage; standalone Pylint is not used) |
| `ANN` | type annotations required |
| `D` | docstrings, Google convention (PEP 257) |
| `PTH` | pathlib over `os.path` |
| `S` | security (flake8-bandit) |
| `T20` | no stray `print()` |
| `RUF` | Ruff-specific |

Commands: `uv run ruff check .` (add `--fix` to auto-fix), `uv run ruff format .`. [enforced]

Rules:
- Line length 88; formatting is whatever `ruff format` produces. Never argue about formatting.
- Never add `# noqa` or `# type: ignore` without a specific code and a one-line reason (`# noqa: S603 - args are a fixed list`). [convention]
- Tests may use `assert`, magic numbers and skip docstrings/annotations (configured via per-file ignores).

---

## 6. Type checking: Pyright strict (the engine behind Pylance)

- `typeCheckingMode = "strict"`. In VS Code select the `.venv` interpreter so Pylance shows the same errors as `uv run pyright`. [enforced]
- **Every function** gets full parameter and return annotations, including `-> None`.
- Use modern syntax: `list[str]`, `dict[str, int]`, `X | None`, `type` aliases. Not `typing.List`, `Optional`.
- Avoid `Any`. If unavoidable (untyped third-party code), confine it to one boundary function and explain why.
- Prefer precise types: `Sequence`/`Mapping` for inputs, `Protocol` for structural interfaces, `Literal`/`Enum` for closed sets, `TypedDict`/dataclass/pydantic model for structured data, `NewType` for IDs, `Self`, `Final`, `ClassVar` where they apply.
- For arrays/tensors use `numpy.typing.NDArray[np.float32]` and document shapes and dtype in the docstring.
- Note: Astral's `ty` is an emerging alternative checker. Pyright remains the choice here because it matches Pylance in the editor; revisit later.

---

## 7. Docstrings (PEP 257, Google style)

Required on every public module, class, function and method. [enforced by `D` rules]

```python
def normalize(values: Sequence[float], *, eps: float = 1e-8) -> list[float]:
    """Scale values to zero mean and unit variance.

    Args:
        values: Raw samples. Must contain at least two items.
        eps: Added to the standard deviation to avoid division by zero.

    Returns:
        The standardized values, same length and order as the input.

    Raises:
        ValueError: If fewer than two values are given.
    """
```

- First line: imperative summary, one sentence, ends with a period.
- Sections: `Args`, `Returns`/`Yields`, `Raises`, optionally `Example`. Don't repeat types, since annotations carry them.
- Explain **why** and the contract (units, shapes, invariants, side effects), not what the next line does.
- Comments are for the non-obvious "why" only, in one line.

---

## 8. Pythonic design and clean code

- **Idioms:** comprehensions and generators, `pathlib.Path`, f-strings, `with` context managers, `enumerate`/`zip` instead of index loops, unpacking, `dataclass(slots=True, frozen=True)` for value objects, `enum` for constants, `functools`/`itertools` before hand-rolled loops.
- **EAFP** (try/except) where it is clearer, but catch **specific** exceptions. Never bare `except:` and never swallow errors silently.
- **Functions:** small, single-purpose, ≤ ~5 parameters; use keyword-only args (`*`) for flags. No mutable default arguments. No hidden global state.
- **Composition over inheritance.** Use `Protocol`/ABC for interfaces. Keep class hierarchies shallow.
- **Dependency injection:** pass collaborators (clients, clocks, RNG, config) in; don't reach for globals. This is what makes code testable.
- **Pure core, impure shell:** keep computation pure and side effects (I/O, network, time, randomness) at the edges.
- **SOLID/architecture:** dependencies point inward (domain does not import infrastructure); name things after the domain; keep layers (I/O → services → domain) explicit. Record significant decisions as short ADRs in `docs/adr/`. [convention]
- **Delete code.** Dead code, commented-out code and speculative abstractions don't ship.
- **Naming:** `snake_case` functions/variables, `PascalCase` classes, `UPPER_CASE` constants, `_private` for internals. Names say what, not how. No abbreviations beyond the well-known (`df`, `idx` fine; `proc_dat` not).

---

## 9. Errors, logging and configuration

- **Errors:** define a small project exception hierarchy for domain errors; raise early with clear messages; never use `assert` for runtime validation (it can be stripped); use `raise ... from err` to keep causes. Validate at trust boundaries (user input, files, network, model output).
- **Logging:** use the `logging` module, `logger = logging.getLogger(__name__)`. No `print()` in `src/` (enforced by `T20`). Log at the right level, never log secrets or personal data, use lazy formatting (`logger.info("n=%d", n)`). For services prefer structured (JSON) logs with request/run IDs. Central config: `src/logging_config.py` (`configure_logging`), called once from entry points. [configured]
- **Configuration (12-factor):** config comes from the environment, not code. Load into a typed `pydantic-settings` model once at startup and pass it down. No hard-coded paths, URLs, keys or hyperparameters. Keep a `.env.example`; real `.env` is gitignored and denied to the agent. [convention]
- **Secrets:** environment variables locally, a secrets manager in production. Never commit them. `gitleaks` runs in pre-commit and CI. [enforced]
- **Time and randomness:** use timezone-aware `datetime` (UTC internally); inject clocks/RNGs for testability.

---

## 10. Testing

- **pytest**, tests in `tests/` mirroring `src/`. Name `test_<behavior>`. Arrange-Act-Assert. One behavior per test.
- Test **behavior through public interfaces**, not private internals. Use `parametrize` for tables of cases, fixtures for setup, `tmp_path` for files, `monkeypatch` for env.
- Mock only at system boundaries (network, clock, filesystem when slow). Prefer fakes over deep mock chains.
- New non-trivial logic ships with a test; a bug fix ships with a regression test that failed first. [convention, reviewed]
- Coverage: CI runs `pytest --cov=src`. CI enforces `--cov-fail-under=80`; don't chase 100%. [enforced]
- Consider `hypothesis` (property tests) for parsers and numeric code.
- **AI/ML specifics:** seed all randomness and log the seed; test shapes/dtypes and invariants (e.g. outputs finite, probabilities sum to 1); keep tiny fixtures for fast tests; mark slow/GPU tests (`@pytest.mark.slow`) and exclude them by default; never let unit tests download models or hit the network.

---

## 11. AI-engineering specifics

- **Reproducibility:** pinned deps, fixed seeds (Python, NumPy, torch), recorded config + data version + git SHA per run. Prefer config files/pydantic models over CLI-flag sprawl.
- **Data:** validate schemas on load (pydantic/pandera); never mutate raw data; keep raw → processed → features as separate, documented stages; don't commit large data or model weights (use object storage / DVC / Git LFS). **[todo]** pick a data/experiment tracking tool when needed.
- **Notebooks:** exploration only. Move reusable logic into `src/`; strip outputs before committing.
- **Performance:** measure before optimizing (`cProfile`, `py-spy`, `timeit`); vectorize with NumPy/torch; avoid Python loops over large arrays; batch I/O.
- **LLM/API use:** timeouts, retries with backoff, cost/rate limits, and structured-output validation on every model call; keep prompts in versioned files, not scattered strings; never trust model output without validation.
- **Reference docs:** use context7 for current library APIs instead of guessing.

---

## 12. Security and supply chain

- Ruff `S` rules catch common issues (hard-coded secrets, `shell=True`, `eval`, unsafe `pickle`/`yaml.load`, weak crypto). [enforced]
- **Never** `eval`/`exec` untrusted input, `pickle.load` untrusted data, or build SQL/shell strings from user input. Use parameterized queries and `subprocess.run([...])` with argument lists.
- `pip-audit` runs in CI against the hashed lock export and fails on known CVEs; Dependabot stays on. [enforced]
- Pin and lock everything (`uv.lock`); review new dependencies; prefer well-maintained packages.
- Least privilege: GitHub Actions use `permissions: contents: read`; production credentials are never available to PR builds from forks.
- Don't log or commit secrets/PII. `.env` files are gitignored.

---

## 13. Git workflow

**Trunk-based development** with short-lived branches and a protected `main`:

1. `main` is always green and deployable. Direct pushes are disabled (set branch protection once on GitHub). **[todo]**
2. Branch from `main`, short-lived (ideally < 2 days): `feat/<topic>`, `fix/<topic>`, `chore/<topic>`, `docs/<topic>`.
3. Open a PR early; CI must pass; at least one review for non-trivial changes.
4. **Squash-merge** into `main` so history is one clean commit per change. The squashed commit title follows Conventional Commits.
5. Unfinished work merges behind a flag or stays on the branch; don't leave long-lived branches.
6. Rebase on `main` to resolve drift; never force-push shared branches. Never rewrite published history.

PRs: small and focused, description explains **why**, links the issue, lists how it was tested. Don't mix refactors with behavior changes.

---

## 14. Commits (Conventional Commits)

Format:

```
<type>(<optional scope>): <imperative summary, ≤ 72 chars>

<optional body: what and WHY, wrapped at 72>

<optional footers: BREAKING CHANGE: ..., Closes #123>
```

| Type | Use for | SemVer effect |
|---|---|---|
| `feat` | new user-facing capability | MINOR |
| `fix` | bug fix | PATCH |
| `perf` | performance improvement | PATCH |
| `refactor` | restructure, no behavior change | none |
| `test` | add/fix tests | none |
| `docs` | documentation only | none |
| `build` | build system, dependencies (`uv`) | none |
| `ci` | CI configuration | none |
| `chore` | maintenance | none |
| `revert` | revert a previous commit | varies |

- Breaking change: `feat!:` or a `BREAKING CHANGE:` footer → MAJOR.
- Subject: imperative mood ("add", not "added"), no trailing period, lowercase after the colon.
- One logical change per commit; every commit should pass the checks.
- Good: `fix(loader): handle empty CSV without raising IndexError`. Bad: `updates`, `wip`, `fix stuff`.
- Commits made with Claude Code carry its `Co-Authored-By` trailer.
- Enforced by a `commitizen` commit-msg hook (pre-commit) and a PR-title check workflow. [enforced]

---

## 15. Versioning and releases (SemVer)

- **Semantic Versioning** `MAJOR.MINOR.PATCH`: breaking → MAJOR, backwards-compatible feature → MINOR, fix → PATCH. `0.y.z` means "unstable API".
- Version lives in one place (`pyproject.toml`).
- Tag releases `vX.Y.Z` on `main` (annotated tags). Generate the changelog from Conventional Commits (`CHANGELOG.md`, [Keep a Changelog](https://keepachangelog.com) format). **[todo]** automate with `python-semantic-release` or `release-please` if/when publishing.
- Hotfix: branch from the tag, fix, release a PATCH, merge back to `main`.
- Pre-releases: `1.2.0rc1`. Never reuse or move a published tag.
- Deprecate before removing: warn for at least one MINOR release, then remove in the next MAJOR.

---

## 16. CI/CD

CI (`.github/workflows/ci.yml`) runs on every PR and push to `main`: `uv sync --locked` → `ruff check` → `ruff format --check` → `pyright` → `pytest --cov`. [enforced]

- Keep CI **identical** to local checks and pre-commit; "works on my machine" must equal "works in CI". Run `uv run pre-commit install` once per clone.
- CI is fast (cached uv), deterministic (locked deps) and least-privilege (`contents: read`).
- A red `main` is fixed or reverted immediately.
- Pin third-party Actions to a version tag (a full commit SHA is stricter). Dependabot keeps them updated.
- Consider later **[todo]**: a Python version matrix, release workflow on tags (`cz bump` is configured), container build and scan, deployment with environment approvals.

---

## 17. Code review checklist

- Does it solve the stated problem, completely, with the smallest sensible change?
- Are inputs validated at boundaries, and errors handled without being swallowed?
- Full type hints and docstrings? Names clear? No dead code or speculative abstraction?
- Tests cover new behavior and edge cases; a bug fix has a regression test?
- No secrets, no hard-coded config, no new unreviewed dependency?
- Performance sane for expected data sizes? No O(n²) surprises?
- Backwards compatibility and migration considered? Docs/changelog updated?
- Do CI and pre-commit pass?

---

## 18. Working with Claude Code in this repo

- `CLAUDE.md` holds the rules and the **skill routing** (one default skill per job); this guide holds the reasoning.
- A `PostToolUse` hook (`.claude/hooks/py_check.py`) auto-fixes, formats and type-checks every Python file Claude edits and feeds remaining errors back. [enforced]
- Pre-approved: `uv`, `ruff`, `pyright`, `pytest`, read-only git. Denied: `pip`, reading `.env`.
- Claude runs the full check before claiming completion and does not report success over failing checks.
- After meaningful sessions run `claude-md-management:revise-claude-md` so lessons land in `CLAUDE.md`.

---

## 19. Definition of Done

A change is done when **all** are true:

- [ ] `uv run ruff check .` and `uv run ruff format --check .` pass
- [ ] `uv run pyright` passes (strict)
- [ ] `uv run pytest` passes; new behavior has tests
- [ ] `uv lock --check` passes (lockfile in sync)
- [ ] Public APIs have typed signatures and Google-style docstrings
- [ ] No secrets, no stray `print`, no unexplained `noqa`/`type: ignore`
- [ ] Commit(s)/PR title follow Conventional Commits; PR explains why
- [ ] CI is green

---

## 20. Setup checklist (new machine / new clone)

1. `winget install astral-sh.uv` (once per machine); restart the terminal.
2. `git clone <repo> && cd <repo>`
3. `uv sync` (creates `.venv` at the pinned Python)
4. `uv run pre-commit install` (installs both the pre-commit and commit-msg hooks)
5. In VS Code: select the `.venv` interpreter; install the Python, Pylance and Ruff extensions.
6. `uv run pytest` to confirm everything works.

---

## Sources

Community consensus, not official specs; the authoritative references are the tool docs ([uv](https://docs.astral.sh/uv/), [Ruff](https://docs.astral.sh/ruff/), [Pyright](https://microsoft.github.io/pyright/)), the [Python Packaging User Guide](https://packaging.python.org), the [Conventional Commits spec](https://www.conventionalcommits.org), [SemVer](https://semver.org) and [12factor.net](https://12factor.net).

- Tooling: [Modern Python Tooling Checklist](https://pydevtools.com/tooling-checklist/), [Trail of Bits modern-python](https://new.trailofbits.com/skills/modern-python/), [Python Project Setup 2026](https://www.pulse.bot/devops/news/python-project-setup-2026-uv-ruff-ty-polars-c603d19a-fb65-4865-bf87-b21bcead8c49/), [Production-ready Python packages](https://willigottstein.medium.com/from-good-code-to-reliable-software-a-practical-guide-to-production-ready-python-packages-aa881c2c31e9)
- Git/commits: [Semantic versioning with Conventional Commits (Deloitte)](https://engineering.deloitte.com.au/articles/semantic-versioning-with-conventional-commits), [Conventional Commits guide (DeployHQ)](https://deployhq.com/blog/conventional-commits-a-standardized-approach-to-commit-messages), [Git workflow best practices 2026](https://devplaybook.cc/blog/git-workflow-best-practices-2024/), [Commit and branch conventions ADR](https://wiki.simpler.grants.gov/product/decisions/adr/2023-08-21-branch-conv-release-workflow)
- Security: [Defense in depth: Python supply chain security](https://bernat.tech/posts/securing-python-supply-chain/), [Security audit checklist](https://serhiismetanskyi.github.io/digital-garden/code-security/06-security-audit-checklist/), [MLOps coding course: security](https://mlops-coding-course.fmind.dev/4.%20Validating/4.4.%20Security.html)
