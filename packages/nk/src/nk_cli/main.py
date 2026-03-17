from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import Sequence

from nk_cli.commands import COMMANDS
from nk_cli.core import AppContext, CommandSpec
from nk_cli.errors import NkError


def main(
    argv: Sequence[str] | None = None,
    *,
    repo_root: Path | None = None,
) -> int:
    context = AppContext(repo_root=resolve_repo_root(repo_root))
    parser = build_parser(COMMANDS)
    args = parser.parse_args(argv)

    try:
        handler = getattr(args, "handler", None)
        if handler is None:
            parser.print_help()
            return 1

        return handler(args, context)
    except NkError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    except subprocess.CalledProcessError as error:
        return error.returncode
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        return 130


def build_parser(command_specs: Sequence[CommandSpec]) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="nk.py",
        description="Nekoshare control CLI.",
    )
    subparsers = parser.add_subparsers(dest="command", metavar="command")
    subparsers.required = True

    for command_spec in command_specs:
        command_parser = subparsers.add_parser(
            command_spec.name,
            help=command_spec.help,
            description=command_spec.description,
        )
        command_spec.register_arguments(command_parser)
        command_parser.set_defaults(handler=command_spec.handler)

    return parser


def resolve_repo_root(repo_root: Path | None) -> Path:
    if repo_root is not None:
        return repo_root.resolve()

    return Path.cwd().resolve()
