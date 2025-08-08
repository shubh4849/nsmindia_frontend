import { Plus, FolderPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileManager } from "@/context/FileManagerContext";

export function ActionMenu() {
  const { state, openCreateFolderModal, openUploadFileModal } =
    useFileManager();
  const { currentFolderId } = state;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
            <Plus size={16} className="mr-2" />
            New
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 bg-surface border-border shadow-lg"
        >
          <DropdownMenuItem
            onClick={() => openCreateFolderModal(currentFolderId)}
            className="cursor-pointer hover:bg-surface-hover"
          >
            <FolderPlus size={16} className="mr-2 text-primary" />
            Create Folder
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={openUploadFileModal}
            className="cursor-pointer hover:bg-surface-hover"
          >
            <Upload size={16} className="mr-2 text-primary" />
            Upload Files
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
