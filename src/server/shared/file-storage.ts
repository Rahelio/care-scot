import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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
  getUrl(storagePath: string): string;
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
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const ext = path.extname(fileName);
    const safeName = `${randomUUID()}${ext}`;
    const dir = path.join(this.baseDir, orgId, entityType, year, month);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, safeName), file);
    return [orgId, entityType, year, month, safeName].join("/");
  }

  async download(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, ...storagePath.split("/"));
    return fs.readFile(fullPath);
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, ...storagePath.split("/"));
    await fs.unlink(fullPath).catch(() => void 0);
  }

  getUrl(storagePath: string): string {
    return `/api/files/download?path=${encodeURIComponent(storagePath)}`;
  }
}

export class S3FileAdapter implements FileStorageAdapter {
  async upload(): Promise<string> {
    throw new Error("S3FileAdapter: Not implemented");
  }

  async download(): Promise<Buffer> {
    throw new Error("S3FileAdapter: Not implemented");
  }

  async delete(): Promise<void> {
    throw new Error("S3FileAdapter: Not implemented");
  }

  getUrl(): string {
    throw new Error("S3FileAdapter: Not implemented");
  }
}

let _adapter: FileStorageAdapter | null = null;

export function getFileStorage(): FileStorageAdapter {
  if (_adapter) return _adapter;
  const provider = process.env.FILE_STORAGE_PROVIDER ?? "LOCAL";
  _adapter = provider === "S3" ? new S3FileAdapter() : new LocalFileAdapter();
  return _adapter;
}
