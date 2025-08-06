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
import { validateFileName, generateId, buildFilePath } from "@/utils/fileUtils";
import { toast } from "@/hooks/use-toast";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateFolderModal({ isOpen, onClose }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { state, dispatch } = useFileManager();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newFolder = {
        id: generateId(),
        name: folderName,
        type: "folder" as const,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        path: buildFilePath(state.currentPath),
        description: description.trim() || `Folder: ${folderName}`,
      };

      dispatch({ type: "ADD_FOLDER", payload: newFolder });

      toast({
        title: "Folder created",
        description: `"${folderName}" has been created successfully.`,
      });

      // Reset form and close modal
      setFolderName("");
      setDescription("");
      onClose();
    } catch (error) {
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
