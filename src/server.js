import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { manager } from './process-manager.js';

function formatLogLines(lines) {
  if (lines.length === 0) return '(no output)';
  return lines
    .map(l => `[${l.timestamp}] [${l.stream}] ${l.line}`)
    .join('\n');
}

export async function startServer() {
  const server = new McpServer({
    name: 'tail',
    version: '2026.2.15',
  });

  server.tool(
    'start_process',
    'Start a command in a background sub-process. Returns the process id for use with other tools. Logs are captured automatically.',
    {
      command: z.string().describe('The command to run (passed to shell)'),
      id: z.string().optional().describe('Custom process id. Auto-generated if omitted.'),
      cwd: z.string().optional().describe('Working directory for the process'),
    },
    async ({ command, id, cwd }) => {
      try {
        const info = manager.start(command, { cwd, id });
        return {
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'tail_logs',
    'Show the last N log lines from a running or exited process. Defaults to 50 lines.',
    {
      id: z.string().describe('The process id'),
      lines: z.number().int().positive().optional().describe('Number of lines to show (default 50)'),
    },
    async ({ id, lines }) => {
      try {
        const result = manager.tail(id, lines ?? 50);
        const output = [
          `Process: ${result.process.id} (${result.process.alive ? 'running' : 'stopped'})`,
          `--- last ${result.lines.length} lines ---`,
          formatLogLines(result.lines),
        ].join('\n');
        return { content: [{ type: 'text', text: output }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );

  server.tool(
    'read_logs',
    'Read new (unread) log output from a process since the last read. Use this for streaming-style log consumption.',
    {
      id: z.string().describe('The process id'),
    },
    async ({ id }) => {
      try {
        const result = manager.read(id);
        const output = [
          `Process: ${result.process.id} (${result.process.alive ? 'running' : 'stopped'})`,
          `--- ${result.lines.length} new lines ---`,
          formatLogLines(result.lines),
        ].join('\n');
        return { content: [{ type: 'text', text: output }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );

  server.tool(
    'kill_process',
    'Send a signal to stop a running process. Defaults to SIGTERM.',
    {
      id: z.string().describe('The process id'),
      signal: z.enum(['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP']).optional()
        .describe('Signal to send (default SIGTERM)'),
    },
    async ({ id, signal }) => {
      try {
        const result = manager.kill(id, signal ?? 'SIGTERM');
        return {
          content: [{
            type: 'text',
            text: result.killed
              ? `Sent ${signal ?? 'SIGTERM'} to process "${id}" (pid ${result.process.pid})`
              : `Process "${id}" was already stopped (exit code: ${result.process.exitCode})`,
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );

  server.tool(
    'restart_process',
    'Restart a process using its original command and arguments. Clears old logs.',
    {
      id: z.string().describe('The process id'),
    },
    async ({ id }) => {
      try {
        const info = await manager.restart(id);
        return {
          content: [{ type: 'text', text: `Restarted process "${id}":\n${JSON.stringify(info, null, 2)}` }],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );

  server.tool(
    'list_processes',
    'List all managed processes (running and exited).',
    {},
    async () => {
      const procs = manager.list();
      if (procs.length === 0) {
        return { content: [{ type: 'text', text: 'No managed processes.' }] };
      }
      const table = procs.map(p =>
        `${p.id}  ${p.alive ? 'RUNNING' : 'STOPPED'}  pid=${p.pid ?? '-'}  exit=${p.exitCode ?? '-'}  cmd="${p.command}"  logs=${p.logLines}`
      ).join('\n');
      return { content: [{ type: 'text', text: table }] };
    },
  );

  server.tool(
    'remove_process',
    'Remove a process from the managed list. Kills it first if still running.',
    {
      id: z.string().describe('The process id to remove'),
    },
    async ({ id }) => {
      try {
        const result = manager.remove(id);
        return { content: [{ type: 'text', text: `Removed process "${result.removed}" from managed list.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
