#!/bin/bash

# Refresh Core script for Third Brain Companion System
# This script collates the TBC System Definitions and Root Record
# and writes them to dex/core.md for use in interactions.

mkdir -p dex

directories=("tbc/specs" "tbc/extensions")

{
echo "=== Root Record ==="
cat tbc/root.md
echo ""

echo "=== TBC System Definitions ==="
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        for file in "$dir"/*.md; do
            echo "=== $file ==="
            cat "$file"
            echo ""
        done
    fi
done
} > dex/core.md