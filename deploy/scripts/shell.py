"""
deploy/scripts/shell.py - thin wrappers around subprocess for readable output.

Windows notes:
  - gcloud is installed as gcloud.cmd on Windows; we resolve it explicitly.
  - shlex.split() uses POSIX rules and can break on Windows paths, so we split
    strings with posix=False on Windows.
  - We always run with shell=False.
"""

from __future__ import annotations

import os
import shlex
import subprocess
import sys
from pathlib import Path

_IS_WIN = sys.platform == "win32"


def _normalize_windows_path(path: str) -> str:
    """Convert Git-Bash style /c/... paths into C:\\... paths."""
    if not _IS_WIN:
        return path
    if len(path) >= 3 and path[0] == "/" and path[2] == "/" and path[1].isalpha():
        tail = path[3:].replace("/", "\\")
        return f"{path[1].upper()}:\\{tail}"
    return path


def _which(name: str) -> str | None:
    import shutil

    hit = shutil.which(name)
    if not hit:
        return None
    return _normalize_windows_path(hit)


def _resolve(exe: str) -> str:
    """
    Resolve an executable robustly on Windows.

    We prefer .cmd/.exe launchers first because Git Bash may expose a POSIX
    shim named "gcloud" that CreateProcess cannot execute directly.
    """
    if not _IS_WIN:
        return exe

    # If the caller already supplied a path or explicit extension, keep it.
    if os.path.sep in exe or "/" in exe or os.path.splitext(exe)[1]:
        return _normalize_windows_path(exe)

    for candidate in (f"{exe}.cmd", f"{exe}.exe", f"{exe}.bat", exe):
        resolved = _which(candidate)
        if resolved:
            return resolved

    # If only a POSIX-style shim is visible (common in Git Bash), prefer a
    # sibling Windows launcher when present.
    plain_hit = _which(exe)
    if plain_hit:
        base, _ext = os.path.splitext(plain_hit)
        for sibling in (base + ".cmd", base + ".exe", base + ".bat"):
            try:
                if os.path.exists(sibling):
                    return sibling
            except OSError:
                pass

    # Fallback for Conda/Git-Bash shells where PATH may omit Cloud SDK bin.
    if exe == "gcloud":
        cloud_sdk_bins = [
            Path(os.environ.get("LOCALAPPDATA", "")) / "Google" / "Cloud SDK" / "google-cloud-sdk" / "bin",
            Path(os.environ.get("ProgramFiles", "")) / "Google" / "Cloud SDK" / "google-cloud-sdk" / "bin",
            Path(os.environ.get("ProgramFiles(x86)", "")) / "Google" / "Cloud SDK" / "google-cloud-sdk" / "bin",
        ]
        for bin_dir in cloud_sdk_bins:
            cmd_path = bin_dir / "gcloud.cmd"
            exe_path = bin_dir / "gcloud.exe"
            try:
                if cmd_path.exists():
                    return str(cmd_path)
                if exe_path.exists():
                    return str(exe_path)
            except OSError:
                # Ignore permission/path issues and continue searching.
                pass

    # Last resort: let subprocess raise a clear error.
    return exe


def _prepare_cmd(cmd: str | list[str]) -> list[str]:
    """Normalise cmd to a list and resolve the executable."""
    if isinstance(cmd, str):
        cmd = shlex.split(cmd, posix=not _IS_WIN)
    cmd = list(cmd)
    cmd[0] = _resolve(cmd[0])
    return cmd


def run(
    cmd: str | list[str],
    *,
    check: bool = True,
    capture: bool = False,
    input: str | None = None,
) -> str:
    """
    Run a command, streaming stdout/stderr unless capture=True.
    Returns stdout as a stripped string.
    """
    cmd = _prepare_cmd(cmd)
    print(f"  $ {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            text=True,
            stdout=subprocess.PIPE if capture else None,
            stderr=subprocess.PIPE if capture else None,
            input=input,
        )
    except FileNotFoundError:
        print(
            f"Executable not found: {cmd[0]}\n"
            "Install Google Cloud SDK and ensure gcloud.cmd is on PATH.",
            file=sys.stderr,
        )
        sys.exit(127)

    if check and result.returncode != 0:
        if capture:
            print(result.stderr or result.stdout or "", file=sys.stderr)
        sys.exit(result.returncode)

    return (result.stdout or "").strip()


def run_ok(cmd: str | list[str]) -> bool:
    """Run a command; return True on success, False on failure."""
    cmd = _prepare_cmd(cmd)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False


def gcloud(*args: str, capture: bool = False) -> str:
    return run([_resolve("gcloud"), *args], capture=capture)


def gcloud_json(*args: str) -> dict | list:
    import json

    raw = run([_resolve("gcloud"), *args, "--format=json"], capture=True)
    return json.loads(raw)
