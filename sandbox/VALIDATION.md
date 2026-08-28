# Sandbox validation (2026-08-28)

Ran `runner.py` against `toy_repo` with the built `loopfix-sandbox:python3.11` image.

| Check | Command | Result |
|---|---|---|
| Normal execution | `runner.py toy_repo -v test_mathutils.py` | 2 passed, returncode=0, ~1.6s |
| Network isolation | `runner.py toy_repo -v test_network.py` | test asserts the socket connect fails; passed → network unreachable from inside the container |
| Timeout enforcement | `runner.py --timeout 15 toy_repo -v test_hang.py` (test sleeps 600s) | killed after ~15.3s, returncode=137 (SIGKILL), `timed_out=True` |
| Cleanup | `docker ps -a --filter name=loopfix-` after each run | no orphaned containers left behind |

Conclusion: isolation (`--network none`), resource caps (`--memory`, `--cpus`), and the hard timeout (client-side wait + `docker kill` on expiry) all behave as intended on this host. Safe to build the read-only tools next.
