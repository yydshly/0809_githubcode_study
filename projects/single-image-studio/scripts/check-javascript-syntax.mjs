import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["server", "scripts", "tests", "web"];
const extensions = new Set([".js", ".mjs", ".cjs"]);

async function collect(relativeDirectory) {
  const absoluteDirectory = path.join(projectRoot, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing to follow a symlink while checking syntax: ${relativePath}`);
    }
    if (entry.isDirectory()) files.push(...await collect(relativePath));
    else if (entry.isFile() && extensions.has(path.extname(entry.name))) files.push(relativePath);
  }

  return files;
}

const files = (await Promise.all(sourceRoots.map(collect))).flat();
if (files.length === 0) throw new Error("No JavaScript files were found for syntax checking.");

for (const file of files) {
  const check = spawnSync(process.execPath, ["--check", file], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (check.error) throw check.error;
  if (check.status !== 0) {
    process.stderr.write(check.stdout || "");
    process.stderr.write(check.stderr || "");
    process.exit(check.status ?? 1);
  }
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
