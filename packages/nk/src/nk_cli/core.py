from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


@dataclass(frozen=True)
class AppContext:
    repo_root: Path


@dataclass(frozen=True)
class CommandSpec:
    name: str
    help: str
    description: str
    register_arguments: Callable[[argparse.ArgumentParser], None]
    handler: Callable[[argparse.Namespace, AppContext], int]
