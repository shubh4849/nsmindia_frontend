import { motion } from "framer-motion";
import { useFileManager } from "@/context/FileManagerContext";
import { FileIcon } from "@/components/shared/FileIcon";
import { formatDate } from "@/utils/fileUtils";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { fileApi, folderApi } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useState } from "react"; // Import useState
import { EditItemModal } from "@/components/Modals/EditItemModal"; // Import the new modal
import { FileItem, FolderItemWithCounts } from "@/context/FileManagerContext"; // Import FileItem and FolderItemWithCounts
import { ChevronRight } from "lucide-react"; // Import ChevronRight for the navigate icon
import { CreateFolderModal } from "@/components/Modals/CreateFolderModal"; // Import CreateFolderModal for its type
import { UploadFileModal } from "@/components/Modals/UploadFileModal"; // Import UploadFileModal for its type

export function FileList() {
  const {
    state,
    selectFile,
    fetchFiles,
    fetchFolderTree,
    navigateToPath, // Reintroduce navigateToPath
    openCreateFolderModal, // Reintroduce openCreateFolderModal
    openUploadFileModal, // Reintroduce openUploadFileModal
  } = useFileManager();
  const {
    selectedFile,
    currentPage,
    itemsPerPage,
    rootFoldersWithCounts,
    currentFolderId,
    currentPath,
    files,
  } = state; // Add currentFolderId, currentPath, and files
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<FileItem | null>(null);

  // Determine which items to display based on currentFolderId
  const displayedItems =
    currentFolderId === null ? rootFoldersWithCounts : files; // Display root folders or current folder's files/folders
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = displayedItems.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleNavigateIntoFolder = (folder: FolderItemWithCounts) => {
    const newPath = [...currentPath, folder.name]; // Assuming currentPath is correctly managed
    navigateToPath(newPath, folder.id); // Navigate into the folder
  };

  const handleFileClick = (item: FileItem) => {
    // Clicking an item in the main grid should select it.
    selectFile(item);
  };

  const handleFileDoubleClick = (item: FileItem) => {
    // Double-clicking an item should also select it.
    selectFile(item);
  };

  const handleEdit = (item: FileItem) => {
    setItemToEdit(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (fileId: string, type: "file" | "folder") => {
    try {
      if (type === "file") {
        await fileApi.deleteFile(fileId);
      } else {
        await folderApi.deleteFolder(fileId); // Now calling the backend API
      }
      toast({
        title: "Deleted successfully",
        description: `${
          type === "file" ? "File" : "Folder"
        } deleted successfully.`,
      });
      fetchFiles(); // Refresh the list
      fetchFolderTree(); // Refresh the folder tree after deletion
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Deletion failed",
        description: `Failed to delete ${type === "file" ? "file" : "folder"}.`,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await fileApi.downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Download started",
        description: `Downloading "${fileName}".`,
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Download failed",
        description: `Failed to download "${fileName}".`,
        variant: "destructive",
      });
    }
  };

  const handlePreview = async (fileId: string, fileName: string) => {
    try {
      const response = await fileApi.previewFile(fileId);
      const fileBlob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      const fileUrl = URL.createObjectURL(fileBlob);
      window.open(fileUrl, "_blank");
      toast({
        title: "Preview opened",
        description: `Opening preview for "${fileName}".`,
      });
    } catch (error) {
      console.error("Error previewing file:", error);
      toast({
        title: "Preview failed",
        description: `Failed to preview "${fileName}".`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Folders & Documents
        </h2>
        <span className="text-sm text-muted-foreground">
          {displayedItems.length} item{displayedItems.length !== 1 ? "s" : ""}
        </span>
      </div>

      {paginatedItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No files found</p>
        </div>
      ) : (
        <div className="border rounded-lg border-border">
          {/* Column Headers */}
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_40px] gap-4 p-3 bg-surface-hover text-muted-foreground font-semibold text-sm border-b border-border">
            <div className="">Name</div>
            <div className="">Description</div>
            <div className="">Created At</div>
            <div className="">Updated At</div>
            <div className="">Folders</div> {/* New column for folder count */}
            <div className="">Documents</div>{" "}
            {/* New column for document count */}
            <div className=""></div>
            {/* Actions column */}
          </div>
          {/* File List Items */}
          {paginatedItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr_40px] gap-4 p-3 border-b border-border last:border-b-0 cursor-pointer transition-colors duration-200 ${
                selectedFile?.id === item.id
                  ? "bg-surface-selected text-primary"
                  : "bg-surface hover:bg-surface-hover"
              }`}
            >
              <div
                className="col-span-2 flex items-center pr-2"
                onClick={() => handleFileClick(item)}
                onDoubleClick={() => handleFileDoubleClick(item)}
              >
                <FileIcon
                  file={item}
                  size={20}
                  className="mr-2 flex-shrink-0"
                />
                <span className="font-medium text-sm truncate">
                  {item.name}
                </span>
              </div>
              <div
                className="col-span-2 text-sm text-muted-foreground truncate pr-2"
                onClick={() => handleFileClick(item)}
                onDoubleClick={() => handleFileDoubleClick(item)}
              >
                {item.description || "---"}
              </div>
              <div
                className="text-sm text-muted-foreground pr-2"
                onClick={() => handleFileClick(item)}
                onDoubleClick={() => handleFileDoubleClick(item)}
              >
                {formatDate(item.createdAt)}
              </div>
              <div
                className="text-sm text-muted-foreground pr-2"
                onClick={() => handleFileClick(item)}
                onDoubleClick={() => handleFileDoubleClick(item)}
              >
                {formatDate(item.modifiedAt)}
              </div>
              {/* New columns for counts */}
              <div
                className="text-sm text-muted-foreground pr-2"
                onClick={() => handleFileClick(item)}
                onDoubleClick={() => handleFileDoubleClick(item)}
              >
                {item.type === "folder"
                  ? (item as FolderItemWithCounts).totalChildFolders
                  : ""}
              </div>
              <div
                className="text-sm text-muted-foreground pr-2"
                onClick={() => handleFileClick(item)}
                onDoubleClick={() => handleFileDoubleClick(item)}
              >
                {item.type === "folder"
                  ? (item as FolderItemWithCounts).totalChildFiles
                  : ""}
              </div>
              <div className="flex items-center justify-center">
                {/* Navigation icon for folders */}
                {item.type === "folder" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-surface-hover mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateIntoFolder(item as FolderItemWithCounts);
                    }}
                  >
                    <ChevronRight size={16} />
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-surface-hover"
                      onClick={(e) => e.stopPropagation()} // Prevent row click
                    >
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-40 bg-surface border-border shadow-lg"
                  >
                    {item.type === "file" && (
                      <DropdownMenuItem
                        onClick={() => handlePreview(item.id, item.name)}
                        className="cursor-pointer hover:bg-surface-hover"
                      >
                        Preview
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleEdit(item)}
                      className="cursor-pointer hover:bg-surface-hover"
                    >
                      Edit
                    </DropdownMenuItem>
                    {item.type === "file" && (
                      <DropdownMenuItem
                        onClick={() => handleDownload(item.id, item.name)}
                        className="cursor-pointer hover:bg-surface-hover"
                      >
                        Download
                      </DropdownMenuItem>
                    )}

                    {/* Create Folder option for folders */}
                    {item.type === "folder" && (
                      <DropdownMenuItem
                        onClick={() => openCreateFolderModal(item.id)}
                        className="cursor-pointer hover:bg-surface-hover"
                      >
                        Create Folder
                      </DropdownMenuItem>
                    )}

                    {/* Upload Document option for folders */}
                    {item.type === "folder" && (
                      <DropdownMenuItem
                        onClick={() => openUploadFileModal(item.id)} // Assuming openUploadFileModal can take parentId
                        className="cursor-pointer hover:bg-surface-hover"
                      >
                        Upload Document
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() => handleDelete(item.id, item.type)}
                      className="cursor-pointer hover:bg-surface-hover text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <EditItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={itemToEdit}
      />
    </div>
  );
}
