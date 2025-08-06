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
import { generateId, formatFileSize } from "@/utils/fileUtils";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { toast } from "@/hooks/use-toast";

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "completed" | "error";
  progress: number;
}

export function UploadFileModal({ isOpen, onClose }: UploadFileModalProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { addUpload, updateUpload, dispatch } = useFileManager();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: generateId(),
      status: "pending" as const,
      progress: 0,
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB max file size
  });

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const simulateUpload = async (pendingFile: PendingFile) => {
    const { file, id } = pendingFile;

    // Update status to uploading
    setPendingFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "uploading" } : f))
    );

    // Add to upload progress tracker
    addUpload({
      id,
      fileName: file.name,
      progress: 0,
      status: "uploading",
    });

    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        setPendingFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress } : f))
        );

        updateUpload(
          id,
          progress,
          progress === 100 ? "completed" : "uploading"
        );
      }

      // Mark as completed
      setPendingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "completed" } : f))
      );

      // Add to file system (mock)
      const newFile = {
        id: generateId(),
        name: file.name,
        type: "file" as const,
        size: formatFileSize(file.size),
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        path: "",
        mimeType: file.type,
        description: `Uploaded file: ${file.name}`,
      };

      dispatch({ type: "ADD_FILE", payload: newFile });
    } catch (error) {
      setPendingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "error" } : f))
      );

      updateUpload(id, 0, "error");

      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}`,
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Upload files sequentially for demo purposes
      // In a real app, you might want to upload them in parallel
      for (const pendingFile of pendingFiles) {
        if (pendingFile.status === "pending") {
          await simulateUpload(pendingFile);
        }
      }

      toast({
        title: "Upload completed",
        description: `Successfully uploaded ${pendingFiles.length} file(s)`,
      });

      // Clear completed files after a delay
      setTimeout(() => {
        setPendingFiles([]);
        onClose();
      }, 1000);
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
