# tail-claude-plugin Specification

## Overview

A Claude Code plugin that lets Claude run applications in background sub-processes, stream their log output, and manage their lifecycle -- all through MCP tools.

## Architecture

```
Claude  <-->  MCP Server (stdio)  <-->  ProcessManager  <-->  child_process.spawn
```

The plugin runs as a single MCP server process. It spawns child processes on demand and captures their stdout/stderr into in-memory ring buffers (capped at 10,000 lines per process).

## MCP Tools

### start_process

Start a command in a background sub-process.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | yes | Shell command to execute |
| `id` | string | no | Custom process identifier (auto-generated if omitted) |
| `cwd` | string | no | Working directory |

Returns process metadata (id, pid, status, timestamps).

### tail_logs

Retrieve the last N lines of output from a process.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | yes | Process identifier |
| `lines` | number | no | Number of lines (default 50) |

### read_logs

Read new (unread) output since the last `read_logs` call. Each process tracks a read cursor independently.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | yes | Process identifier |

### kill_process

Send a signal to a running process.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | yes | Process identifier |
| `signal` | string | no | SIGTERM, SIGKILL, SIGINT, or SIGHUP (default SIGTERM) |

### restart_process

Stop a process (if running) and re-launch it with the same command. Clears old logs.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | yes | Process identifier |

### list_processes

List all managed processes with their status, PID, exit code, and log line count. Takes no parameters.

### remove_process

Remove a process from the managed list. Kills it first if still running.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | yes | Process identifier |

## Log Format

Each log entry contains:
- `timestamp` -- ISO 8601
- `stream` -- `stdout`, `stderr`, `error`, or `system`
- `line` -- the log line text

When displayed, logs are formatted as:
```
[2026-02-15T12:00:00.000Z] [stdout] Server listening on port 3000
```

## Limits

- Max 10,000 log lines per process (oldest lines are discarded)
- Processes are spawned with `shell: true` for command-line compatibility
- stdin is not connected (`ignore`) -- this is for background daemons and build tools, not interactive programs
