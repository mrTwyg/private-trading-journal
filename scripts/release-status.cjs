/* eslint-disable @typescript-eslint/no-require-imports */
const { execFileSync } = require("node:child_process")
const fs = require("node:fs")

function releaseStatus({ version, release, taggedVersion }) {
  const assets = ["Setup", "Portable"].map((kind) => `Trading-Journal-${kind}-${version}-x64.exe`)
  if (taggedVersion && taggedVersion !== version) {
    throw new Error(
      `v${version} points to version ${taggedVersion}. Bump package.json to an unused version; do not overwrite the existing tag.`,
    )
  }
  return {
    assets,
    shouldRelease:
      !release ||
      release.draft ||
      assets.some(
        (name) =>
          !release.assets.some(
            (asset) => asset.name === name && asset.size > 0 && asset.state === "uploaded",
          ),
      ),
  }
}

if (require.main === module) {
  const { version } = require("../package.json")
  const tag = `v${version}`
  let release = null
  try {
    release = JSON.parse(
      execFileSync("gh", ["api", `repos/${process.env.GITHUB_REPOSITORY}/releases/tags/${tag}`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    )
  } catch (error) {
    if (!String(error.stderr).includes("HTTP 404")) throw error
  }
  const tagExists = execFileSync("git", ["tag", "--list", tag], { encoding: "utf8" }).trim()
  const taggedVersion = tagExists
    ? JSON.parse(execFileSync("git", ["show", `${tag}:package.json`], { encoding: "utf8" })).version
    : null
  const { shouldRelease } = releaseStatus({ version, release, taggedVersion })
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `version=${version}\ntag=${tag}\nshould_release=${shouldRelease}\nrelease_exists=${Boolean(release)}\nsource_ref=${tagExists || process.env.GITHUB_SHA}\n`,
  )
  console.log(
    shouldRelease
      ? `Build and publish ${tag}: required downloads are missing.`
      : `${tag} already has both versioned downloads.`,
  )
}

module.exports = { releaseStatus }
