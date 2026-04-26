# Release Notes

## Third Brain Companion v0.4.x

### Bug Fixes
- **Activity commands** - Fixed root directory resolution for `tbc act start`, `tbc act pause`, and `tbc act close` commands to work consistently from within TBC root directories without requiring explicit `--root` flag (#18)

## Third Brain Companion v0.4.2

### New Features
- **Pi Agent** - Added interface integration plugin for Pi (#5)
- **Skills** - Clarified `--type` filter behavior in `tbc-mem-ops` skill specification

### Bug Fixes
- **Templates** - Renamed system paths from `tbc/dex` to `sys` convention in interface specs (#3)
- **Memory index** - Ensured deterministic ordering by rebuilding the dex index after assimilation (#10)
- **Dex output** - Fixed non-deterministic JSONL output by sorting records by ID (#7)
- **Records** - Records without frontmatter are now processed as-is rather than skipped, resolves an issue with `dex/skill.jsonl` (#12)
- **Skill records** - Prevented duplicate YAML frontmatter in skill records (#12)

### Polish
- Standardized YAML frontmatter field ordering across skill records (#12)

### Tests
- Added Pi integration test; renumbered test suite to 4-digit scheme (#5)
