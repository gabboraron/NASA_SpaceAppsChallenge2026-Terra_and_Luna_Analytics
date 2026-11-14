"""PostToolUse hook: auto-fix, format and type-check a Python file Claude just edited.

Reads the hook payload from stdin. Exits 2 with the remaining problems on stderr so
Claude sees and fixes them; exits 0 when clean or when the file is not Python.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VENV_BIN = ROOT / ".venv" / ("Scripts" if sys.platform == "win32" else "bin")
PY = VENV_BIN / ("python.exe" if sys.platform == "win32" else "python")


def run(*args: str) -> subprocess.CompletedProcess[str]:
    """Run a tool with the project venv's Python from the repo root."""
    return subprocess.run(  # noqa: S603
        [str(PY), "-m", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )


def main() -> int:
    """Check the edited file; return the hook exit code."""
    payload = json.load(sys.stdin)
    file = payload.get("tool_input", {}).get("file_path", "")
    if not file.endswith(".py") or not PY.exists():
        return 0
    run("ruff", "check", "--fix", "--quiet", file)
    run("ruff", "format", "--quiet", file)
    problems = [
        r.stdout.strip()
        for r in (
            run("ruff", "check", "--output-format=concise", file),
            run("pyright", file),
        )
        if r.returncode != 0 and r.stdout.strip()
    ]
    if problems:
        sys.stderr.write("\n".join(problems) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
