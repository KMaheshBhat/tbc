# TBC Interface Types Cleanup Plan

## Summary

Analyze and remove unused types from `packages/tbc-interface/src/types.ts`.

## Current Types in [`types.ts`](packages/tbc-interface/src/types.ts)

| Type | Status | Reason |
|------|--------|--------|
| `SharedStage` | **Used** | Local type alias used in `Shared` type definition |
| `Shared` | **Used** | Imported by 4 operation files in tbc-interface package |
| `TBCInterfaceOpts` | **UNUSED** | Only defined, never imported anywhere |
| `TBCInterfaceStorage` | **UNUSED** | Only defined, never imported anywhere |

## Usage Trace from [`apps/tbc-cli/src/index.ts`](apps/tbc-cli/src/index.ts)

The CLI entry point uses `tbc-interface` through:

1. [`bootstrap.ts`](apps/tbc-cli/src/bootstrap.ts) imports `TBCInterfacePlugin`
2. Plugin registers operations that use `Shared` type:
   - [`int-probe-flow.ts`](packages/tbc-interface/src/ops/int-probe-flow.ts:6)
   - [`agent-integrate-flow.ts`](packages/tbc-interface/src/ops/agent-integrate-flow.ts:6)
   - [`load-generic-asset.ts`](packages/tbc-interface/src/ops/load-generic-asset.ts:2)
   - [`synthesize-generic-records.ts`](packages/tbc-interface/src/ops/synthesize-generic-records.ts:4)

## Types to Remove

### `TBCInterfaceOpts`

```typescript
type TBCInterfaceOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}
```

- Only appears in [`types.ts`](packages/tbc-interface/src/types.ts:21-24)
- Never imported by any other file
- Redundant - verbose flag is handled directly in `Shared` and operation configs

### `TBCInterfaceStorage`

```typescript
type TBCInterfaceStorage = {
  opts?: TBCInterfaceOpts;
  rootDirectory?: string;
  companionId?: string;
  companionName?: string;
  roleDefinition?: string;
  records?: Record<string, any>[];
}
```

- Only appears in [`types.ts`](packages/tbc-interface/src/types.ts:31-44)
- Never imported by any other file
- Storage is handled via `Shared.stage` pattern instead

## Action Items

1. Remove `TBCInterfaceOpts` type definition
2. Remove `TBCInterfaceStorage` type definition  
3. Remove both from the export statement
4. Run `bun all:build-dist` to verify build succeeds

## Files to Modify

- [`packages/tbc-interface/src/types.ts`](packages/tbc-interface/src/types.ts) - Remove unused types

## Verification

After changes, run:
```bash
bun all:build-dist
```

This will:
- Clean dist folders
- Build all packages in dependency order
- Compile the CLI binary
- Run integration tests