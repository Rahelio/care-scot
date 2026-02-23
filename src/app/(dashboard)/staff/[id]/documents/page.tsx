"use client";

import { use, useState, useRef } from "react";
import { toast } from "sonner";
import {
  FileText, Plus, Download, Trash2, File, Image, FileSpreadsheet,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

// ── Types ────────────────────────────────────────────────────────────────────

type FileRecord = {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: Date | string;
  uploadedByUser: { id: string; email: string; name: string | null } | null;
};

// ── Upload Dialog ────────────────────────────────────────────────────────────

function UploadDialog({
  open, onClose, staffMemberId, onSuccess,
}: {
  open: boolean; onClose: () => void; staffMemberId: string; onSuccess: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);

  const uploadMut = trpc.files.upload.useMutation({
    onSuccess: () => {
      toast.success("File uploaded");
      setSelectedFile(null);
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  function handleUpload() {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMut.mutate({
        fileName: selectedFile.name,
        mimeType: selectedFile.type || "application/octet-stream",
        dataBase64: base64,
        entityType: "staff_member",
        entityId: staffMemberId,
      });
    };
    reader.readAsDataURL(selectedFile);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setSelectedFile(null); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Accepted: PDF, images (JPEG/PNG/GIF/WebP), Word, Excel, text/CSV. Max 10 MB.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
          />
          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setSelectedFile(null); onClose(); }}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploadMut.isPending}>
              {uploadMut.isPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete confirmation ──────────────────────────────────────────────────────

function DeleteDialog({
  open, onClose, file, onSuccess,
}: {
  open: boolean; onClose: () => void; file: FileRecord | null; onSuccess: () => void;
}) {
  const deleteMut = trpc.files.delete.useMutation({
    onSuccess: () => { toast.success("File deleted"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Document</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{file.fileName}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => deleteMut.mutate({ id: file.id })}
            disabled={deleteMut.isPending}>
            {deleteMut.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StaffDocumentsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<FileRecord | null>(null);

  const { data: files = [], refetch } = trpc.files.getByEntity.useQuery({
    entityType: "staff_member",
    entityId: id,
  });

  async function handleDownload(file: FileRecord) {
    try {
      const res = await fetch(`/api/trpc/files.download?input=${encodeURIComponent(JSON.stringify({ id: file.id }))}`);
      const json = await res.json();
      const data = json?.result?.data;
      if (!data?.dataBase64) {
        toast.error("Download failed");
        return;
      }
      const byteCharacters = atob(data.dataBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Documents</h2>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Upload
        </Button>
      </div>

      {files.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No documents</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Upload contracts, certificates, fit notes, correspondence and other staff file documents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {(files as FileRecord[]).map((file) => (
                <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                  {getFileIcon(file.fileType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSizeBytes)}
                      {" · "}
                      {formatDate(file.uploadedAt)}
                      {file.uploadedByUser && (
                        <> · {file.uploadedByUser.name ?? file.uploadedByUser.email}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => handleDownload(file)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                      onClick={() => setDeleting(file)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        staffMemberId={id}
        onSuccess={refetch}
      />

      <DeleteDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        file={deleting}
        onSuccess={refetch}
      />
    </div>
  );
}
