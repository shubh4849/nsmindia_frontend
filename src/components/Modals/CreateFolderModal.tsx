import { useState } from "react";
import { FolderPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFileManager } from "@/context/FileManagerContext";
import { validateFileName } from "@/utils/fileUtils";
import { toast } from "@/hooks/use-toast";
import { folderApi } from "@/services/api";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentFolderId: string | null;
  parentFolderCurrentPath: string[];
}

export function CreateFolderModal({
  isOpen,
  onClose,
  parentFolderId,
  parentFolderCurrentPath,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { state, dispatch, fetchFiles, fetchFolderTree, revalidateQuietly } =
    useFileManager();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("CreateFolderModal - parentFolderId:", parentFolderId);
    console.log(
      "CreateFolderModal - parentFolderCurrentPath:",
      parentFolderCurrentPath
    );

    const validationError = validateFileName(folderName);
    if (validationError) {
      toast({
        title: "Invalid folder name",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      console.log("Calling folderApi.createFolder with:", {
        folderName,
        description: description.trim(),
        path: [...parentFolderCurrentPath, folderName].filter(Boolean),
        parentId: parentFolderId ?? undefined,
      });

      const resp = await folderApi.createFolder(
        folderName,
        description.trim(),

        [...parentFolderCurrentPath, folderName].filter(Boolean),
        parentFolderId ?? undefined
      );

      toast({
        title: "Folder created",
        description: `"${folderName}" has been created successfully.`,
      });

      const folder = (resp as any)?.data ?? {
        id: crypto.randomUUID?.() || `${Date.now()}`,
        name: folderName,
        description: description.trim(),
        type: "folder" as const,
        parentId: parentFolderId ?? null,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };
      const child = { ...folder, type: "folder" } as any;

      dispatch({
        type: "OPTIMISTIC_ADD_CHILD",
        payload: { parentId: parentFolderId, child },
      });

      dispatch({
        type: "OPTIMISTIC_ADD_TREE_CHILD",
        payload: { parentId: parentFolderId, child },
      });

      if (parentFolderId) {
        dispatch({
          type: "ADJUST_FOLDER_COUNTS",
          payload: { folderId: parentFolderId, deltaFolders: 1 },
        });
      }

      revalidateQuietly(parentFolderId ?? null);

      setFolderName("");
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Error creating folder",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFolderName("");
      setDescription("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center text-foreground">
            <FolderPlus size={20} className="mr-2 text-primary" />
            Create New Folder
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folderName" className="text-foreground">
              Folder Name *
            </Label>
            <Input
              id="folderName"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="bg-surface border-border focus:ring-primary"
              required
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Description (Optional)
            </Label>
            <Input
              id="description"
              placeholder="Enter folder description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-input border-border focus:ring-primary"
              disabled={isCreating}
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="bg-surface hover:bg-surface-hover border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!folderName.trim() || isCreating}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isCreating ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
