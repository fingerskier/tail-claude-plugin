---
name: processes
description: "Manage background processes and sub-processes. Start, stop, restart, and list running applications. Use when launching servers, running builds, managing background tasks, or controlling sub-processes."
---

# Processes - Background Process Management

Manage background sub-processes using the `tail:` MCP tools.

## Process Lifecycle

1. **Start** -- `tail:start_process` launches a command in the background
2. **Monitor** -- `tail:tail_logs` or `tail:read_logs` to watch output
3. **Stop** -- `tail:kill_process` sends a signal (SIGTERM by default)
4. **Restart** -- `tail:restart_process` stops and re-launches
5. **Clean up** -- `tail:remove_process` removes from the managed list

## Tips

- Each process gets an id (auto-generated or custom). Use meaningful ids like `"api-server"` or `"webpack"`.
- Logs persist even after a process exits, so you can inspect crash output.
- `read_logs` tracks a cursor -- it only returns lines you haven't seen. Use it for streaming.
- `tail_logs` always returns the last N lines regardless of what you've already read.
- `restart_process` clears old logs and re-runs the original command.
