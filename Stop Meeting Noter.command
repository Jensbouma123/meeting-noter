#!/bin/bash
# Stops a running Meeting Noter (and its helper).
cd "$(dirname "$0")" || exit 1
if [ -f .runtime-server.pid ] && kill -0 "$(cat .runtime-server.pid)" 2>/dev/null; then
  kill "$(cat .runtime-server.pid)"
  echo "Meeting Noter is gestopt."
else
  echo "Meeting Noter draaide niet (of is al gestopt)."
fi
sleep 2
