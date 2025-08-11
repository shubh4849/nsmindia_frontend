import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFileManager } from "@/context/FileManagerContext";
import { FileIcon } from "@/components/shared/FileIcon";
import { Button } from "@/components/ui/button";

// Update TreeNode interface to match FileItem structure from backend
interface TreeNode {
  id: string;
  name: string;
  type?: "folder" | "file"; // allow files in tree
  children?: TreeNode[]; // children might be optional if a folder is empty
  parentId?: string | null;
}

export function FolderTree() {
  const {
    state,
    dispatch,
    fetchFolderChildren,
    openPreview,
    revealFolderInMain,
    selectMainFolder,
    setBreadcrumbPath,
    collapseFolderInMain,
  } = useFileManager() as any;
  const { folderTree, expandedFolders, rootFoldersWithCounts } = state as any;

  const handleNodeClick = (node: TreeNode) => {
    if (node.type === "file") {
      // Build a minimal FileItem shape to preview
      const file = {
        id: node.id,
        name: (node as any).originalName || node.name,
        type: "file" as const,
        createdAt: "",
        modifiedAt: "",
        path: "",
        mimeType: (node as any).mimeType,
      };
      openPreview(file as any);
      return;
    }
    const willExpand = !expandedFolders.has(node.id);
    const isRootFolder =
      ((state as any).folderMetaById?.[node.id]?.parentId ?? null) === null;
    if (willExpand && isRootFolder) {
      // Collapse all other expanded root folders in the tree and main
      for (const rf of rootFoldersWithCounts || []) {
        if (rf.id !== node.id && expandedFolders.has(rf.id)) {
          dispatch({ type: "TOGGLE_FOLDER_EXPANSION", payload: rf.id });
          collapseFolderInMain(rf.id);
        }
      }
    }
    dispatch({ type: "TOGGLE_FOLDER_EXPANSION", payload: node.id });
    if (willExpand && (!node.children || node.children.length === 0)) {
      fetchFolderChildren(node.id);
    }
    // Sync middle section
    selectMainFolder(node.id);
    if (willExpand) {
      revealFolderInMain(node.id);
    } else {
      collapseFolderInMain(node.id);
    }
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const isFolder = (node.type ?? "folder") === "folder";
    const isExpanded = expandedFolders.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`relative flex items-center py-1.5 pr-2 pl-2 mx-1 rounded-md cursor-pointer transition-colors hover:bg-surface-hover text-foreground`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {/* L-shape connector */}
          {level > 0 && (
            <>
              <span
                className="absolute border-dashed border-muted-foreground/40"
                style={{
                  left: -12,
                  top: 0,
                  bottom: "50%",
                  borderLeftWidth: 1,
                }}
              />
              <span
                className="absolute border-dashed border-muted-foreground/40"
                style={{
                  left: -12,
                  top: "50%",
                  width: 12,
                  borderTopWidth: 1,
                }}
              />
            </>
          )}

          {!isFolder && <div className="w-5" />}

          {(() => {
            const displayName =
              !isFolder && (node as any).originalName
                ? (node as any).originalName
                : node.name;
            const mimeType = (node as any).mimeType;
            return (
              <>
                <FileIcon
                  file={{
                    id: node.id,
                    name: displayName,
                    type: isFolder ? "folder" : "file",
                    createdAt: "",
                    modifiedAt: "",
                    path: "",
                    mimeType,
                  }}
                  size={16}
                  className="mr-2"
                />

                <span className="text-sm font-medium truncate">
                  {displayName}
                </span>
              </>
            );
          })()}

          {isFolder && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto p-0 h-5 w-5 hover:bg-transparent shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(node);
              }}
              aria-label="Toggle"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <Minus size={14} className="text-muted-foreground" />
              ) : (
                <Plus size={14} className="text-muted-foreground" />
              )}
            </Button>
          )}
        </div>

        <AnimatePresence>
          {isFolder && isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {node.children &&
                node.children.map((child) => renderNode(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="p-4 custom-scrollbar overflow-y-auto">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
        Folders
      </h3>
      <div className="space-y-1">
        {folderTree.map((node) => renderNode(node))}
      </div>
    </div>
  );
}
