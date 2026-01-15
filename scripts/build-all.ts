import { rmSync } from "node:fs";

/**
 * The order of this array defines the build sequence.
 * Add new packages here to include them in the 'all:build' process.
 */
const BUILD_ORDER = [
  [
    "@tbc-frameworx/tbc-record",
    "@tbc-frameworx/tbc-generator",
  ],
  [
    "@tbc-frameworx/tbc-record-fs",
    "@tbc-frameworx/tbc-record-sqlite",
    "@tbc-frameworx/tbc-generator-uuid",
    "@tbc-frameworx/tbc-generator-tsid",
  ],
  [
    "@tbc-frameworx/tbc-system"
  ],
  [
    "@tbc-frameworx/tbc-memory",
    "@tbc-frameworx/tbc-activity",
    "@tbc-frameworx/tbc-view",
    "@tbc-frameworx/tbc-interface"
  ],
  [
    "@tbc-frameworx/tbc-gemini",
    "@tbc-frameworx/tbc-kilocode",
    "@tbc-frameworx/tbc-goose",
    "@tbc-frameworx/tbc-github-copilot"
  ],
  [
    "@tbc-frameworx/tbc-cli"
  ],
];

async function runBuilds() {
  const startTime = performance.now();
  const args = Bun.argv;
  const shouldClean = args.includes("--clean");
  const shouldPackage = args.includes("--dist");

  if (shouldClean) {
    console.log("🧹 Flag --clean detected. Wiping dist folders...");

    // Use a recursive pattern to find all 'dist' and 'tsconfig.tsbuildinfo'
    // We look specifically for the names, not just top-level
    const glob = new Bun.Glob("**/{dist,tsconfig.tsbuildinfo}");

    // scanSync configuration:
    // 1. absolute: true makes rmSync much happier
    // 2. onlyFiles: false ensures we catch the 'dist' directory itself
    for (const file of glob.scanSync({ cwd: ".", absolute: true, onlyFiles: false })) {
      // Safety check: only delete if it's inside apps or packages
      if (file.includes("/apps/") || file.includes("/packages/")) {
        console.log(`🧹 Deleting: ${file}`);
        rmSync(file, { recursive: true, force: true });
      }
    }
  }

  console.log("\n🛠️ Starting Monorepo Build Sequence...\n");

  for (const group of BUILD_ORDER) {
    console.log(`📦 Building group: ${group.join(', ')}`);

    // Construct args with multiple --filter for parallel builds
    const args = ["bun", "run"];
    for (const pkg of group) {
      args.push("--filter", pkg);
    }
    args.push("build");

    // Using Bun.spawn to execute the filter build command
    const proc = Bun.spawn(args, {
      stdout: "inherit",
      stderr: "inherit",
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      console.error(`\n❌ Build failed for group: ${group.join(', ')}. Aborting.`);
      process.exit(exitCode);
    }
    console.log(`✅ Group completed: ${group.join(', ')}\n`);
  }

  if (shouldPackage) {
    console.log("🚀 All packages built. Starting binary compilation...");

    const exePath = "apps/tbc-cli/dist/tbc";
    const compileProc = Bun.spawn([
      "bun", "build",
      "apps/tbc-cli/src/index.ts",
      "--compile",
      "--outfile", exePath
    ], {
      stdout: "inherit",
      stderr: "inherit",
    });

    const compileExit = await compileProc.exited;

    if (compileExit !== 0) {
      console.error("\n❌ Binary compilation failed. Aborting.");
      process.exit(compileExit);
    }

    console.log("🧪 Running Integration Test on Distributable Binary...");
    const testProc = Bun.spawn([
      "bun", "test", "apps/tbc-cli/tests/integration.test.ts"
    ], {
      env: {
        ...process.env,
        TBC_TEST_BINARY: exePath // Point tests to the NEW binary
      },
      stdout: "inherit",
      stderr: "inherit",
    });

    const testExit = await testProc.exited;
    if (testExit !== 0) {
      console.error("\n❌ Distributable failed integration tests. Aborting.");
      process.exit(testExit);
    }
    console.log(`💎 Standalone binary ready at: ${exePath}`);
    console.log("✅ Distributable passed all integration tests.");
  }

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`✨ All builds finished successfully in ${duration}s!`);
}

runBuilds();