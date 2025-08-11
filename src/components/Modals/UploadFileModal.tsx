import { useState, useCallback, useEffect } from "react";
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
  parentFolderId: string | null;
  parentFolderCurrentPath: string[];
}

interface PendingFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "completed" | "error";
  progress: number;
  serverUploadId?: string;
}

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
const VIDEO_TYPES = ["video/mp4"];
const ACCEPTED_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES, ...VIDEO_TYPES];
const ACCEPT_MAP: Record<string, string[]> = ACCEPTED_TYPES.reduce(
  (acc, type) => {
    acc[type] = [];
    return acc;
  },
  {} as Record<string, string[]>
);

const MAX_IMAGE_DOC_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

function validateFileSize(file: File) {
  const type = file.type;
  const isVideo = VIDEO_TYPES.includes(type);
  const isImage = IMAGE_TYPES.includes(type);
  const isDoc = DOCUMENT_TYPES.includes(type);
  if (isVideo) {
    if (file.size > MAX_VIDEO_BYTES) {
      return {
        code: "file-too-large",
        message: `Video exceeds 100MB limit (${formatFileSize(file.size)})`,
      } as any;
    }
    return null;
  }
  if (isImage || isDoc) {
    if (file.size > MAX_IMAGE_DOC_BYTES) {
      return {
        code: "file-too-large",
        message: `File exceeds 10MB limit (${formatFileSize(file.size)})`,
      } as any;
    }
    return null;
  }
  return null;
}

export function UploadFileModal({
  isOpen,
  onClose,
  parentFolderId,
  parentFolderCurrentPath,
}: UploadFileModalProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { addUpload, dispatch, state, revalidateQuietly } = useFileManager();

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
      maxSize: MAX_VIDEO_BYTES,
      accept: ACCEPT_MAP,
      validator: validateFileSize,
    });

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadFile = async (pendingFile: PendingFile): Promise<boolean> => {
    const { file, id } = pendingFile;

    // Safety check: enforce size limits before hitting backend
    const isVideo = VIDEO_TYPES.includes(file.type);
    const isImage = IMAGE_TYPES.includes(file.type);
    const isDoc = DOCUMENT_TYPES.includes(file.type);
    const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_DOC_BYTES;
    if ((isVideo || isImage || isDoc) && file.size > limit) {
      setPendingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "error" } : f))
      );
      toast({
        title: "File too large",
        description: isVideo
          ? `Videos must be <= 100MB. "${file.name}" is ${formatFileSize(
              file.size
            )}.`
          : `Images/Documents must be <= 10MB. "${
              file.name
            }" is ${formatFileSize(file.size)}.`,
        variant: "destructive",
      });
      return false;
    }

    setPendingFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "uploading" } : f))
    );

    try {
      const initRes = await fileApi.initUpload({
        fileName: file.name,
        fileSize: file.size,
        folderId: parentFolderId || undefined,
      });
      const uploadId = (initRes.data?.uploadId || initRes.data?.id) as string;
      if (!uploadId) {
        throw new Error("Failed to initialize upload");
      }

      setPendingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, serverUploadId: uploadId } : f))
      );

      addUpload({
        id: uploadId,
        fileName: file.name,
        progress: 0,
        status: "uploading",
      });

      const response = await fileApi.uploadFile(
        file,
        parentFolderCurrentPath,
        parentFolderId || undefined,
        uploadId,
        { fileName: file.name, fileSize: file.size }
      );

      setPendingFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: "completed", progress: 100 } : f
        )
      );

      if ((response as any)?.data?.status === true) {
        toast({
          title: "Upload successful",
          description: `"${file.name}" has been uploaded successfully.`,
        });
      }

      const createdFile = (response as any).data?.file;
      const newFile = createdFile || {
        id: (typeof crypto !== "undefined" && (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : `${Date.now()}`) as string,
        name: file.name,
        originalName: (file as any).name,
        mimeType: file.type,
        type: "file" as const,
        folderId: parentFolderId ?? null,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };
      dispatch({
        type: "OPTIMISTIC_ADD_CHILD",
        payload: {
          parentId: parentFolderId,
          child: { ...newFile, type: "file" } as any,
        },
      });
      dispatch({
        type: "OPTIMISTIC_ADD_TREE_CHILD",
        payload: {
          parentId: parentFolderId,
          child: { ...newFile, type: "file" } as any,
        },
      });
      if (parentFolderId) {
        dispatch({
          type: "ADJUST_FOLDER_COUNTS",
          payload: { folderId: parentFolderId, deltaFiles: 1 },
        });
      }
      revalidateQuietly(parentFolderId ?? null);
      return (response as any)?.data?.status === true;
    } catch (error: any) {
      console.error("Error uploading file:", error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        `Failed to upload ${file.name}`;
      setPendingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "error" } : f))
      );
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const filesToUpload = pendingFiles.filter((f) => f.status === "pending");

    try {
      const results = await Promise.all(filesToUpload.map(uploadFile));
      if (results.length > 0 && results.every(Boolean)) {
        toast({
          title: "All uploads completed",
          description: `Successfully uploaded ${filesToUpload.length} file(s)`,
        });
      }

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

  useEffect(() => {
    setPendingFiles((prev) =>
      prev.map((f) => {
        if (!f.serverUploadId) return f;
        const u = state.uploads.find((x) => x.id === f.serverUploadId);
        if (!u) return f;
        return {
          ...f,
          progress: Math.round(u.progress ?? 0),
          status: u.status,
        } as PendingFile;
      })
    );
  }, [state.uploads]);

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
              Max size: 10MB for images/docs, 100MB for MP4 videos
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
