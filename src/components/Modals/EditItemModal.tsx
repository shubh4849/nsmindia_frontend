import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useFileManager, FileItem } from "@/context/FileManagerContext";
import { fileApi, folderApi } from "@/services/api";
import { File, Folder } from "lucide-react";

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FileItem | null;
}

export function EditItemModal({ isOpen, onClose, item }: EditItemModalProps) {
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const { fetchFiles, fetchFolderTree } = useFileManager();

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    if (!name.trim()) {
      toast({
        title: "Name cannot be empty",
        description: `Please provide a name for the ${item.type}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (item.type === "file") {
        await fileApi.updateFile(item.id, { name, description });
      } else {
        await folderApi.updateFolder(item.id, { name, description });
      }
      toast({
        title: "Item updated",
        description: `The ${item.type} "${name}" has been updated.`,
      });
      fetchFiles();
      fetchFolderTree(); // Refresh folder tree in case folder name changed
      onClose();
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: `Failed to update ${item.type}`,
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center text-foreground">
            {item?.type === "folder" ? (
              <Folder size={20} className="mr-2 text-primary" />
            ) : (
              <File size={20} className="mr-2 text-primary" />
            )}
            Edit {item?.type === "folder" ? "Folder" : "File"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="itemName" className="text-foreground">
              Name *
            </Label>
            <Input
              id="itemName"
              placeholder={`Enter ${item?.type} name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface border-border focus:ring-primary"
              required
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemDescription" className="text-foreground">
              Description (Optional)
            </Label>
            <Input
              id="itemDescription"
              placeholder={`Enter ${item?.type} description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-input border-border focus:ring-primary"
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              className="bg-surface hover:bg-surface-hover border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
