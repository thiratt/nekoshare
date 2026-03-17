from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from nk_cli.core import AppContext
from nk_cli.errors import NkError
from nk_cli.process import resolve_executable


SERVER_PACKAGE_PATH = Path("apps/server/package.json")
SERVER_PROD_PACKAGE_PATH = Path("apps/server/.package.prod.json")


def create_server_prod_manifest(context: AppContext) -> Path:
    package_path = context.repo_root / SERVER_PACKAGE_PATH
    output_path = context.repo_root / SERVER_PROD_PACKAGE_PATH

    package_manifest = read_json(package_path)
    prod_manifest = build_server_prod_manifest(context, package_manifest)

    output_path.write_text(
        json.dumps(prod_manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    return output_path


def build_server_prod_manifest(
    context: AppContext,
    package_manifest: dict[str, object],
) -> dict[str, object]:
    scripts = package_manifest.get("scripts")
    start_script = scripts.get("start") if isinstance(scripts, dict) else None

    prod_manifest: dict[str, object] = {
        "name": package_manifest.get("name", "server"),
        "type": package_manifest.get("type", "module"),
        "private": package_manifest.get("private", True),
        "dependencies": resolve_server_runtime_dependencies(context, package_manifest),
    }

    if start_script:
        prod_manifest["scripts"] = {"start": start_script}

    return prod_manifest


def resolve_server_runtime_dependencies(
    context: AppContext,
    package_manifest: dict[str, object],
) -> dict[str, str]:
    declared_dependencies = package_manifest.get("dependencies")
    if not isinstance(declared_dependencies, dict):
        raise NkError("apps/server/package.json is missing dependencies.")

    external_dependencies = {
        name: str(version)
        for name, version in declared_dependencies.items()
        if not is_workspace_dependency(name, version)
    }

    exact_dependencies = resolve_exact_server_dependencies(context)
    if exact_dependencies is None:
        print(
            "warning: using dependency ranges from apps/server/package.json for prod manifest",
            file=sys.stderr,
        )
        return external_dependencies

    for name, version in external_dependencies.items():
        exact_dependencies.setdefault(name, version)

    return exact_dependencies


def resolve_exact_server_dependencies(
    context: AppContext,
) -> dict[str, str] | None:
    command = [
        resolve_executable("pnpm"),
        "ls",
        "--filter",
        "server",
        "--prod",
        "--json",
        "--depth",
        "0",
    ]

    try:
        result = subprocess.run(
            command,
            cwd=context.repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None

    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError:
        return None

    if not isinstance(payload, list) or not payload:
        return None

    dependencies = payload[0].get("dependencies")
    if not isinstance(dependencies, dict):
        return None

    resolved_dependencies: dict[str, str] = {}
    for name, dependency_info in dependencies.items():
        if not isinstance(dependency_info, dict):
            continue

        version = dependency_info.get("version")
        if version is None or is_workspace_dependency(name, version):
            continue

        resolved_dependencies[name] = str(version)

    return resolved_dependencies or None


def is_workspace_dependency(name: str, version: object) -> bool:
    version_string = str(version)
    return name.startswith("@workspace/") or version_string.startswith(
        ("workspace:", "link:")
    )


def read_json(path: Path) -> dict[str, object]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise NkError(f"Required file was not found: '{path}'.") from error
    except json.JSONDecodeError as error:
        raise NkError(f"Invalid JSON in '{path}': {error.msg}.") from error

    if not isinstance(payload, dict):
        raise NkError(f"Expected a JSON object in '{path}'.")

    return payload
