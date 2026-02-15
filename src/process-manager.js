import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

const MAX_LOG_LINES = 10000;

class ManagedProcess extends EventEmitter {
  constructor(id, command, args, options) {
    super();
    this.id = id;
    this.command = command;
    this.args = args;
    this.options = options;
    this.logs = [];
    this.readCursor = 0;
    this.exitCode = null;
    this.startedAt = new Date().toISOString();
    this.stoppedAt = null;
    this.proc = null;
  }

  start() {
    this.exitCode = null;
    this.stoppedAt = null;
    this.startedAt = new Date().toISOString();

    this.proc = spawn(this.command, this.args, {
      cwd: this.options.cwd || process.cwd(),
      env: { ...process.env, ...this.options.env },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.proc.stdout.on('data', (data) => {
      this._appendLog('stdout', data.toString());
    });

    this.proc.stderr.on('data', (data) => {
      this._appendLog('stderr', data.toString());
    });

    this.proc.on('error', (err) => {
      this._appendLog('error', err.message);
      this.emit('error', err);
    });

    this.proc.on('close', (code, signal) => {
      this.exitCode = code;
      this.stoppedAt = new Date().toISOString();
      this._appendLog('system', `Process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`);
      this.emit('exit', code, signal);
    });

    return this;
  }

  _appendLog(stream, text) {
    const lines = text.split('\n').filter(l => l.length > 0);
    const timestamp = new Date().toISOString();
    for (const line of lines) {
      this.logs.push({ timestamp, stream, line });
    }
    // Trim to max size
    if (this.logs.length > MAX_LOG_LINES) {
      const excess = this.logs.length - MAX_LOG_LINES;
      this.logs.splice(0, excess);
      this.readCursor = Math.max(0, this.readCursor - excess);
    }
  }

  tail(n = 50) {
    return this.logs.slice(-n);
  }

  read() {
    const unread = this.logs.slice(this.readCursor);
    this.readCursor = this.logs.length;
    return unread;
  }

  kill(signal = 'SIGTERM') {
    if (this.proc && !this.proc.killed) {
      this.proc.kill(signal);
      return true;
    }
    return false;
  }

  get alive() {
    return this.proc != null && !this.proc.killed && this.exitCode === null;
  }

  toJSON() {
    return {
      id: this.id,
      command: this.command,
      args: this.args,
      cwd: this.options.cwd || process.cwd(),
      alive: this.alive,
      pid: this.proc?.pid ?? null,
      exitCode: this.exitCode,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      logLines: this.logs.length,
    };
  }
}

class ProcessManager {
  constructor() {
    this.processes = new Map();
    this._nextId = 1;
  }

  start(command, { args = [], cwd, env, id } = {}) {
    const procId = id || `proc-${this._nextId++}`;

    if (this.processes.has(procId) && this.processes.get(procId).alive) {
      throw new Error(`Process "${procId}" is already running. Kill it first or use a different id.`);
    }

    const managed = new ManagedProcess(procId, command, args, { cwd, env });
    managed.start();
    this.processes.set(procId, managed);

    return managed.toJSON();
  }

  tail(procId, n = 50) {
    const managed = this._get(procId);
    return {
      process: managed.toJSON(),
      lines: managed.tail(n),
    };
  }

  read(procId) {
    const managed = this._get(procId);
    return {
      process: managed.toJSON(),
      lines: managed.read(),
    };
  }

  kill(procId, signal = 'SIGTERM') {
    const managed = this._get(procId);
    const killed = managed.kill(signal);
    return {
      process: managed.toJSON(),
      killed,
    };
  }

  restart(procId) {
    const managed = this._get(procId);
    if (managed.alive) {
      managed.kill('SIGTERM');
    }

    // Clear old logs on restart
    managed.logs = [];
    managed.readCursor = 0;

    // Small delay to let the process die, then restart
    return new Promise((resolve) => {
      const doStart = () => {
        managed.start();
        resolve(managed.toJSON());
      };

      if (managed.alive) {
        managed.once('exit', () => setTimeout(doStart, 100));
        // Safety timeout
        setTimeout(doStart, 3000);
      } else {
        doStart();
      }
    });
  }

  list() {
    return Array.from(this.processes.values()).map(p => p.toJSON());
  }

  remove(procId) {
    const managed = this._get(procId);
    if (managed.alive) {
      managed.kill('SIGKILL');
    }
    this.processes.delete(procId);
    return { removed: procId };
  }

  _get(procId) {
    const managed = this.processes.get(procId);
    if (!managed) {
      throw new Error(`No process found with id "${procId}". Use list_processes to see available processes.`);
    }
    return managed;
  }
}

export const manager = new ProcessManager();
