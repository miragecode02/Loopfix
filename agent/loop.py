"""Investigation-only agent loop: root-cause analysis via tool calling.

No edit_file/run_tests tools exist yet on purpose — this phase only
proves the loop can correctly diagnose a failure using search/read
tools before any write capability is added.
"""

import json
import os

from dotenv import load_dotenv
from groq import Groq

from tools.list_directory import list_directory
from tools.read_file import read_file
from tools.search_symbol import search_symbol
from tools.search_text import search_text

from .tool_schemas import READ_ONLY_TOOL_SCHEMAS

load_dotenv()

DEFAULT_MODEL = "openai/gpt-oss-120b"
MAX_TOOL_CALLS = 15
TEMPERATURE = 0.2  # low, per Groq's tool-calling guidance, for reliable structured calls

SYSTEM_PROMPT = """You are an investigation-only coding agent. You are given a repo and a \
description of a test failure (a bounded task: tests broke after a dependency/library \
version bump). Your job in this phase is ONLY to find the root cause — you cannot edit \
files or run tests, only read and search the repo with the tools provided.

Work like an engineer: form a hypothesis, use tools to check it, revise if the evidence \
doesn't support it. Don't guess without evidence — every claim in your final report must \
be backed by something you actually read or searched for.

When you're confident you've found the root cause (or have exhausted reasonable leads), \
stop calling tools and respond with a final report in exactly this structure:

ROOT CAUSE: <one or two sentences>
EVIDENCE: <files/lines/output that support this, cite them>
PROPOSED FIX: <what you'd change, in words, not a diff>
CONFIDENCE: <low|medium|high>
NOT CHECKED: <anything you didn't verify that could change the diagnosis>
"""


def _make_tool_dispatch(repo_root):
    return {
        "read_file": lambda args: read_file(
            repo_root, args["path"], args.get("start_line"), args.get("end_line")
        ),
        "list_directory": lambda args: list_directory(
            repo_root, args.get("path", "."), args.get("recursive", False)
        ),
        "search_text": lambda args: search_text(repo_root, args["query"], glob=args.get("glob")),
        "search_symbol": lambda args: search_symbol(repo_root, args["name"]),
    }


def _execute_tool_call(dispatch, tool_call):
    name = tool_call.function.name
    args = {}
    reason = None
    try:
        args = json.loads(tool_call.function.arguments)
        reason = args.pop("reason", None)
    except json.JSONDecodeError as e:
        result = {"error": f"invalid tool arguments: {e}"}
    else:
        fn = dispatch.get(name)
        if fn is None:
            result = {"error": f"unknown tool: {name}"}
        else:
            try:
                result = fn(args)
            except Exception as e:
                result = {"error": str(e)}

    log_entry = {"tool": name, "input": args, "reason": reason, "output": result}
    tool_message = {
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": json.dumps(result, default=str),
    }
    return log_entry, tool_message


def investigate(repo_root, task_description, model=None, max_tool_calls=MAX_TOOL_CALLS):
    """Run the investigation-only loop.

    Returns {"report": str, "call_log": [...], "messages": [...]}. The
    call log is what step 5 (structured JSON log + viewer) will persist
    and render; this function just needs to produce it.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set (expected in .env)")

    model = model or os.environ.get("GROQ_MODEL", DEFAULT_MODEL)
    client = Groq(api_key=api_key)
    dispatch = _make_tool_dispatch(repo_root)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": task_description},
    ]
    call_log = []
    total_calls = 0

    while True:
        if total_calls >= max_tool_calls:
            messages.append({
                "role": "user",
                "content": (
                    "You've used your tool-call budget. Give your final report now, in "
                    "the required format, based on what you've found so far."
                ),
            })
            response = client.chat.completions.create(
                model=model, messages=messages, temperature=TEMPERATURE
            )
            final = response.choices[0].message
            return {"report": final.content, "call_log": call_log, "messages": messages}

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=READ_ONLY_TOOL_SCHEMAS,
            tool_choice="auto",
            temperature=TEMPERATURE,
        )
        message = response.choices[0].message
        messages.append(message.model_dump(exclude_none=True))

        if not message.tool_calls:
            return {"report": message.content, "call_log": call_log, "messages": messages}

        for tool_call in message.tool_calls:
            log_entry, tool_message = _execute_tool_call(dispatch, tool_call)
            call_log.append(log_entry)
            messages.append(tool_message)
            total_calls += 1
