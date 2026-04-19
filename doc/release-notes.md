## Release Notes

### Third Brain Companion v0.4.2

- fix(templates): rename system paths from tbc/dex to sys convention in interface specs
- feat(pi): add Pi agent interface integration plugin
- test(cli): add Pi integration test and renumber tests to 4-digit scheme
- fix(dex): ensure deterministic JSONL output by sorting records by id
- feat(skills): clarify --type filter behavior in tbc-mem-ops skill documentation
- fix(system,skills): process records without frontmatter as-is instead of skipping them (resolves issue with dex/skill.jsonl)
- fix(mem): ensure deterministic dex index ordering by invoking dex-rebuild after assimilate
- fix(tbc-record-fs): prevent duplicate YAML frontmatter in skill records
