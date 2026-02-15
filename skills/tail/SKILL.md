---
name: tail
description: "Tail and stream logs from background processes. View recent output, read new lines, and monitor running applications. Use when tailing logs, checking process output, streaming application logs, or monitoring background tasks."
---

# Tail - Log Streaming

Stream and tail logs from background processes using the `tail:` MCP tools.

## Quick Reference

| Tool | Purpose |
|------|---------|
| `tail:start_process` | Launch a command in the background |
| `tail:tail_logs` | Show last N log lines |
| `tail:read_logs` | Read new output since last read |
| `tail:kill_process` | Stop a running process |
| `tail:restart_process` | Restart a process |
| `tail:list_processes` | Show all managed processes |
| `tail:remove_process` | Remove a process from the list |

## Common Workflows

### Start and monitor a dev server

1. `tail:start_process` with `command: "npm run dev"` and `id: "dev-server"`
2. `tail:read_logs` with `id: "dev-server"` to check startup output
3. Periodically `tail:tail_logs` with `id: "dev-server"` to see recent logs

### Watch a build

1. `tail:start_process` with `command: "npm run build -- --watch"`
2. `tail:read_logs` to stream incremental output

### Debug a failing process

1. `tail:tail_logs` to see the last N lines of output
2. Check for errors in stderr lines
3. `tail:restart_process` after applying a fix
