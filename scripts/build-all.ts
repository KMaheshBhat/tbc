// scripts/build.ts

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
  console.log("🛠️  Starting Monorepo Build Sequence...\n");

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

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`✨ All builds finished successfully in ${duration}s!`);
}

runBuilds();