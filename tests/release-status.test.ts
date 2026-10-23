import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"

const { releaseStatus } = createRequire(import.meta.url)("../scripts/release-status.cjs")
const asset = ({ kind, version = "1.6.0" }: { kind: string; version?: string }) => ({
  name: `Trading-Journal-${kind}-${version}-x64.exe`,
  size: 100,
  state: "uploaded",
})

describe("release publication", () => {
  it("publishes missing or partial releases even when the tag already exists", () => {
    expect(
      releaseStatus({ version: "1.6.0", release: null, taggedVersion: "1.6.0" }).shouldRelease,
    ).toBe(true)
    expect(
      releaseStatus({
        version: "1.6.0",
        release: { assets: [asset({ kind: "Setup" })] },
        taggedVersion: "1.6.0",
      }).shouldRelease,
    ).toBe(true)
    expect(
      releaseStatus({
        version: "1.6.0",
        release: {
          assets: [
            asset({ kind: "Setup", version: "1.5.1" }),
            asset({ kind: "Portable", version: "1.5.1" }),
          ],
        },
        taggedVersion: "1.6.0",
      }).shouldRelease,
    ).toBe(true)
  })

  it("skips only a complete published release", () => {
    const release = { assets: [asset({ kind: "Setup" }), asset({ kind: "Portable" })] }
    expect(releaseStatus({ version: "1.6.0", release, taggedVersion: "1.6.0" }).shouldRelease).toBe(
      false,
    )
    expect(
      releaseStatus({
        version: "1.6.0",
        release: { ...release, draft: true },
        taggedVersion: "1.6.0",
      }).shouldRelease,
    ).toBe(true)
    expect(
      releaseStatus({
        version: "1.6.0",
        release: {
          assets: [asset({ kind: "Setup" }), { ...asset({ kind: "Portable" }), size: 0 }],
        },
        taggedVersion: "1.6.0",
      }).shouldRelease,
    ).toBe(true)
  })

  it("rejects a renamed old tag instead of silently skipping or overwriting history", () => {
    expect(() =>
      releaseStatus({ version: "1.6.0", release: null, taggedVersion: "1.5.1" }),
    ).toThrow("Bump package.json")
  })
})
