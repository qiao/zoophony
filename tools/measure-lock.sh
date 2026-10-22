#!/usr/bin/env bash
# Usage:
#   tools/measure-lock.sh run --owner <name> [--gate <load>] [--max <s>] -- <cmd> [<arg>...]
#   tools/measure-lock.sh status
#
# The fair lock of the timed measures (docs/agents/workflow.md, "Performance rounds"). Two agents
# that measure on one machine at the same time disturb each other, so each timed measure (a trace,
# a load probe, pnpm frame, a timed probe) runs through this script.
#
# The lock is scratch/measure.lock/ in the main checkout, and the queue is scratch/measure.queue/
# there. The script finds the main checkout from `git rev-parse --git-common-dir`, so each worktree
# uses the same lock.
#
# `run` writes a ticket with the next number into the queue, and waits until its ticket is the
# first. With --gate, it then waits until the load average of 1 minute is below <load>. Then it
# takes the lock, writes the owner file (<name>, the PID of this script, and the time), removes its
# ticket, and runs the command in a process group of its own. At the end of the command, and after
# INT, TERM, or HUP, it removes the lock only when the owner file names its own PID. It exits with
# the exit code of the command, 124 when --max stops the command (default 900 s), or 128 + the
# number of the signal.
#
# A ticket whose PID is dead goes out of the queue. A lock whose owner PID is dead is stale, and
# `run` removes it with a warning: a `kill -9` of a holder leaves its lock, and the next `run`
# removes it. A lock with no PID in its owner file (the manual `mkdir` of the old rule) is stale
# only after 25 minutes. Each wait reads the PIDs of the files and asks `kill -0`, so no wait
# matches its own command line.
#
# `status` prints the owner, its age, and the queue.
#
# MEASURE_LOCK_DIR replaces the folder of the lock and the queue, so that a check of the script
# does not touch the lock of the agents.
set -euo pipefail

usage() {
  echo 'Usage: tools/measure-lock.sh run --owner <name> [--gate <load>] [--max <s>] -- <cmd> [<arg>...]' >&2
  echo '       tools/measure-lock.sh status' >&2
  exit 1
}

if [ -n "${MEASURE_LOCK_DIR:-}" ]; then
  folder=$MEASURE_LOCK_DIR
else
  common=$(git rev-parse --path-format=absolute --git-common-dir)
  folder="$(dirname "$common")/scratch"
fi
lock="$folder/measure.lock"
queue="$folder/measure.queue"
mkdir -p "$queue"

# The seconds since the last change of a file.
age_of() {
  local stamp
  stamp=$(stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0)
  echo $(($(date +%s) - stamp))
}

# True when a PID names a live process.
alive() {
  [ -n "$1" ] && kill -0 "$1" 2>/dev/null
}

# The PID of the owner file of the lock, or nothing for the manual lock of the old rule.
owner_pid() {
  local pid
  pid=$(awk '{ print $2 }' "$lock/owner" 2>/dev/null || true)
  case "$pid" in
  '' | *[!0-9]*) echo '' ;;
  *) echo "$pid" ;;
  esac
}

# Removes the lock when it is stale, and prints a warning.
clear_stale() {
  [ -d "$lock" ] || return 0
  local pid age
  pid=$(owner_pid)
  if [ -f "$lock/owner" ]; then
    age=$(age_of "$lock/owner")
  else
    age=$(age_of "$lock")
  fi
  if [ -n "$pid" ]; then
    if ! alive "$pid"; then
      echo "measure-lock: removes the stale lock of a dead PID: $(cat "$lock/owner" 2>/dev/null)" >&2
      rm -rf "$lock"
    fi
  elif [ "$age" -gt 1500 ]; then
    echo "measure-lock: removes a lock with no PID, ${age} s old: $(cat "$lock/owner" 2>/dev/null)" >&2
    rm -rf "$lock"
  fi
}

# Gives the next ticket number. A mkdir mutex keeps the count in order.
next_ticket() {
  local mutex="$queue/.mutex" waited=0 seq
  until mkdir "$mutex" 2>/dev/null; do
    sleep 0.05
    waited=$((waited + 1))
    # A holder of the mutex needs a few ms. After about 10 s, the mutex is left over.
    if [ "$waited" -gt 200 ]; then
      rmdir "$mutex" 2>/dev/null || true
      waited=0
    fi
  done
  seq=$(cat "$queue/.seq" 2>/dev/null || echo 0)
  seq=$((seq + 1))
  echo "$seq" >"$queue/.seq"
  rmdir "$mutex"
  printf '%010d' "$seq"
}

# Removes each ticket whose PID is dead, and prints the first ticket.
first_ticket() {
  local file pid
  for file in "$queue"/[0-9]*; do
    [ -f "$file" ] || continue
    pid=$(awk '{ print $2 }' "$file" 2>/dev/null || true)
    if ! alive "$pid"; then
      rm -f "$file"
    fi
  done
  for file in "$queue"/[0-9]*; do
    if [ -f "$file" ]; then
      basename "$file"
      return 0
    fi
  done
  return 0
}

# The load average of 1 minute.
load_average() {
  if [ -r /proc/loadavg ]; then
    awk '{ print $1 }' /proc/loadavg
  else
    sysctl -n vm.loadavg | awk '{ print $2 }'
  fi
}

status() {
  if [ -d "$lock" ]; then
    local pid state
    pid=$(owner_pid)
    if [ -z "$pid" ]; then
      state='no PID'
    elif alive "$pid"; then
      state='alive'
    else
      state='dead'
    fi
    echo "lock: $(cat "$lock/owner" 2>/dev/null || echo '(no owner file)'), $(age_of "$lock") s old, PID $state"
  else
    echo 'lock: free'
  fi
  local file count=0
  for file in "$queue"/[0-9]*; do
    [ -f "$file" ] || continue
    count=$((count + 1))
    echo "queue $(basename "$file"): $(cat "$file"), $(age_of "$file") s"
  done
  if [ "$count" -eq 0 ]; then
    echo 'queue: empty'
  fi
}

run() {
  local owner='' gate='' max=900
  while [ $# -gt 0 ]; do
    case "$1" in
    --owner) owner=${2:-}; shift 2 ;;
    --gate) gate=${2:-}; shift 2 ;;
    --max) max=${2:-}; shift 2 ;;
    --) shift; break ;;
    *) usage ;;
    esac
  done
  if [ -z "$owner" ] || [ $# -eq 0 ]; then
    usage
  fi
  case "$owner" in *' '*) echo 'measure-lock: the owner name has no space.' >&2; exit 1 ;; esac

  local me=$$ ticket child='' code=0 signal=''
  ticket=$(next_ticket)
  echo "$owner $me $(date '+%Y-%m-%dT%H:%M:%S')" >"$queue/$ticket"

  release() {
    rm -f "$queue/$ticket"
    if [ -d "$lock" ] && [ "$(owner_pid)" = "$me" ]; then
      rm -rf "$lock"
    fi
  }
  stop() {
    signal=$1
    if [ -n "$child" ] && alive "$child"; then
      kill -TERM -- "-$child" 2>/dev/null || kill -TERM "$child" 2>/dev/null || true
    fi
    release
    exit $((128 + signal))
  }
  trap 'stop 1' HUP
  trap 'stop 2' INT
  trap 'stop 15' TERM
  trap release EXIT

  local said=''
  while [ "$(first_ticket)" != "$ticket" ]; do
    if [ -z "$said" ]; then
      echo "measure-lock: ticket $ticket of $owner waits in the queue." >&2
      said=1
    fi
    sleep 2
  done
  if [ -n "$gate" ]; then
    said=''
    while ! awk -v load="$(load_average)" -v gate="$gate" 'BEGIN { exit !(load < gate) }'; do
      if [ -z "$said" ]; then
        echo "measure-lock: $owner waits until the load average of 1 minute is below $gate (now $(load_average))." >&2
        said=1
      fi
      sleep 5
    done
  fi
  said=''
  while true; do
    clear_stale
    if mkdir "$lock" 2>/dev/null; then
      break
    fi
    if [ -z "$said" ]; then
      echo "measure-lock: $owner waits for the lock of: $(cat "$lock/owner" 2>/dev/null)" >&2
      said=1
    fi
    sleep 2
  done
  echo "$owner $me $(date '+%Y-%m-%dT%H:%M:%S')" >"$lock/owner"
  rm -f "$queue/$ticket"
  echo "measure-lock: $owner holds the lock." >&2

  # The command gets a process group of its own, so that a stop also ends its children.
  set -m
  "$@" &
  child=$!
  set +m
  local start
  start=$(date +%s)
  while alive "$child"; do
    if [ $(($(date +%s) - start)) -ge "$max" ]; then
      echo "measure-lock: the command of $owner ran for $max s, so the lock stops it." >&2
      kill -TERM -- "-$child" 2>/dev/null || kill -TERM "$child" 2>/dev/null || true
      sleep 5
      kill -KILL -- "-$child" 2>/dev/null || true
      wait "$child" 2>/dev/null || true
      release
      exit 124
    fi
    sleep 1
  done
  wait "$child" || code=$?
  release
  echo "measure-lock: $owner frees the lock (exit code $code)." >&2
  exit "$code"
}

case "${1:-}" in
run) shift; run "$@" ;;
status) status ;;
*) usage ;;
esac
