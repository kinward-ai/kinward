/**
 * Tests for server/lib/version-check.compareVersions
 *
 * The version comparator drives whether the UI shows "Update available" —
 * a regression here either nags users about nonexistent updates or hides
 * real ones. Both are bad.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { compareVersions } = require("../lib/version-check");

test("equal versions return 0", () => {
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("0.1.0", "0.1.0"), 0);
});

test("major version difference", () => {
  assert.ok(compareVersions("2.0.0", "1.0.0") > 0);
  assert.ok(compareVersions("1.0.0", "2.0.0") < 0);
});

test("minor version difference", () => {
  assert.ok(compareVersions("0.2.0", "0.1.0") > 0);
  assert.ok(compareVersions("0.1.5", "0.2.0") < 0);
});

test("patch version difference", () => {
  assert.ok(compareVersions("1.0.5", "1.0.4") > 0);
  assert.ok(compareVersions("1.0.4", "1.0.5") < 0);
});

test("v-prefix tolerated", () => {
  assert.equal(compareVersions("v1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("1.0.0", "v1.0.0"), 0);
  assert.equal(compareVersions("v1.0.0", "v1.0.0"), 0);
  assert.ok(compareVersions("v2.0.0", "v1.0.0") > 0);
});

test("pre-release suffix is ignored for comparison", () => {
  // Treats pre-release the same as the base version — conservative;
  // we don't want to surprise users by "downgrading" them from 1.0.0
  // to 1.0.0-beta or vice versa.
  assert.equal(compareVersions("1.0.0-beta", "1.0.0"), 0);
  assert.equal(compareVersions("1.0.0", "1.0.0-rc.1"), 0);
});

test("missing parts treated as zero", () => {
  assert.equal(compareVersions("1.0", "1.0.0"), 0);
  assert.equal(compareVersions("1", "1.0.0"), 0);
  assert.ok(compareVersions("1.1", "1.0.0") > 0);
});

test("malformed inputs default to 0", () => {
  // Non-numeric segments parse as 0
  assert.equal(compareVersions("not.a.version", "0.0.0"), 0);
  assert.equal(compareVersions("", ""), 0);
});

test("null/undefined treated as 0", () => {
  // Should not throw; should compare as 0
  assert.equal(compareVersions(null, "0.0.0"), 0);
  assert.equal(compareVersions(undefined, undefined), 0);
});

test("large version numbers compare correctly", () => {
  assert.ok(compareVersions("100.0.0", "99.0.0") > 0);
  assert.ok(compareVersions("0.0.100", "0.0.99") > 0);
});
