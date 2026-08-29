"""Runs a target repo's pytest suite inside an isolated Docker container.

Usage:
    python runner.py <repo_path> [pytest_args...]

Example:
    python runner.py toy_repo test_mathutils.py
"""

import argparse
import hashlib
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

IMAGE = "loopfix-sandbox:python3.11"
DEFAULT_TIMEOUT_SECONDS = 120
DEFAULT_MEMORY = "512m"
DEFAULT_CPUS = "1"

# Layered on top of IMAGE at build time (network allowed — docker build
# is unaffected by the --network none used at `docker run` time), so a
# benchmark task's pinned third-party dependencies are installed before
# its still-network-isolated test run.
TASK_DOCKERFILE = """\
FROM {base_image}
USER root
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
USER runner
"""


def build_image(dockerfile_dir):
    subprocess.run(
        ["docker", "build", "-t", IMAGE, "-f", f"{dockerfile_dir}/Dockerfile", dockerfile_dir],
        check=True,
    )


def build_task_image(task_dir, base_image=IMAGE):
    """Build (or reuse) an image with a benchmark task's pinned
    dependencies installed on top of base_image.

    Tagged by a hash of requirements.txt, so unchanged tasks skip
    rebuilding entirely. Returns the image tag.
    """
    requirements_path = Path(task_dir) / "requirements.txt"
    requirements = requirements_path.read_text(encoding="utf-8")
    digest = hashlib.sha256(requirements.encode("utf-8")).hexdigest()[:12]
    tag = f"loopfix-sandbox-task:{digest}"

    already_built = subprocess.run(
        ["docker", "image", "inspect", tag], capture_output=True
    )
    if already_built.returncode == 0:
        return tag

    with tempfile.TemporaryDirectory() as build_dir:
        build_dir = Path(build_dir)
        (build_dir / "requirements.txt").write_text(requirements, encoding="utf-8")
        (build_dir / "Dockerfile").write_text(
            TASK_DOCKERFILE.format(base_image=base_image), encoding="utf-8"
        )
        subprocess.run(["docker", "build", "-t", tag, str(build_dir)], check=True)

    return tag


def run_tests(repo_path, pytest_args=None, timeout=DEFAULT_TIMEOUT_SECONDS, image=IMAGE):
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
        image,
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
    parser.add_argument(
        "--task-deps",
        help="Directory containing a requirements.txt to install into the sandbox image before running (for benchmark tasks with real third-party dependencies).",
    )
    parser.add_argument("repo_path", help="Absolute path to the repo to mount and test")
    parser.add_argument(
        "pytest_args", nargs=argparse.REMAINDER, help="Args passed through to pytest"
    )
    args = parser.parse_args()

    image = build_task_image(args.task_deps) if args.task_deps else IMAGE
    result = run_tests(args.repo_path, args.pytest_args, timeout=args.timeout, image=image)

    print(result["stdout"])
    print(result["stderr"], file=sys.stderr)
    print(
        f"\n[runner] returncode={result['returncode']} "
        f"timed_out={result['timed_out']} duration={result['duration_seconds']}s"
    )
    sys.exit(result["returncode"] if not result["timed_out"] else 1)


if __name__ == "__main__":
    main()
