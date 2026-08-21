import { describe, it, expect } from "vitest";

import { listAllObjects, deleteAllObjects, MAX_S3_KEYS } from "../../lib/aws-s3-helpers.js";

/** Build a fake s3 client whose ListObjectsV2 pages through `pages`. */
function fakeS3(pages, deleteCalls = [], listTokens = []) {
  let pageIndex = 0;
  return {
    async send(command) {
      if (command.constructor.name === "ListObjectsV2Command") {
        listTokens.push(command.input.ContinuationToken);
        const page = pages[Math.min(pageIndex, pages.length - 1)];
        pageIndex += 1;
        return page;
      }
      if (command.constructor.name === "DeleteObjectsCommand") {
        deleteCalls.push(command.input.Delete.Objects.length);
        return {};
      }
      throw new Error(`unexpected command: ${command.constructor.name}`);
    },
  };
}

describe("listAllObjects", () => {
  it("lists a single page", async () => {
    const s3 = fakeS3([{ Contents: [{ Key: "a" }, { Key: "b" }], IsTruncated: false }]);
    const keys = await listAllObjects(s3, "bucket", "root/");
    expect(keys).toEqual(["a", "b"]);
  });

  it("follows NextContinuationToken across multiple pages", async () => {
    const listTokens = [];
    const s3 = fakeS3([
      { Contents: [{ Key: "a" }], IsTruncated: true, NextContinuationToken: "tok1" },
      { Contents: [{ Key: "b" }], IsTruncated: false },
    ], [], listTokens);
    const keys = await listAllObjects(s3, "bucket", "root/");
    expect(keys).toEqual(["a", "b"]);
    expect(listTokens).toEqual([undefined, "tok1"]);
  });

  it("handles empty listing", async () => {
    const s3 = fakeS3([{ IsTruncated: false }]);
    expect(await listAllObjects(s3, "bucket", "root/")).toEqual([]);
  });
});

describe("deleteAllObjects", () => {
  it("chunks deletions into batches of at most MAX_S3_KEYS", async () => {
    const pages = [];
    for (let i = 0; i < 3; i += 1) {
      const contents = Array.from({ length: MAX_S3_KEYS }, (_, j) => ({
        Key: `root/f${i}-${j}`,
      }));
      pages.push({
        Contents: contents,
        IsTruncated: i < 2,
        NextContinuationToken: i < 2 ? `tok${i + 1}` : undefined,
      });
    }

    const deleteCalls = [];
    const s3 = fakeS3(pages, deleteCalls);

    const deleted = await deleteAllObjects(s3, "bucket", "root/");
    expect(deleted).toBe(MAX_S3_KEYS * 3);
    // 3000 keys → 3 DeleteObjects calls of 1000 each, not one oversized call.
    expect(deleteCalls).toEqual([MAX_S3_KEYS, MAX_S3_KEYS, MAX_S3_KEYS]);
  });

  it("does nothing when there are no objects", async () => {
    const deleteCalls = [];
    const s3 = fakeS3([{ IsTruncated: false }], deleteCalls);
    expect(await deleteAllObjects(s3, "bucket", "root/")).toBe(0);
    expect(deleteCalls).toEqual([]);
  });
});
