#!/usr/bin/env node
/**
 * Prepare a SelahKeep release: roll CHANGELOG [Unreleased] → [X.Y.Z], bump package.json.
 *
 * Usage:
 *   node scripts/prepare-release.mjs [--version=auto|patch|minor|major|x.y.z] [--dry-run]
 *
 * stdout: JSON { changed, version, recovery, releaseNotes, error? }
 *
 * Recovery: when [Unreleased] has no substantive content, reuses current package.json
 * version without bumping (for completing tag/GitHub Release after a partial failure).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGELOG_PATH = join(ROOT, "CHANGELOG.md");
const PACKAGE_PATH = join(ROOT, "package.json");

function parseArgs() {
  let versionInput = "auto";
  let dryRun = false;
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--version=")) {
      versionInput = arg.slice("--version=".length).trim() || "auto";
    }
  }
  return { versionInput, dryRun };
}

function readPackageVersion() {
  return JSON.parse(readFileSync(PACKAGE_PATH, "utf8")).version;
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Invalid semver in package.json: ${version}`);
  return { major: +match[1], minor: +match[2], patch: +match[3] };
}

function bumpSemver(current, kind) {
  const { major, minor, patch } = parseSemver(current);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  if (kind === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown bump kind: ${kind}`);
}

function extractUnreleased(changelog) {
  const header = "## [Unreleased]";
  const start = changelog.indexOf(header);
  if (start === -1) {
    throw new Error("CHANGELOG.md must contain ## [Unreleased]");
  }
  const bodyStart = start + header.length;
  const rest = changelog.slice(bodyStart);
  const nextSection = rest.search(/^## \[(?!Unreleased)/m);
  const body = (nextSection === -1 ? rest : rest.slice(0, nextSection)).trim();
  return { body, bodyStart, nextSectionOffset: nextSection };
}

function unreleasedHasContent(body) {
  if (!body) return false;
  return /^###\s+\S/m.test(body) && /^-\s+/m.test(body);
}

function extractVersionSection(changelog, version) {
  const pattern = new RegExp(
    `^## \\[${version.replace(/\./g, "\\.")}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|$)`,
    "m"
  );
  const match = changelog.match(pattern);
  return match ? match[1].trim() : "";
}

function resolveVersion(current, versionInput, hasUnreleased) {
  const normalized =
    versionInput === "" || versionInput === "blank" ? "auto" : versionInput;

  if (!hasUnreleased) {
    if (normalized !== "auto") {
      throw new Error(
        "[Unreleased] has no release notes. Add changelog entries before patch/minor/major, " +
          "or re-dispatch release with blank/auto for recovery only."
      );
    }
    return { version: current, recovery: true };
  }

  if (normalized === "auto") {
    return { version: bumpSemver(current, "patch"), recovery: false };
  }
  if (/^\d+\.\d+\.\d+$/.test(normalized)) {
    return { version: normalized, recovery: false };
  }
  if (["patch", "minor", "major"].includes(normalized)) {
    return { version: bumpSemver(current, normalized), recovery: false };
  }
  throw new Error(
    `Invalid --version=${versionInput}. Use auto, patch, minor, major, or x.y.z`
  );
}

function rollChangelog(changelog, version, unreleasedBody) {
  const date = new Date().toISOString().slice(0, 10);
  const releasedBlock = `## [${version}] - ${date}\n\n${unreleasedBody.trim()}\n\n`;
  const pattern = /^## \[Unreleased\]\s*\n[\s\S]*?(?=^## \[(?!Unreleased))/m;
  if (pattern.test(changelog)) {
    return changelog.replace(pattern, `## [Unreleased]\n\n${releasedBlock}`);
  }
  return changelog.replace(
    /^## \[Unreleased\]\s*\n[\s\S]*$/m,
    `## [Unreleased]\n\n${releasedBlock}`.trimEnd() + "\n"
  );
}

function writeOutputs(version, changelog, packageJson, dryRun) {
  if (dryRun) return;
  writeFileSync(CHANGELOG_PATH, changelog, "utf8");
  packageJson.version = version;
  writeFileSync(PACKAGE_PATH, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

function emit(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.error) process.exit(1);
}

function main() {
  const { versionInput, dryRun } = parseArgs();
  try {
    const current = readPackageVersion();
    const changelog = readFileSync(CHANGELOG_PATH, "utf8");
    const { body: unreleasedBody } = extractUnreleased(changelog);
    const hasContent = unreleasedHasContent(unreleasedBody);
    const { version, recovery } = resolveVersion(current, versionInput, hasContent);

    if (recovery) {
      const releaseNotes = extractVersionSection(changelog, version);
      emit({
        changed: false,
        version,
        recovery: true,
        releaseNotes,
      });
      return;
    }

    const newChangelog = rollChangelog(changelog, version, unreleasedBody);
    const releaseNotes = unreleasedBody.trim();
    const packageJson = JSON.parse(readFileSync(PACKAGE_PATH, "utf8"));

    writeOutputs(version, newChangelog, packageJson, dryRun);

    emit({
      changed: true,
      version,
      recovery: false,
      releaseNotes,
    });
  } catch (error) {
    emit({
      changed: false,
      version: null,
      recovery: false,
      releaseNotes: "",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

main();
