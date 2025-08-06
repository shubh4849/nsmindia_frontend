import { motion } from "framer-motion";
import { useFileManager } from "@/context/FileManagerContext";
import { FileIcon } from "@/components/shared/FileIcon";
import { formatDate } from "@/utils/fileUtils";
// Card is no longer needed for a list view
// import { Card } from '@/components/ui/card';

export function FileList() {
  const { state, getFilteredFiles, navigateToPath, selectFile } =
    useFileManager();
  const { currentPath, selectedFile, currentPage, itemsPerPage } = state;

  const files = getFilteredFiles();
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFiles = files.slice(startIndex, startIndex + itemsPerPage);

  const handleFileClick = (file: any) => {
    if (file.type === "folder") {
      const newPath = [...currentPath, file.name];
      navigateToPath(newPath);
    } else {
      selectFile(file);
    }
  };

  const handleFileDoubleClick = (file: any) => {
    if (file.type === "file") {
      selectFile(file);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {currentPath[currentPath.length - 1]}
        </h2>
        <span className="text-sm text-muted-foreground">
          {files.length} item{files.length !== 1 ? "s" : ""}
        </span>
      </div>

      {paginatedFiles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No files found</p>
        </div>
      ) : (
        <div className="border rounded-lg border-border">
          {/* Column Headers */}
          <div className="grid grid-cols-6 gap-4 p-3 bg-surface-hover text-muted-foreground font-semibold text-sm border-b border-border">
            <div className="col-span-2">Name</div>
            <div className="col-span-2">Description</div>
            <div className="">Created At</div>
            <div className="">Updated At</div>
          </div>
          {/* File List Items */}
          {paginatedFiles.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`grid grid-cols-6 gap-4 p-3 border-b border-border last:border-b-0 cursor-pointer transition-colors duration-200 ${
                selectedFile?.id === file.id
                  ? "bg-surface-selected text-primary"
                  : "bg-surface hover:bg-surface-hover"
              }`}
              onClick={() => handleFileClick(file)}
              onDoubleClick={() => handleFileDoubleClick(file)}
            >
              <div className="col-span-2 flex items-center">
                <FileIcon file={file} size={20} className="mr-2" />
                <span className="font-medium text-sm truncate">
                  {file.name}
                </span>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground truncate">
                {file.description || "---"}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDate(file.createdAt)}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDate(file.modifiedAt)}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
