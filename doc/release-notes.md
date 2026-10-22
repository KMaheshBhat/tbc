# Release Notes

## Third Brain Companion v0.6.1

### Framework Updates
- **Portable identities** - Added a single path normaliser (`lib/paths.ts`) that every producer of a vault identity runs through. A record id, a generated skill id and a digest marker are now *portable* relative paths, so a vault carries the same identities on every host. (#22)

### Bug Fixes
- **Windows compatibility** - The CLI now installs, runs and passes its full integration suite on Windows 11. Every identity a vault carries - the collection record ids, the generated skill ids in `dex/skills.jsonl` and the `SOURCE` markers in `dex/sys.digest.txt` - is a POSIX-separated relative path, so a vault built on Windows and the same vault built on POSIX are the same vault, and a vault can be cloned between a Windows drive and a WSL2 drive. (#22)
  - `tbc sys init` no longer fails with `undefined is not an object (evaluating 'ASSETS["templates/root.md"].replace')` and no longer leaves an empty vault behind - the asset manifest is keyed by the portable path, so every asset lookup resolves.
  - `tbc act show` reports the activity address as `act/current/{uuid}/{uuid}.md` instead of `act\current\{uuid}\{uuid}.md`.
  - The compiled binary is written and found as `tbc.exe` on Windows, so the `all:build-dist` test path runs against a real artefact instead of a path that does not exist.
  - The `--clean` step of the build sequence now removes the `dist` folders on Windows - the path probe missed the native separator and removed nothing, which let a stale build survive.
  - The monorepo command runner keeps the child's stderr in the captured output. `stderr: 1` hands the child the parent's file descriptor rather than merging the streams, so the diagnostics escaped to the terminal and were lost.

### Tests
- Added a portability suite asserting that the generated skill ids and the digest `SOURCE` markers are `/`-separated and backslash-free, and that every skill id resolves to a real file in the skills collection. No existing case asserted the separator format, so a green suite did not catch the defect. (#22)

## Third Brain Companion v0.6.0

### Framework Updates
- **Decouple HAMI** - TBC now uses native TypeScript/Bun instead of HAMI Framework for orchestration. (The branch `dev-0.5.0` has been abandoned). (#20)

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
