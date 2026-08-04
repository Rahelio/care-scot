import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface FileStorageAdapter {
  upload(
    file: Buffer,
    fileName: string,
    mimeType: string,
    orgId: string,
    entityType?: string,
  ): Promise<string>;
  download(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
  getUrl(storagePath: string): Promise<string>;
}

// Belt-and-suspenders: entityType/orgId become filesystem path segments below,
// so even though callers are expected to pass pre-validated values (see the
// FILE_ENTITY_TYPES allowlist in the files router), the adapter itself
// refuses anything that could traverse outside baseDir.
function assertSafePathSegment(value: string, label: string): void {
  if (!value || value.includes("/") || value.includes("\\") || value.includes("..")) {
    throw new Error(`Invalid ${label}: '${value}'`);
  }
}

// Shared storagePath convention (orgId/entityType/year/month/uuid.ext) so
// LocalFileAdapter and S3FileAdapter produce identical, portable paths.
function buildStoragePath(
  orgId: string,
  entityType: string,
  fileName: string,
): string {
  assertSafePathSegment(orgId, "orgId");
  assertSafePathSegment(entityType, "entityType");
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const ext = path.extname(fileName);
  const safeName = `${randomUUID()}${ext}`;
  return [orgId, entityType, year, month, safeName].join("/");
}

export class LocalFileAdapter implements FileStorageAdapter {
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), "uploads");
  }

  async upload(
    file: Buffer,
    fileName: string,
    _mimeType: string,
    orgId: string,
    entityType = "general",
  ): Promise<string> {
    const storagePath = buildStoragePath(orgId, entityType, fileName);
    const fullPath = path.join(this.baseDir, ...storagePath.split("/"));
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file);
    return storagePath;
  }

  async download(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, ...storagePath.split("/"));
    return fs.readFile(fullPath);
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, ...storagePath.split("/"));
    await fs.unlink(fullPath).catch(() => void 0);
  }

  async getUrl(): Promise<string> {
    // No direct-download route exists for local storage — every consumer
    // must go through the org-scoped/RBAC-checked `files.download` tRPC
    // procedure instead. Throwing here (rather than returning a URL to a
    // route that doesn't exist) turns a silent 404 into a loud failure if
    // anything ever tries to use this path again.
    throw new Error(
      "LocalFileAdapter has no direct-download URL — use the files.download tRPC procedure.",
    );
  }
}

export class S3FileAdapter implements FileStorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) {
      throw new Error(
        "S3_BUCKET_NAME is required when FILE_STORAGE_PROVIDER=S3",
      );
    }
    this.bucket = bucket;
    // No explicit credentials: relies on the standard AWS credential chain
    // (an App Runner instance role in production, AWS_ACCESS_KEY_ID/
    // AWS_SECRET_ACCESS_KEY env vars locally/CI).
    // S3_ENDPOINT/S3_FORCE_PATH_STYLE are only for pointing at an
    // S3-compatible service (e.g. MinIO) for local development — unset in
    // production, where the SDK talks to real AWS S3.
    this.client = new S3Client({
      region: process.env.AWS_REGION ?? "eu-west-2",
      ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
      ...(process.env.S3_FORCE_PATH_STYLE === "true" && { forcePathStyle: true }),
    });
  }

  async upload(
    file: Buffer,
    fileName: string,
    mimeType: string,
    orgId: string,
    entityType = "general",
  ): Promise<string> {
    const storagePath = buildStoragePath(orgId, entityType, fileName);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
        Body: file,
        ContentType: mimeType,
      }),
    );
    return storagePath;
  }

  async download(storagePath: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storagePath }),
    );
    if (!response.Body) {
      throw new Error(`S3 object has no body: '${storagePath}'`);
    }
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(storagePath: string): Promise<void> {
    await this.client
      .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storagePath }))
      .catch(() => void 0);
  }

  async getUrl(storagePath: string): Promise<string> {
    // A short-lived presigned GET URL. Today's tRPC download flow proxies
    // file bytes through the app rather than using this directly, but any
    // future direct-link consumer gets a real, working URL.
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: storagePath }),
      { expiresIn: 300 },
    );
  }
}

let _adapter: FileStorageAdapter | null = null;

export function getFileStorage(): FileStorageAdapter {
  if (_adapter) return _adapter;
  const provider = process.env.FILE_STORAGE_PROVIDER ?? "LOCAL";
  _adapter = provider === "S3" ? new S3FileAdapter() : new LocalFileAdapter();
  return _adapter;
}
