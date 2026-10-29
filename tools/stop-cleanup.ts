/**
 * Cleans up after a stop (INT or TERM) of a tool that runs child processes in temporary folders,
 * such as `--glb` of the probes and `pnpm rig-mesh --check`. One handler stops each child that
 * runs, then removes each folder, then ends the process with the exit code 130.
 */
import type { ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';

/** The time from the stop signal of a child process to its kill, in milliseconds. */
const KILL_AFTER_MS = 3000;

/** The children that run now. */
const children = new Set<ChildProcess>();

/** The temporary folders that a stop removes. */
const folders = new Set<string>();

/** True after the first stop signal, so that a second signal does not start a second cleanup. */
let stopping = false;

/**
 * Stops one child process: the signal TERM first, then a kill after a time.
 *
 * @param child The child process.
 * @param killAfter The time from the signal to the kill, in milliseconds.
 * @returns A promise of the close of the child process.
 */
function stopChild(child: ChildProcess, killAfter: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((done) => {
    const kill = setTimeout(() => child.kill('SIGKILL'), killAfter);
    child.once('close', () => {
      clearTimeout(kill);
      done();
    });
    child.kill('SIGTERM');
  });
}

/**
 * Stops each child process that runs now, and waits for the close of each one.
 *
 * @param killAfter The time from the signal TERM to the kill of a child, in milliseconds.
 * @returns A promise of the close of the children.
 */
export async function stopChildren(killAfter: number = KILL_AFTER_MS): Promise<void> {
  await Promise.all([...children].map((child) => stopChild(child, killAfter)));
}

/**
 * Handles a stop signal: stops the children, removes the folders, and ends the process.
 */
function onStop(): void {
  if (stopping) {
    return;
  }
  stopping = true;
  void stopChildren().finally(() => {
    for (const dir of folders) {
      rmSync(dir, { recursive: true, force: true });
    }
    process.exit(130);
  });
}

/**
 * Puts the handler of the stop signals on the process while it has a child or a folder, and takes
 * it off after the last one.
 */
function refresh(): void {
  const busy = children.size > 0 || folders.size > 0;
  const on = process.listeners('SIGINT').includes(onStop);
  if (busy && !on) {
    process.on('SIGINT', onStop);
    process.on('SIGTERM', onStop);
  } else if (!busy && on) {
    process.off('SIGINT', onStop);
    process.off('SIGTERM', onStop);
  }
}

/**
 * Adds a child process to the children that a stop ends. The child leaves the set at its close.
 *
 * @param child The child process.
 * @returns The child process.
 */
export function trackChild(child: ChildProcess): ChildProcess {
  children.add(child);
  refresh();
  child.once('close', () => {
    children.delete(child);
    refresh();
  });
  return child;
}

/**
 * Adds a temporary folder to the folders that a stop removes.
 *
 * @param dir The folder.
 * @returns A function that takes the folder out of the set, for the end of the work.
 */
export function trackFolder(dir: string): () => void {
  folders.add(dir);
  refresh();
  return () => {
    folders.delete(dir);
    refresh();
  };
}
