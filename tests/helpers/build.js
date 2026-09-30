import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./site.js";

// Resolve Eleventy's CLI from its own package.json "bin", so the test runs the
// installed version under the same real Node (process.execPath) as the tests.
const eleventyDir = join(ROOT, "node_modules/@11ty/eleventy");
const eleventyPkg = JSON.parse(readFileSync(join(eleventyDir, "package.json"), "utf8"));
const eleventyBin = join(eleventyDir, typeof eleventyPkg.bin === "string" ? eleventyPkg.bin : eleventyPkg.bin.eleventy);

export function buildSite({ outDir, env = {} }) {
  const result = spawnSync(process.execPath, [eleventyBin, `--output=${outDir}`, "--quiet"], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Eleventy build to ${outDir} failed with exit ${result.status}:\n${result.stderr}${result.stdout}`);
  }
  return result;
}
