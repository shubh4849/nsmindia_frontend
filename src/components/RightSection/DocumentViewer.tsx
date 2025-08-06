import { FileText, Image, Video, Download, ExternalLink } from "lucide-react";
import { useFileManager } from "@/context/FileManagerContext";
import { isPreviewable, formatDate, getFileExtension } from "@/utils/fileUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileIcon } from "@/components/shared/FileIcon";

export function DocumentViewer() {
  const { state } = useFileManager();
  const { selectedFile } = state;

  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center bg-surface">
        <div className="text-center">
          <FileText size={64} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No file selected
          </h3>
          <p className="text-muted-foreground">
            Select a file to preview it here
          </p>
        </div>
      </div>
    );
  }

  const extension = getFileExtension(selectedFile.name);
  const canPreview = isPreviewable(selectedFile);

  const renderPreview = () => {
    if (!canPreview) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileIcon file={selectedFile} size={64} className="mx-auto mb-4" />
            <p className="text-muted-foreground">
              Preview not available for this file type
            </p>
          </div>
        </div>
      );
    }

    // Image preview
    if (
      selectedFile.mimeType?.includes("image") ||
      ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension)
    ) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <img
            src={selectedFile.url || "/placeholder-image.png"}
            alt={selectedFile.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-md"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder-image.png";
            }}
          />
        </div>
      );
    }

    // PDF preview
    if (selectedFile.mimeType?.includes("pdf") || extension === "pdf") {
      return (
        <div className="flex-1">
          <iframe
            src={selectedFile.url || "/placeholder.pdf"}
            className="w-full h-full border-0 rounded-lg"
            title={selectedFile.name}
          />
        </div>
      );
    }

    // Video preview
    if (
      selectedFile.mimeType?.includes("video") ||
      ["mp4", "webm", "ogg"].includes(extension)
    ) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <video
            controls
            className="max-w-full max-h-full rounded-lg shadow-md"
            preload="metadata"
          >
            <source src={selectedFile.url} type={selectedFile.mimeType} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Text file preview
    if (
      selectedFile.mimeType?.includes("text") ||
      ["txt", "md", "json", "xml", "csv"].includes(extension)
    ) {
      return (
        <div className="flex-1 p-4 overflow-auto">
          <pre className="text-sm text-foreground whitespace-pre-wrap">
            {/* In a real app, you would fetch and display the file content */}
            Loading file content...
          </pre>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileIcon file={selectedFile} size={64} className="mx-auto mb-4" />
          <p className="text-muted-foreground">
            Preview not available for this file type
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with file info */}
      <div className="border-b border-border p-4 bg-surface">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <FileIcon file={selectedFile} size={24} />
            <div className="min-w-0 flex-1">
              <h3
                className="font-semibold text-foreground truncate"
                title={selectedFile.name}
              >
                {selectedFile.name}
              </h3>
              <div className="mt-1 space-y-1">
                {selectedFile.size && (
                  <p className="text-sm text-muted-foreground">
                    Size: {selectedFile.size}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Modified: {formatDate(selectedFile.modifiedAt)}
                </p>
                {selectedFile.description && (
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {selectedFile.url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(selectedFile.url, "_blank")}
                className="bg-surface hover:bg-surface-hover border-primary text-primary"
              >
                <ExternalLink size={16} className="mr-1" />
                Open
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="bg-surface hover:bg-surface-hover border-primary text-primary"
            >
              <Download size={16} className="mr-1" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* File preview area */}
      {renderPreview()}
    </div>
  );
}
