"""Runs a target repo's pytest suite inside an isolated Docker container.

Usage:
    python runner.py <repo_path> [pytest_args...]

Example:
    python runner.py toy_repo test_mathutils.py
"""

import argparse
import subprocess
import sys
import time
import uuid

IMAGE = "loopfix-sandbox:python3.11"
DEFAULT_TIMEOUT_SECONDS = 120
DEFAULT_MEMORY = "512m"
DEFAULT_CPUS = "1"


def build_image(dockerfile_dir):
    subprocess.run(
        ["docker", "build", "-t", IMAGE, "-f", f"{dockerfile_dir}/Dockerfile", dockerfile_dir],
        check=True,
    )


def run_tests(repo_path, pytest_args=None, timeout=DEFAULT_TIMEOUT_SECONDS):
    """Run pytest for repo_path inside the sandbox container.

    Returns a dict: {returncode, stdout, stderr, timed_out, duration_seconds}.
    """
    pytest_args = pytest_args or []
    container_name = f"loopfix-{uuid.uuid4().hex[:12]}"

    cmd = [
        "docker", "run", "--rm",
        "--name", container_name,
        "--network", "none",
        "--memory", DEFAULT_MEMORY,
        "--cpus", DEFAULT_CPUS,
        "-v", f"{repo_path}:/workspace:rw",
        IMAGE,
        *pytest_args,
    ]

    start = time.monotonic()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    try:
        stdout, stderr = proc.communicate(timeout=timeout)
        timed_out = False
    except subprocess.TimeoutExpired:
        # `docker run --rm` means the daemon-side container survives even
        # after we stop waiting on the client process, so it must be
        # killed explicitly or it keeps running (and holding the timeout
        # hostage) in the background.
        subprocess.run(["docker", "kill", container_name], capture_output=True)
        stdout, stderr = proc.communicate()
        timed_out = True

    duration = time.monotonic() - start

    return {
        "returncode": proc.returncode,
        "stdout": stdout,
        "stderr": stderr,
        "timed_out": timed_out,
        "duration_seconds": round(duration, 2),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_SECONDS)
    parser.add_argument("repo_path", help="Absolute path to the repo to mount and test")
    parser.add_argument(
        "pytest_args", nargs=argparse.REMAINDER, help="Args passed through to pytest"
    )
    args = parser.parse_args()

    result = run_tests(args.repo_path, args.pytest_args, timeout=args.timeout)

    print(result["stdout"])
    print(result["stderr"], file=sys.stderr)
    print(
        f"\n[runner] returncode={result['returncode']} "
        f"timed_out={result['timed_out']} duration={result['duration_seconds']}s"
    )
    sys.exit(result["returncode"] if not result["timed_out"] else 1)


if __name__ == "__main__":
    main()
