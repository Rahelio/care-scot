import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { getFileStorage } from "../shared/file-storage";
import { StorageProvider } from "@prisma/client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const FORBIDDEN_EXTENSIONS = new Set([
  ".exe", ".bat", ".sh", ".cmd", ".msi", ".ps1",
  ".jar", ".app", ".deb", ".rpm", ".vbs", ".scr",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

function validateFile(fileName: string, mimeType: string, sizeBytes: number) {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `File type '${ext}' is not allowed.`,
    });
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `MIME type '${mimeType}' is not allowed.`,
    });
  }
  if (sizeBytes > MAX_FILE_SIZE) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `File exceeds the 10 MB size limit.`,
    });
  }
}

export const filesRouter = router({
  /**
   * Upload a file. The file data must be base64-encoded.
   * Returns the created File record.
   */
  upload: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.string().min(1),
        dataBase64: z.string().min(1),
        entityType: z.string().optional(),
        entityId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organisationId, id: userId } = ctx.user as {
        organisationId: string;
        id: string;
      };

      const buffer = Buffer.from(input.dataBase64, "base64");
      validateFile(input.fileName, input.mimeType, buffer.byteLength);

      const storage = getFileStorage();
      const storagePath = await storage.upload(
        buffer,
        input.fileName,
        input.mimeType,
        organisationId,
        input.entityType,
      );

      const provider =
        (process.env.FILE_STORAGE_PROVIDER ?? "LOCAL") === "S3"
          ? StorageProvider.S3
          : StorageProvider.LOCAL;

      const file = await ctx.prisma.file.create({
        data: {
          organisationId,
          fileName: input.fileName,
          fileType: input.mimeType,
          fileSizeBytes: BigInt(buffer.byteLength),
          storagePath,
          storageProvider: provider,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          uploadedBy: userId,
        },
      });

      return {
        ...file,
        fileSizeBytes: Number(file.fileSizeBytes),
        url: storage.getUrl(storagePath),
      };
    }),

  /**
   * Download a file by ID. Returns base64-encoded content and metadata.
   */
  download: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };

      const file = await ctx.prisma.file.findFirst({
        where: { id: input.id, organisationId, isDeleted: false },
      });
      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });
      }

      const storage = getFileStorage();
      const buffer = await storage.download(file.storagePath);

      return {
        id: file.id,
        fileName: file.fileName,
        mimeType: file.fileType,
        fileSizeBytes: Number(file.fileSizeBytes),
        dataBase64: buffer.toString("base64"),
      };
    }),

  /**
   * Soft-delete a file (sets isDeleted = true, keeps the physical file).
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };

      const file = await ctx.prisma.file.findFirst({
        where: { id: input.id, organisationId, isDeleted: false },
      });
      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });
      }

      await ctx.prisma.file.update({
        where: { id: input.id },
        data: { isDeleted: true },
      });

      return { success: true };
    }),

  /**
   * List non-deleted files for a given entity.
   */
  getByEntity: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organisationId } = ctx.user as { organisationId: string };

      const files = await ctx.prisma.file.findMany({
        where: {
          organisationId,
          entityType: input.entityType,
          entityId: input.entityId,
          isDeleted: false,
        },
        orderBy: { uploadedAt: "desc" },
        include: {
          uploadedByUser: { select: { id: true, email: true, name: true } },
        },
      });

      const storage = getFileStorage();

      return files.map((f) => ({
        ...f,
        fileSizeBytes: Number(f.fileSizeBytes),
        url: storage.getUrl(f.storagePath),
      }));
    }),
});
