"""Groq/OpenAI-style tool schemas: read-only investigation tools plus
the write/test-execution tools used by the bounded fix loop.

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

WRITE_TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "edit_file",
            "description": (
                "Replace one exact, unique occurrence of old_str with new_str in an "
                "existing file. Fails if old_str isn't found or matches more than once "
                "— widen it with more surrounding context rather than retrying blindly. "
                "Never rewrite a whole file with this; target only the lines changing."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    **_REASON_PROPERTY,
                    "path": {"type": "string", "description": "File path relative to the repo root."},
                    "old_str": {"type": "string", "description": "Exact existing text to replace, with enough context to be unique in the file."},
                    "new_str": {"type": "string", "description": "Replacement text."},
                },
                "required": ["reason", "path", "old_str", "new_str"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_file",
            "description": "Create a brand-new file with the given content. Fails if the file already exists — use edit_file for existing files.",
            "parameters": {
                "type": "object",
                "properties": {
                    **_REASON_PROPERTY,
                    "path": {"type": "string", "description": "File path relative to the repo root."},
                    "content": {"type": "string", "description": "Full content of the new file."},
                },
                "required": ["reason", "path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_tests",
            "description": (
                "Run the repo's pytest suite inside an isolated Docker sandbox (no "
                "network, hard timeout) and return pass/fail plus full output. A fix "
                "isn't done until this reports passed=true — never claim success without it."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    **_REASON_PROPERTY,
                    "target": {"type": "string", "description": "Optional specific test file/path to run instead of the whole suite."},
                },
                "required": ["reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_diff",
            "description": "Show the git diff of all changes made so far in the repo.",
            "parameters": {
                "type": "object",
                "properties": {**_REASON_PROPERTY},
                "required": ["reason"],
            },
        },
    },
]

ALL_TOOL_SCHEMAS = READ_ONLY_TOOL_SCHEMAS + WRITE_TOOL_SCHEMAS
