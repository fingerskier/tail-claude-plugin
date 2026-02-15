# tail-claude-plugin

Run applications in background sub-processes and stream their logs back to Claude.

## Features

- **start_process** -- launch any shell command in the background
- **tail_logs** -- show the last N lines of output
- **read_logs** -- stream new output since last read
- **kill_process** -- send a signal to stop a process
- **restart_process** -- stop and re-launch a process
- **list_processes** -- show all managed processes
- **remove_process** -- clean up finished processes

## Install

Add the Fingerskier marketplace and install:

```bash
claude plugin marketplace add fingerskier/claude-plugins
claude plugin install tail@fingerskier-plugins
```

Or install directly via npm:

```bash
claude mcp add tail -- npx -y tail-claude-plugin
```

## Usage

Once installed, Claude has access to the `tail:` tools. Examples:

```
> Start a dev server and show me the logs

Claude will call tail:start_process with command "npm run dev",
then tail:read_logs to show the startup output.
```

```
> Restart the server and tail the last 100 lines

Claude will call tail:restart_process, then tail:tail_logs with lines=100.
```

## How It Works

The plugin runs an MCP server that manages child processes. Each process's stdout and stderr are captured into an in-memory ring buffer (up to 10,000 lines). Claude can then query those logs at any time using `tail_logs` (last N lines) or `read_logs` (streaming cursor).

Processes persist for the lifetime of the MCP server session. When Claude's session ends, all managed processes are cleaned up.

## License

[MIT](./LICENSE)
