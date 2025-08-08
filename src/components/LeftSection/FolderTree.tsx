import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFileManager } from "@/context/FileManagerContext";
import { FileIcon } from "@/components/shared/FileIcon";
import { Button } from "@/components/ui/button";

// Update TreeNode interface to match FileItem structure from backend
interface TreeNode {
  id: string;
  name: string;
  path: string; // Changed to string to match backend
  children?: TreeNode[]; // children might be optional if a folder is empty
  parentId?: string | null;
}

export function FolderTree() {
  const { state, navigateToPath, openCreateFolderModal, dispatch } =
    useFileManager();
  const { folderTree, expandedFolders } = state;

  // Helper to construct the path array from folderTree based on folderId
  const getPathFromFolderId = (
    targetId: string | null,
    tree: TreeNode[]
  ): string[] => {
    const pathSegments: string[] = [];
    let currentNode: TreeNode | undefined | null;

    const findNodeAndAncestors = (
      nodes: TreeNode[],
      id: string | null,
      currentPath: string[]
    ): boolean => {
      for (const node of nodes) {
        const newPath = [...currentPath, node.name];
        if (node.id === id) {
          pathSegments.push(...newPath);
          return true;
        }
        if (node.children && findNodeAndAncestors(node.children, id, newPath)) {
          return true;
        }
      }
      return false;
    };

    if (targetId) {
      findNodeAndAncestors(tree, targetId, []);
    }

    return pathSegments.length > 0 ? pathSegments : ["Root"];
  };

  const handleNodeClick = (node: TreeNode) => {
    console.log("Node clicked in FolderTree:", node);
    // New behavior: Clicking a folder in the sidebar only toggles its expansion.
    // It does NOT affect the main content area (FileGrid).
    handleToggle(node.id);
    // The navigation to path and setting current folder ID will now be handled
    // separately by the main content area's logic or not at all by folder clicks.
  };

  const handleToggle = (nodeId: string) => {
    dispatch({ type: "TOGGLE_FOLDER_EXPANSION", payload: nodeId });
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    // Removed isSelected as sidebar no longer controls main content view
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-1.5 px-2 mx-1 rounded-md cursor-pointer transition-colors ${
            // Removed isSelected styling
            "hover:bg-surface-hover text-foreground"
          }`}
          style={{ marginLeft: `${level * 16}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-4 w-4 mr-1 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={14} className="text-muted-foreground" />
              )}
            </Button>
          )}
          {!hasChildren && <div className="w-5" />}

          <FileIcon
            file={{
              id: node.id,
              name: node.name,
              type: "folder", // Always folder for FolderTree nodes
              createdAt: "",
              modifiedAt: "",
              path: node.path,
            }}
            size={16}
            className="mr-2"
          />

          <span className="text-sm font-medium truncate">{node.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0 text-primary hover:bg-primary-light focus-visible:ring-0"
            onClick={(e) => {
              e.stopPropagation();
              // When Plus icon is clicked, navigate to this folder in the main frame
              const newPath = getPathFromFolderId(node.id, folderTree);
              navigateToPath(newPath, node.id);
            }}
          >
            <Plus size={16} />
          </Button>
        </div>

        <AnimatePresence>
          {isExpanded && hasChildren && (
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
