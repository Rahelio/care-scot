import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

export interface UploadResult {
  fileId: string;
  storagePath: string;
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  organisationId: string,
  entityType: string,
  entityId: string,
  uploadedBy: string
): Promise<UploadResult> {
  const ext = path.extname(originalName);
  const filename = `${randomUUID()}${ext}`;
  const orgDir = path.join(UPLOAD_DIR, organisationId);

  await fs.mkdir(orgDir, { recursive: true });
  const storagePath = path.join(orgDir, filename);
  await fs.writeFile(storagePath, buffer);

  const file = await prisma.file.create({
    data: {
      organisationId,
      fileName: originalName,
      fileType: mimeType,
      fileSizeBytes: BigInt(buffer.length),
      storagePath,
      storageProvider: "LOCAL",
      entityType,
      entityId,
      uploadedBy,
    },
  });

  return { fileId: file.id, storagePath };
}

export async function deleteFile(fileId: string): Promise<void> {
  const file = await prisma.file.findUniqueOrThrow({ where: { id: fileId } });

  if (file.storageProvider === "LOCAL") {
    await fs.unlink(file.storagePath).catch(() => void 0);
  }

  await prisma.file.update({
    where: { id: fileId },
    data: { isDeleted: true },
  });
}
