#!/usr/bin/env python3
from __future__ import annotations
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent
PACKAGE_SRC = REPO_ROOT / "packages" / "nk" / "src"

if str(PACKAGE_SRC) not in sys.path:
    sys.path.insert(0, str(PACKAGE_SRC))

# Do not move this import above the sys.path modification, otherwise it will fail to import the main function from the nk package.
from nk_cli.main import main


if __name__ == "__main__":
    raise SystemExit(main(repo_root=REPO_ROOT))
