#!/bin/bash

# Refresh Goal script for Third Brain Companion System
# This script creates an index of Goal Records from vault
# and writes them to dex/goal.md for use in interactions.

mkdir -p dex

{
echo "=== Goal Records Index ==="
for file in vault/*.md; do
    if grep -q "record_type: goal" "$file"; then
        id=$(grep "^id:" "$file" | head -1 | sed 's/id: //')
        goal_owner=$(grep "^goal_owner:" "$file" | head -1 | sed 's/goal_owner: //')
        goal_type=$(grep "^goal_type:" "$file" | head -1 | sed 's/goal_type: //')
        goal_status=$(grep "^goal_status:" "$file" | head -1 | sed 's/goal_status: //')
        title=$(grep "^# " "$file" | head -1 | sed 's/# //')
        echo "- id: $id, owner: $goal_owner, type: $goal_type, status: $goal_status, title: $title"
    fi
done
} > dex/goal.md