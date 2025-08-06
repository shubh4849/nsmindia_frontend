import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFileManager } from "@/context/FileManagerContext";
import { FileIcon } from "@/components/shared/FileIcon";
import { Button } from "@/components/ui/button";

interface TreeNode {
  id: string;
  name: string;
  path: string[];
  children: TreeNode[];
}

export function FolderTree() {
  const { state, navigateToPath, dispatch, openCreateFolderModal } =
    useFileManager();
  const { currentPath, expandedFolders } = state;
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  useEffect(() => {
    // Build tree structure from mock data
    const buildTree = (): TreeNode[] => {
      const rootNode: TreeNode = {
        id: "root",
        name: "Root",
        path: ["Root"],
        children: [
          {
            id: "documents",
            name: "Documents",
            path: ["Root", "Documents"],
            children: [],
          },
          {
            id: "projects",
            name: "Projects",
            path: ["Root", "Projects"],
            children: [],
          },
          {
            id: "media",
            name: "Media",
            path: ["Root", "Media"],
            children: [],
          },
        ],
      };
      return [rootNode];
    };

    setTreeData(buildTree());
  }, []);

  const toggleExpanded = (nodeId: string) => {
    dispatch({ type: "TOGGLE_FOLDER_EXPANSION", payload: nodeId });
  };

  const handleNodeClick = (node: TreeNode) => {
    navigateToPath(node.path);
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected =
      JSON.stringify(currentPath) === JSON.stringify(node.path);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center py-1.5 px-2 mx-1 rounded-md cursor-pointer transition-colors ${
            isSelected
              ? "bg-primary-light text-primary"
              : "hover:bg-surface-hover text-foreground"
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
                toggleExpanded(node.id);
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
              type: "folder",
              createdAt: "",
              modifiedAt: "",
              path: node.path.slice(1).join("/"),
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
              openCreateFolderModal();
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
              {node.children.map((child) => renderNode(child, level + 1))}
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
        {treeData.map((node) => renderNode(node))}
      </div>
    </div>
  );
}
