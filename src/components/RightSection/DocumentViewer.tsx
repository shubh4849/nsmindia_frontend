import { FileText, Image, Video, Download, ExternalLink } from "lucide-react";
import { useFileManager } from "@/context/FileManagerContext";
import { isPreviewable, formatDate, getFileExtension } from "@/utils/fileUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileIcon } from "@/components/shared/FileIcon";
import { fileApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export function DocumentViewer() {
  const { state } = useFileManager();
  const { selectedFile } = state;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [textPreviewContent, setTextPreviewContent] = useState<string | null>(
    null
  ); // New state for text content

  useEffect(() => {
    const fetchPreview = async () => {
      if (!selectedFile || !isPreviewable(selectedFile)) {
        setPreviewUrl(null);
        setTextPreviewContent(null); // Clear text content
        return;
      }

      setLoadingPreview(true);
      try {
        let url: string | null = null;
        if (
          selectedFile.mimeType?.includes("text") ||
          ["txt", "md", "json", "xml", "csv"].includes(
            getFileExtension(selectedFile.name)
          )
        ) {
          // For text files, fetch as text and create a data URL
          const response = await fileApi.getFile(selectedFile.id);
          const textContent = response.data; // Assuming response.data is directly the text content
          setTextPreviewContent(textContent); // Set the text content state
          url = URL.createObjectURL(
            new Blob([textContent], {
              type: selectedFile.mimeType || "text/plain",
            })
          );
        } else {
          setTextPreviewContent(null); // Clear text content for non-text files
          const response = await fileApi.previewFile(selectedFile.id);
          const fileBlob = new Blob([response.data], {
            type: response.headers["content-type"],
          });
          url = URL.createObjectURL(fileBlob);
        }
        setPreviewUrl(url);
      } catch (error) {
        console.error("Error fetching preview:", error);
        toast({
          title: "Preview failed",
          description: "Could not load file preview.",
          variant: "destructive",
        });
        setPreviewUrl(null);
        setTextPreviewContent(null); // Clear text content on error
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();

    // Cleanup URL when component unmounts or selectedFile changes
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setTextPreviewContent(null); // Also clear text content on cleanup
    };
  }, [selectedFile]);

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
    if (loadingPreview) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (!canPreview || !previewUrl) {
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
            src={previewUrl}
            alt={selectedFile.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-md"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder-image.png"; // Fallback image
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
            src={previewUrl}
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
            <source src={previewUrl} type={selectedFile.mimeType} />
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
            {loadingPreview
              ? "Loading text preview..."
              : textPreviewContent || "No content to display."}
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
