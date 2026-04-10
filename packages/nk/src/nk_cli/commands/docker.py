from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from nk_cli.core import AppContext, CommandSpec
from nk_cli.errors import NkError
from nk_cli.process import run_command
from nk_cli.services.env_files import read_optional_env_file
from nk_cli.services.server_prod_manifest import create_server_prod_manifest

GHCR_NAMESPACE = "ghcr.io/thiratt"
TARGET_CHOICES = ("server", "web", "edge", "all")
ACTION_CHOICES = ("build", "push", "release")


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
    default_build_args: Callable[[AppContext], dict[str, str]] | None = None
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
        "action_or_target",
        choices=ACTION_CHOICES + TARGET_CHOICES,
        help="Docker action or target. If you pass a target directly, the action defaults to build.",
    )
    parser.add_argument(
        "target",
        nargs="?",
        choices=TARGET_CHOICES,
        help="Docker target for the selected action.",
    )
    tag_group = parser.add_mutually_exclusive_group()
    tag_group.add_argument(
        "--tag",
        help="Override the default image tag.",
    )
    tag_group.add_argument(
        "--ghcr",
        action="store_true",
        help=f"Tag image(s) under {GHCR_NAMESPACE}/<image-name>.",
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
    targets = build_targets(context.repo_root)
    action, selected_targets = resolve_action_and_targets(args, targets)
    ensure_arguments_are_valid(args, action, selected_targets)

    for target in selected_targets:
        if action == "build":
            exit_code = build_target_image(target, args, context)
        elif action == "push":
            exit_code = push_target_image(target, args, context)
        else:
            exit_code = build_target_image(target, args, context)
            if exit_code == 0:
                exit_code = push_target_image(target, args, context)

        if exit_code != 0:
            return exit_code

    return 0


def resolve_action_and_targets(
    args: argparse.Namespace,
    targets: dict[str, DockerTarget],
) -> tuple[str, list[DockerTarget]]:
    action_or_target = args.action_or_target
    explicit_target = args.target

    if action_or_target in TARGET_CHOICES:
        if explicit_target is not None:
            raise NkError(
                "Unexpected extra Docker target. Use either 'nk.py docker <target>' "
                "or 'nk.py docker <build|push> <target>'."
            )

        return "build", resolve_selected_targets(action_or_target, targets)

    if explicit_target is None:
        raise NkError(
            f"Docker action '{action_or_target}' requires a target: "
            "server, web, edge, or all."
        )

    return action_or_target, resolve_selected_targets(explicit_target, targets)


def resolve_selected_targets(
    target_name: str,
    targets: dict[str, DockerTarget],
) -> list[DockerTarget]:
    if target_name == "all":
        return [targets[name] for name in ("server", "web", "edge")]

    return [targets[target_name]]


def ensure_arguments_are_valid(
    args: argparse.Namespace,
    action: str,
    targets: list[DockerTarget],
) -> None:
    if args.tag and len(targets) > 1:
        raise NkError(
            "--tag can only be used with a single Docker target. "
            "Use --ghcr for the standard registry tags or build each target separately."
        )

    if action in ("push", "release") and not args.ghcr and not args.tag:
        raise NkError(
            f"Docker {action} requires an explicit remote tag destination. "
            "Use --ghcr or --tag."
        )

    if action not in ("push", "release"):
        return

    if args.build_arg:
        if action == "push":
            raise NkError("--build-arg can only be used with the Docker build action.")

    if args.no_cache:
        if action == "push":
            raise NkError("--no-cache can only be used with the Docker build action.")

    if args.pull:
        if action == "push":
            raise NkError("--pull can only be used with the Docker build action.")


def build_target_image(
    target: DockerTarget,
    args: argparse.Namespace,
    context: AppContext,
) -> int:
    ensure_target_supported(target)

    dockerfile = target.dockerfile
    if dockerfile is None or not dockerfile.exists():
        raise NkError(
            f"Dockerfile for target '{target.name}' was not found at '{dockerfile}'."
        )

    prepared_build = prepare_docker_build(
        target, context, dry_run=args.dry_run)
    tag = resolve_target_tag(target, args)
    build_args = resolve_build_args(
        target, context, raw_build_args=args.build_arg)
    command = ["docker", "build"]

    try:
        if args.pull:
            command.append("--pull")

        if args.no_cache:
            command.append("--no-cache")

        for key, value in build_args.items():
            command.extend(["--build-arg", f"{key}={value}"])

        command.extend(["--file", str(dockerfile),
                       "--tag", tag, str(target.context)])
        return run_command(command, cwd=context.repo_root, dry_run=args.dry_run)
    finally:
        prepared_build.cleanup()


def push_target_image(
    target: DockerTarget,
    args: argparse.Namespace,
    context: AppContext,
) -> int:
    ensure_target_supported(target)
    tag = resolve_target_tag(target, args)
    command = ["docker", "push", tag]
    return run_command(command, cwd=context.repo_root, dry_run=args.dry_run)


def resolve_target_tag(target: DockerTarget, args: argparse.Namespace) -> str:
    if args.tag:
        return args.tag

    if args.ghcr:
        return f"{GHCR_NAMESPACE}/{target.default_tag}"

    return target.default_tag


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
            default_build_args=resolve_web_build_args,
        ),
        "edge": DockerTarget(
            name="edge",
            description="Build the production edge image with web, admin, and nginx routing.",
            context=repo_root,
            dockerfile=repo_root / "nginx" / "Dockerfile",
            default_tag="nekoshare-edge",
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


def resolve_build_args(
    target: DockerTarget,
    context: AppContext,
    *,
    raw_build_args: list[str],
) -> dict[str, str]:
    resolved = target.default_build_args(
        context) if target.default_build_args else {}
    resolved.update(parse_build_args(raw_build_args))
    return resolved


def parse_build_args(raw_build_args: list[str]) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for raw_build_arg in raw_build_args:
        key, separator, value = raw_build_arg.partition("=")
        key = key.strip()
        if not separator or not key:
            raise NkError(
                f"Invalid build arg '{raw_build_arg}'. Expected the form KEY=VALUE."
            )

        parsed[key] = value

    return parsed


def resolve_web_build_args(context: AppContext) -> dict[str, str]:
    docker_env = read_optional_env_file(context.repo_root / "docker" / ".env")
    docker_env_example = read_optional_env_file(
        context.repo_root / "docker" / ".env.example")
    web_env = read_optional_env_file(
        context.repo_root / "apps" / "web" / ".env.production")

    resolved = {
        "WEB_API_BASE_URL": first_non_empty(
            docker_env.get("WEB_API_BASE_URL"),
            web_env.get("VITE_API_BASE_URL"),
            docker_env_example.get("WEB_API_BASE_URL"),
        ),
        "WEB_WS_BASE_URL": first_non_empty(
            docker_env.get("WEB_WS_BASE_URL"),
            web_env.get("VITE_WS_BASE_URL"),
            docker_env_example.get("WEB_WS_BASE_URL"),
        ),
    }

    missing = [key for key, value in resolved.items() if not value]
    if missing:
        missing_list = ", ".join(missing)
        raise NkError(
            f"Missing default Docker build args for web: {missing_list}. "
            "Set them in docker/.env, apps/web/.env.production, or pass --build-arg explicitly."
        )

    return resolved


def first_non_empty(*values: str | None) -> str:
    for value in values:
        if value:
            return value

    return ""
