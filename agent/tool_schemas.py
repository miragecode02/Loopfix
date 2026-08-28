"""Groq/OpenAI-style tool schemas for the investigation-only tool set.

Every tool requires a `reason` string so each call is self-documenting
in the execution log (tool name, input, output, and why it was
called) without relying on the model's raw chain-of-thought.
"""

_REASON_PROPERTY = {
    "reason": {
        "type": "string",
        "description": "One short sentence: why you're calling this tool right now.",
    }
}

READ_ONLY_TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read a file's contents, optionally a specific inclusive line range. Output is line-numbered.",
            "parameters": {
                "type": "object",
                "properties": {
                    **_REASON_PROPERTY,
                    "path": {"type": "string", "description": "File path relative to the repo root."},
                    "start_line": {"type": "integer", "description": "1-indexed first line to include (optional)."},
                    "end_line": {"type": "integer", "description": "1-indexed last line to include, inclusive (optional)."},
                },
                "required": ["reason", "path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List files and subdirectories under a path in the repo, excluding vcs/build/dependency noise.",
            "parameters": {
                "type": "object",
                "properties": {
                    **_REASON_PROPERTY,
                    "path": {"type": "string", "description": "Directory path relative to the repo root. Defaults to the repo root."},
                    "recursive": {"type": "boolean", "description": "Walk subdirectories too. Defaults to false."},
                },
                "required": ["reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_text",
            "description": "Full-text search the repo (ripgrep) for a literal string or regex. Returns matching {path, line, text}.",
            "parameters": {
                "type": "object",
                "properties": {
                    **_REASON_PROPERTY,
                    "query": {"type": "string", "description": "Text or regex to search for."},
                    "glob": {"type": "string", "description": "Optional glob to restrict which files are searched, e.g. '*.py'."},
                },
                "required": ["reason", "query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_symbol",
            "description": "Look up a function/class/method definition by name (bare or qualified, e.g. 'run' or 'Runner.run'). Returns its file and line range.",
            "parameters": {
                "type": "object",
                "properties": {
                    **_REASON_PROPERTY,
                    "name": {"type": "string", "description": "Symbol name to look up."},
                },
                "required": ["reason", "name"],
            },
        },
    },
]
