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
import { useState, useEffect, useRef } from "react"; // Import useState
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
    fetchMainChildren,
    toggleMainExpand,
    selectMainFolder,
    openCreateFolderModal,
    openUploadFileModal,
    setBreadcrumbPath,
    clearMainExploration,
  } = useFileManager();
  const {
    selectedFile,
    currentPage,
    itemsPerPage,
    rootFoldersWithCounts,
    mainExpandedIds,
    mainChildrenByParent,
    selectedMainFolderId,
  } = state;
  const { currentPath } = state as any;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<FileItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedRootFolderId, setSelectedRootFolderId] = useState<
    string | null
  >(null);
  const findPathById = (id: string | null): string[] => {
    if (!id) return ["Root"]; // state uses Root; UI labels it as Home
    const dfs = (nodes: FileItem[], segs: string[]): string[] | null => {
      for (const n of nodes) {
        const newSegs = [...segs, n.name];
        if (n.id === id) return newSegs;
        if (n.children) {
          const res = dfs(n.children, newSegs);
          if (res) return res;
        }
      }
      return null;
    };
    const fromTree = dfs((state as any).folderTree || [], []);
    return fromTree ? ["Root", ...fromTree] : ["Root"];
  };

  // We always list root folders at top-level and support inline expansion under each
  const displayedItems = rootFoldersWithCounts;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = displayedItems.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleFileClick = (item: FileItem) => {
    if (item.type === "folder") {
      void handleExpandToggle(item);
    } else {
      selectFile(item);
    }
  };

  const handleFileDoubleClick = (item: FileItem) => {
    // Double-clicking an item should also select it.
    selectFile(item);
  };

  const handleExpandToggle = async (folder: FileItem) => {
    toggleMainExpand(folder.id);
    if (!mainChildrenByParent[folder.id]) {
      await fetchMainChildren(folder.id);
    }
    // Update breadcrumb path by resolving via tree
    const segs = findPathById(folder.id);
    setBreadcrumbPath(segs);
  };

  const handleRootToggle = async (folder: FileItem) => {
    const willExpand = !mainExpandedIds.has(folder.id);
    await handleExpandToggle(folder);
    setSelectedRootFolderId(
      willExpand
        ? folder.id
        : selectedRootFolderId === folder.id
        ? null
        : selectedRootFolderId
    );
  };

  // Removed click-outside collapse per new requirement

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

  const renderChildRows = (parentId: string, level = 1, rootId?: string) => {
    const children = mainChildrenByParent[parentId] || [];
    return children.map((child) => (
      <div
        key={child.id}
        className={`border-b border-border/50 ${
          selectedRootFolderId && rootId && selectedRootFolderId === rootId
            ? "bg-primary/5"
            : ""
        }`}
      >
        <div
          className="grid grid-cols-[24px_2fr_2fr_1fr_1fr_40px] gap-4 p-2 cursor-pointer"
          style={{ marginLeft: level * 24 }}
          onClick={() => handleFileClick(child)}
          data-row-id={child.id}
        >
          <div className="flex items-center justify-center">
            {child.type === "folder" && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 text-foreground`}
                onClick={async (e) => {
                  e.stopPropagation();
                  await handleExpandToggle(child);
                }}
              >
                <span className="text-foreground">
                  {mainExpandedIds.has(child.id) ? "▼" : "▶"}
                </span>
              </Button>
            )}
          </div>
          <div className="flex items-center pr-2">
            <FileIcon
              file={child}
              size={18}
              className="mr-2 flex-shrink-0"
              badgeCount={
                child.type === "folder"
                  ? ((child as any).totalChildFolders || 0) +
                    ((child as any).totalChildFiles || 0)
                  : undefined
              }
            />
            <span className="text-sm truncate">
              {child.type === "file" && (child as any).originalName
                ? (child as any).originalName
                : child.name}
            </span>
          </div>
          <div className="text-sm text-muted-foreground truncate pr-2">
            {child.description || "---"}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(child.createdAt)}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(
              ((child as any).updatedAt as string) ||
                child.modifiedAt ||
                child.createdAt
            )}
          </div>
          <div className="flex items-center justify-end">
            {child.type === "file" ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:bg-surface-hover"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(child.id, "file");
                }}
                aria-label="Delete file"
                title="Delete"
              >
                {/* Bin icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-trash"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </Button>
            ) : (
              <DropdownMenu onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-surface-hover"
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-40 bg-surface border-border shadow-lg"
                  onPointerDownOutside={(e) => e.preventDefault()}
                  onFocusOutside={(e) => e.preventDefault()}
                  onInteractOutside={(e) => e.preventDefault()}
                >
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-surface-hover"
                    onClick={() => openCreateFolderModal(child.id)}
                  >
                    Create Folder
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-surface-hover"
                    onClick={() => openUploadFileModal(child.id)}
                  >
                    Upload Document
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-surface-hover text-destructive focus:text-destructive"
                    onClick={() => handleDelete(child.id, "folder")}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {child.type === "folder" && mainExpandedIds.has(child.id) && (
          <div
            className={`${
              selectedRootFolderId && rootId && selectedRootFolderId === rootId
                ? "bg-primary/5"
                : ""
            }`}
          >
            {renderChildRows(child.id, level + 1, rootId)}
          </div>
        )}
      </div>
    ));
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
        <div className="border rounded-lg border-border" ref={containerRef}>
          {/* Column Headers */}
          <div className="grid grid-cols-[24px_2fr_2fr_1fr_1fr_40px] gap-4 p-3 bg-surface-hover text-muted-foreground font-semibold text-sm border-b border-border">
            <div className="" />
            <div className="">Name</div>
            <div className="">Description</div>
            <div className="">Created At</div>
            <div className="">Updated At</div>
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
              className={`grid grid-cols-[24px_2fr_2fr_1fr_1fr_40px] gap-4 p-3 border-b border-border last:border-b-0 cursor-pointer transition-colors duration-200 ${
                selectedRootFolderId === item.id
                  ? "bg-primary/5 text-primary"
                  : "bg-surface hover:bg-surface-hover"
              }`}
              data-row-id={item.id}
            >
              <div className="flex items-center justify-center">
                {item.type === "folder" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 text-foreground`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRootToggle(item);
                    }}
                    aria-label="Toggle folder"
                  >
                    <span className="text-foreground">
                      {mainExpandedIds.has(item.id) ? "▼" : "▶"}
                    </span>
                  </Button>
                )}
              </div>
              <div
                className="flex items-center pr-2"
                onClick={() => handleFileClick(item)}
                onDoubleClick={() => handleFileDoubleClick(item)}
              >
                <FileIcon
                  file={item}
                  size={20}
                  className="mr-2 flex-shrink-0"
                  badgeCount={
                    item.type === "folder"
                      ? ((item as any).totalChildFolders || 0) +
                        ((item as any).totalChildFiles || 0)
                      : undefined
                  }
                />
                <span className="font-medium text-sm truncate">
                  {item.name}
                </span>
              </div>
              <div
                className="text-sm text-muted-foreground truncate pr-2 max-w-full"
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
                {formatDate(
                  ((item as any).updatedAt as string) ||
                    item.modifiedAt ||
                    item.createdAt
                )}
              </div>
              <div className="flex items-center justify-end">
                <DropdownMenu onOpenChange={setIsMenuOpen}>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-surface-hover"
                    >
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-40 bg-surface border-border shadow-lg"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onFocusOutside={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                  >
                    {item.type === "folder" && (
                      <DropdownMenuItem
                        onClick={() => openCreateFolderModal(item.id)}
                        className="cursor-pointer hover:bg-surface-hover"
                      >
                        Create Folder
                      </DropdownMenuItem>
                    )}
                    {item.type === "folder" && (
                      <DropdownMenuItem
                        onClick={() => openUploadFileModal(item.id)}
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
              {item.type === "file" && (
                <div className="flex items-center justify-end col-span-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:bg-surface-hover"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id, "file");
                    }}
                    aria-label="Delete file"
                    title="Delete"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-trash"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </Button>
                </div>
              )}
              {/* Expanded children block */}
              {item.type === "folder" && mainExpandedIds.has(item.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`col-span-5 rounded ${
                    selectedRootFolderId === item.id ? "bg-primary/5" : ""
                  }`}
                >
                  {renderChildRows(item.id, 1, item.id)}
                </motion.div>
              )}
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
