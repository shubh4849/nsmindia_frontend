import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, File, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFileManager } from "@/context/FileManagerContext";
import { formatFileSize } from "@/utils/fileUtils";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { toast } from "@/hooks/use-toast";
import { fileApi } from "@/services/api";

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentFolderId: string | null; // New prop
  parentFolderCurrentPath: string[]; // New prop
}

interface PendingFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "completed" | "error";
  progress: number;
}

// Allowed MIME types
const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/tiff",
];
const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];
const ACCEPTED_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES];
const ACCEPT_MAP: Record<string, string[]> = ACCEPTED_TYPES.reduce(
  (acc, type) => {
    acc[type] = [];
    return acc;
  },
  {} as Record<string, string[]>
);

export function UploadFileModal({
  isOpen,
  onClose,
  parentFolderId,
  parentFolderCurrentPath,
}: UploadFileModalProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const {
    addUpload,
    updateUpload,
    dispatch,
    state,
    fetchFiles,
    fetchFolderTree,
  } = useFileManager();
  const { currentPath } = state;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const whitelist = new Set(ACCEPTED_TYPES);
    const filtered = acceptedFiles.filter((f) => whitelist.has(f.type));
    const rejected = acceptedFiles.filter((f) => !whitelist.has(f.type));

    if (rejected.length > 0) {
      toast({
        title: "Some files were rejected",
        description: `Unsupported file types: ${rejected
          .map((r) => r.name)
          .join(", ")}`,
        variant: "destructive",
      });
    }

    const newFiles = filtered.map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}`,
      status: "pending" as const,
      progress: 0,
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const onDropRejected = useCallback((fileRejections: any[]) => {
    if (!fileRejections || fileRejections.length === 0) return;
    const names = fileRejections.map((r) => r.file?.name).filter(Boolean);
    toast({
      title: "Some files were rejected",
      description: names.length
        ? `Unsupported file types: ${names.join(", ")}`
        : "Unsupported file types selected.",
      variant: "destructive",
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      onDropRejected,
      multiple: true,
      maxSize: 100 * 1024 * 1024, // 100MB max file size
      accept: ACCEPT_MAP,
    });

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFile = async (pendingFile: PendingFile) => {
    const { file, id } = pendingFile;

    setPendingFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "uploading" } : f))
    );

    // Before calling API, prepare to add upload to context for tracking
    // Note: The `id` passed to `addUpload` should ideally be the `uploadId` returned from the backend.
    // For now, we use the client-generated ID and will update it once the backend response is received.
    addUpload({
      id,
      fileName: file.name,
      progress: 0,
      status: "uploading",
    });

    try {
      const response = await fileApi.uploadFile(
        file,
        parentFolderCurrentPath, // Use parentFolderCurrentPath
        parentFolderId || undefined, // Pass parentFolderId
        ((progressEvent: any) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === id ? { ...f, progress: percentCompleted } : f
            )
          );
          updateUpload(id, percentCompleted, "uploading");
        }) as any // Explicitly cast to any to satisfy linter for now
      );

      // Update the pending file with completion on the same local id
      const { uploadId } = response.data; // available if needed later
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: "completed", progress: 100 } : f
        )
      );
      updateUpload(id, 100, "completed");

      toast({
        title: "Upload successful",
        description: `"${file.name}" has been uploaded successfully.`,
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        `Failed to upload ${file.name}`;
      setPendingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "error" } : f))
      );
      updateUpload(id, 0, "error");
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const filesToUpload = pendingFiles.filter((f) => f.status === "pending");

    try {
      await Promise.all(filesToUpload.map(uploadFile));

      toast({
        title: "All uploads completed",
        description: `Successfully uploaded ${filesToUpload.length} file(s)`,
      });
      fetchFiles(); // Re-fetch files after upload
      fetchFolderTree(); // Re-fetch folder tree after upload
      setPendingFiles([]);
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setPendingFiles([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center text-foreground">
            <Upload size={20} className="mr-2 text-primary" />
            Upload Files
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary-light"
                : "border-border hover:border-primary hover:bg-primary-light"
            }`}
          >
            <input {...getInputProps()} />
            <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">
              {isDragActive
                ? "Drop files here..."
                : "Drag & drop files here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum file size: 100MB
              {isDragReject && (
                <span className="ml-2 text-destructive">
                  (Unsupported type)
                </span>
              )}
            </p>
          </div>

          {/* File list */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              <h4 className="text-sm font-medium text-foreground">
                Files to upload ({pendingFiles.length})
              </h4>

              <AnimatePresence mode="popLayout">
                {pendingFiles.map((pendingFile) => (
                  <motion.div
                    key={pendingFile.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center space-x-3 p-3 bg-surface border border-border rounded-lg"
                  >
                    <File
                      size={16}
                      className="text-muted-foreground flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {pendingFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(pendingFile.file.size)}
                      </p>

                      {pendingFile.status === "uploading" && (
                        <ProgressBar
                          progress={pendingFile.progress}
                          className="mt-2"
                          showPercentage={false}
                        />
                      )}

                      {pendingFile.status === "error" && (
                        <div className="flex items-center mt-1">
                          <AlertCircle
                            size={12}
                            className="text-destructive mr-1"
                          />
                          <span className="text-xs text-destructive">
                            Upload failed
                          </span>
                        </div>
                      )}
                    </div>

                    {pendingFile.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(pendingFile.id)}
                        className="h-6 w-6 p-0 hover:bg-surface-hover"
                        disabled={isUploading}
                      >
                        <X size={14} className="text-muted-foreground" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className="bg-surface hover:bg-surface-hover border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={pendingFiles.length === 0 || isUploading}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isUploading
                ? "Uploading..."
                : `Upload ${pendingFiles.length} File(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
