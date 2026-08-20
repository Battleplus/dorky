const MAX_S3_KEYS = 1000;

/**
 * List every object key under `prefix`, following ListObjectsV2 pagination.
 *
 * ListObjectsV2 returns at most 1000 keys per call; without looping on
 * NextContinuationToken, listing silently truncates past that (#53).
 */
async function listAllObjects(s3, bucket, prefix) {
  const { ListObjectsV2Command } = require("@aws-sdk/client-s3");
  const keys = [];
  let ContinuationToken;
  do {
    const data = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken }));
    (data.Contents || []).forEach((o) => keys.push(o.Key));
    ContinuationToken = data.IsTruncated ? data.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

/**
 * Delete every object under `prefix`. DeleteObjectsCommand accepts at most
 * 1000 keys per request, so the keys are chunked before deleting (#53).
 *
 * Returns the number of keys deleted.
 */
async function deleteAllObjects(s3, bucket, prefix) {
  const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");
  const keys = await listAllObjects(s3, bucket, prefix);
  for (let i = 0; i < keys.length; i += MAX_S3_KEYS) {
    const chunk = keys.slice(i, i + MAX_S3_KEYS);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((key) => ({ Key: key })) },
      }),
    );
  }
  return keys.length;
}

module.exports = { listAllObjects, deleteAllObjects, MAX_S3_KEYS };