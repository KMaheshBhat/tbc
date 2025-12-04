#!/bin/bash

# Refresh Party script for Third Brain Companion System
# This script creates an index of Party Records from vault
# and writes them to dex/party.md for use in interactions.

mkdir -p dex

{
echo "=== Party Records Index ==="
for file in vault/*.md; do
    if grep -q "record_type: party" "$file"; then
        id=$(grep "^id:" "$file" | head -1 | sed 's/id: //')
        party_type=$(grep "^party_type:" "$file" | head -1 | sed 's/party_type: //')
        title=$(grep "^# " "$file" | head -1 | sed 's/# //')
        echo "- id: $id, type: $party_type, title: $title"
    fi
done
} > dex/party.md