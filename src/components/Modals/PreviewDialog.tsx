import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFileManager } from "@/context/FileManagerContext";
import { getFileExtension, formatDate } from "@/utils/fileUtils";
import { fileApi } from "@/services/api";
import { FileIcon } from "@/components/shared/FileIcon";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import DocViewer, { DocViewerRenderers } from "react-doc-viewer";

export function PreviewDialog() {
  const { state, closePreview } = useFileManager();
  const { isPreviewDialogOpen, selectedFile } = state as any;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [textPreviewContent, setTextPreviewContent] = useState<string | null>(
    null
  );

  const handleDownload = async () => {
    if (!selectedFile) return;
    try {
      const resp = await fileApi.downloadFile(selectedFile.id);
      const blob = new Blob([resp.data], {
        type: resp.headers["content-type"],
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const preferred =
        (selectedFile as any).originalName || selectedFile.name || "download";
      a.download = preferred;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // Fallback: try opening the public URL if available
      const publicUrl = (selectedFile as any).url as string | undefined;
      if (typeof publicUrl === "string") {
        window.open(publicUrl, "_blank");
      } else {
        toast({
          title: "Download failed",
          description: "Unable to download this file.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    const fetchPreview = async () => {
      if (!selectedFile || selectedFile.type === "folder") {
        setPreviewUrl(null);
        setTextPreviewContent(null);
        return;
      }

      setLoadingPreview(true);
      try {
        const extension = getFileExtension(selectedFile.name);
        const url = selectedFile.url as string | undefined;
        if (typeof url === "string" && /^https?:\/\//i.test(url)) {
          // Primary path: backend-provided public view URL
          if (
            selectedFile.mimeType?.includes("text") ||
            ["txt", "md", "json", "xml", "csv"].includes(extension)
          ) {
            try {
              const res = await fetch(url);
              const txt = await res.text();
              setTextPreviewContent(txt);
            } catch (e) {
              setTextPreviewContent(null);
            }
          } else {
            setTextPreviewContent(null);
          }
          setPreviewUrl(url);
          return;
        }

        // Fallbacks (rare): use API endpoints if no usable URL is provided
        if (
          selectedFile.mimeType?.includes("text") ||
          ["txt", "md", "json", "xml", "csv"].includes(extension)
        ) {
          const response = await fileApi.previewFile(selectedFile.id);
          const fileBlob = new Blob([response.data], {
            type: response.headers["content-type"],
          });
          const text = await fileBlob.text();
          setTextPreviewContent(typeof text === "string" ? text : String(text));
          const blobUrl = URL.createObjectURL(
            new Blob([text], { type: selectedFile.mimeType || "text/plain" })
          );
          setPreviewUrl(blobUrl);
        } else {
          const response = await fileApi.downloadFile(selectedFile.id);
          const fileBlob = new Blob([response.data], {
            type: response.headers["content-type"],
          });
          setTextPreviewContent(null);
          const blobUrl = URL.createObjectURL(fileBlob);
          setPreviewUrl(blobUrl);
        }
      } catch (error) {
        console.error("Error preparing preview:", error);
        toast({
          title: "Preview failed",
          description: "Could not load file preview.",
          variant: "destructive",
        });
        setPreviewUrl(null);
        setTextPreviewContent(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    if (isPreviewDialogOpen) {
      fetchPreview();
    }

    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setTextPreviewContent(null);
    };
  }, [isPreviewDialogOpen, selectedFile]);

  const docs = useMemo(() => {
    if (!selectedFile || !previewUrl) return [];
    const name = selectedFile.name;
    const ext = getFileExtension(name);
    const mime = selectedFile.mimeType;
    return [
      {
        uri: previewUrl,
        fileName: name,
        fileType: ext,
        mimeType: mime,
      } as any,
    ];
  }, [selectedFile, previewUrl]);

  const renderPreview = () => {
    if (!selectedFile || selectedFile.type === "folder") return null;

    const extension = getFileExtension(selectedFile.name);
    const url = selectedFile.url as string | undefined;
    const hasPublicUrl = typeof url === "string" && /^https?:\/\//i.test(url);
    const isOffice = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(
      extension
    );
    const isOdf = ["odt", "ods", "odp"].includes(extension);

    if (loadingPreview) {
      return (
        <div className="flex items-center justify-center h-[70vh]">
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      );
    }

    // Office/ODF: embed if public URL exists
    if ((isOffice || isOdf) && hasPublicUrl) {
      const embed = isOffice
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
            url!
          )}`
        : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
            url!
          )}`;
      return (
        <div className="h-[70vh] overflow-hidden">
          <iframe
            title="doc-preview"
            src={embed}
            className="w-full h-full border-0"
          />
        </div>
      );
    }

    // Video
    if (
      selectedFile.mimeType?.includes("video") ||
      ["mp4", "webm", "ogg"].includes(extension)
    ) {
      return (
        <div className="flex items-center justify-center p-4">
          {previewUrl && (
            <video
              controls
              className="max-w-full max-h-[70vh] rounded-lg shadow-md"
              preload="metadata"
            >
              <source src={previewUrl} type={selectedFile.mimeType} />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      );
    }

    // Image
    if (
      selectedFile.mimeType?.includes("image") ||
      ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "tiff"].includes(
        extension
      )
    ) {
      return (
        <div className="h-[70vh] overflow-hidden flex items-center justify-center p-4">
          {previewUrl && (
            <img
              src={previewUrl}
              alt={selectedFile.name}
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      );
    }

    // Text
    if (
      selectedFile.mimeType?.includes("text") ||
      ["txt", "md", "json", "xml", "csv"].includes(extension)
    ) {
      const display = textPreviewContent ?? "";
      return (
        <div className="p-4 overflow-auto max-h-[70vh]">
          <pre className="text-sm text-foreground whitespace-pre-wrap">
            {display || "No content to display."}
          </pre>
        </div>
      );
    }

    // Everything else: generic viewer (pdfs also work here)
    if (docs.length > 0) {
      return (
        <div className="h-[70vh] overflow-hidden">
          <DocViewer
            documents={docs as any}
            pluginRenderers={DocViewerRenderers}
            config={{ header: { disableHeader: true, disableFileName: true } }}
            style={{ height: "100%" }}
          />
        </div>
      );
    }

    // Office/ODF without public URL: action buttons
    if (isOffice || isOdf) {
      return (
        <div className="h-[70vh] flex flex-col items-center justify-center text-center px-6">
          <FileIcon file={selectedFile} size={48} className="mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            This format requires a public URL for inline viewing. Use
            Open/Download to access the file.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(previewUrl || url, "_blank")}
              disabled={!previewUrl && !hasPublicUrl}
            >
              <ExternalLink size={16} className="mr-1" />
              Open
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.open(previewUrl || url, "_blank")}
            >
              <Download size={16} className="mr-1" />
              Download
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-[70vh]">
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
    <Dialog
      open={isPreviewDialogOpen}
      onOpenChange={(open) => !open && closePreview()}
    >
      <DialogContent className="max-w-5xl w-full overflow-hidden">
        <DialogHeader>
          <DialogTitle>{selectedFile?.name || "Preview"}</DialogTitle>
        </DialogHeader>
        {selectedFile && (
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2 min-w-0">
              <FileIcon file={selectedFile} size={20} />
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground truncate">
                  Modified:{" "}
                  {selectedFile.modifiedAt
                    ? formatDate(selectedFile.modifiedAt)
                    : "--"}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {selectedFile.url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedFile.url!, "_blank")}
                  className="bg-surface hover:bg-surface-hover border-primary text-primary"
                >
                  <ExternalLink size={16} className="mr-1" />
                  Open
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="bg-surface hover:bg-surface-hover border-primary text-primary"
              >
                <Download size={16} className="mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}
        {renderPreview()}
      </DialogContent>
    </Dialog>
  );
}
