import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"

const { releaseStatus } = createRequire(import.meta.url)("../scripts/release-status.cjs")
const asset = (kind: string, version = "1.6.0") => ({
  name: `Trading-Journal-${kind}-${version}-x64.exe`,
  size: 100,
  state: "uploaded",
})

describe("release publication", () => {
  it("publishes missing or partial releases even when the tag already exists", () => {
    expect(releaseStatus("1.6.0", null, "1.6.0").shouldRelease).toBe(true)
    expect(releaseStatus("1.6.0", { assets: [asset("Setup")] }, "1.6.0").shouldRelease).toBe(true)
    expect(releaseStatus("1.6.0", { assets: [asset("Setup", "1.5.1"), asset("Portable", "1.5.1")] }, "1.6.0").shouldRelease).toBe(true)
  })

  it("skips only a complete published release", () => {
    const release = { assets: [asset("Setup"), asset("Portable")] }
    expect(releaseStatus("1.6.0", release, "1.6.0").shouldRelease).toBe(false)
    expect(releaseStatus("1.6.0", { ...release, draft: true }, "1.6.0").shouldRelease).toBe(true)
    expect(releaseStatus("1.6.0", { assets: [asset("Setup"), { ...asset("Portable"), size: 0 }] }, "1.6.0").shouldRelease).toBe(true)
  })

  it("rejects a renamed old tag instead of silently skipping or overwriting history", () => {
    expect(() => releaseStatus("1.6.0", null, "1.5.1")).toThrow("Bump package.json")
  })
})
