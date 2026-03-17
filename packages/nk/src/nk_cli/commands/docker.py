from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from nk_cli.core import AppContext, CommandSpec
from nk_cli.errors import NkError
from nk_cli.process import run_command
from nk_cli.services.server_prod_manifest import create_server_prod_manifest


@dataclass(frozen=True)
class PreparedDockerBuild:
    cleanup_paths: tuple[Path, ...] = ()

    def cleanup(self) -> None:
        for path in self.cleanup_paths:
            if path.exists():
                path.unlink()


@dataclass(frozen=True)
class DockerTarget:
    name: str
    description: str
    context: Path
    dockerfile: Path | None
    default_tag: str
    prepare: Callable[[AppContext], PreparedDockerBuild] | None = None
    implemented: bool = True


def build_command() -> CommandSpec:
    return CommandSpec(
        name="docker",
        help="Build project Docker images.",
        description="Build Docker images for supported project targets.",
        register_arguments=register_arguments,
        handler=handle,
    )


def register_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "target",
        choices=("server", "web"),
        help="Docker target to build.",
    )
    parser.add_argument(
        "--tag",
        help="Override the default image tag.",
    )
    parser.add_argument(
        "--build-arg",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="Pass through a Docker build argument. Repeatable.",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Disable Docker layer cache for this build.",
    )
    parser.add_argument(
        "--pull",
        action="store_true",
        help="Always attempt to pull newer base images.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the Docker command without executing it.",
    )


def handle(args: argparse.Namespace, context: AppContext) -> int:
    target = build_targets(context.repo_root)[args.target]
    ensure_target_supported(target)

    dockerfile = target.dockerfile
    if dockerfile is None or not dockerfile.exists():
        raise NkError(
            f"Dockerfile for target '{target.name}' was not found at '{dockerfile}'."
        )

    prepared_build = prepare_docker_build(target, context, dry_run=args.dry_run)
    tag = args.tag or target.default_tag
    command = ["docker", "build"]

    try:
        if args.pull:
            command.append("--pull")

        if args.no_cache:
            command.append("--no-cache")

        for build_arg in args.build_arg:
            command.extend(["--build-arg", build_arg])

        command.extend(["--file", str(dockerfile), "--tag", tag, str(target.context)])
        return run_command(command, cwd=context.repo_root, dry_run=args.dry_run)
    finally:
        prepared_build.cleanup()


def build_targets(repo_root: Path) -> dict[str, DockerTarget]:
    return {
        "server": DockerTarget(
            name="server",
            description="Build the backend image.",
            context=repo_root,
            dockerfile=repo_root / "apps" / "server" / "Dockerfile",
            default_tag="nekoshare-server",
            prepare=prepare_server_target,
        ),
        "web": DockerTarget(
            name="web",
            description="Build the frontend image served by nginx.",
            context=repo_root,
            dockerfile=repo_root / "apps" / "web" / "Dockerfile",
            default_tag="nekoshare-web",
        ),
    }


def ensure_target_supported(target: DockerTarget) -> None:
    if target.implemented:
        return

    raise NkError(
        f"Docker target '{target.name}' is registered but not implemented yet."
    )


def prepare_docker_build(
    target: DockerTarget,
    context: AppContext,
    *,
    dry_run: bool,
) -> PreparedDockerBuild:
    if dry_run or target.prepare is None:
        return PreparedDockerBuild()

    return target.prepare(context)


def prepare_server_target(context: AppContext) -> PreparedDockerBuild:
    generated_manifest = create_server_prod_manifest(context)
    return PreparedDockerBuild(cleanup_paths=(generated_manifest,))
