# Sandbox image for running a target repo's test suite in isolation.
# The target repo is bind-mounted at /workspace at container run time,
# not baked into the image.
FROM python:3.11-slim

# Common build deps some packages' sdists need; kept minimal on purpose.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir pytest

RUN useradd --create-home --uid 1000 runner
USER runner

WORKDIR /workspace

ENTRYPOINT ["pytest"]
