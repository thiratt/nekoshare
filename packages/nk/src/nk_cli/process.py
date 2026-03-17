from __future__ import annotations

import os
import shlex
import shutil
import subprocess
from pathlib import Path
from typing import Sequence

from .errors import NkError


def run_command(command: Sequence[str], *, cwd: Path, dry_run: bool) -> int:
    print(format_command(command))
    if dry_run:
        return 0

    resolved_command = list(command)
    resolved_command[0] = resolve_executable(resolved_command[0])
    subprocess.run(resolved_command, cwd=cwd, check=True)
    return 0


def format_command(command: Sequence[str]) -> str:
    if os.name == "nt":
        return subprocess.list2cmdline(list(command))

    return shlex.join(command)


def resolve_executable(name: str) -> str:
    if Path(name).name != name or Path(name).suffix:
        return name

    candidates = [name]
    if os.name == "nt":
        candidates.extend([f"{name}.cmd", f"{name}.exe", f"{name}.bat"])

    for candidate in candidates:
        executable = shutil.which(candidate)
        if executable:
            return executable

    raise NkError(f"Required command was not found in PATH: '{name}'.")
