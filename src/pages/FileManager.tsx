import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileManager } from "@/context/FileManagerContext";
import { Breadcrumb } from "@/components/TopSection/Breadcrumb";
import { ActionMenu } from "@/components/TopSection/ActionMenu";
import { SearchFilter } from "@/components/TopSection/SearchFilter";
import { FolderTree } from "@/components/LeftSection/FolderTree";
import { UploadProgress } from "@/components/LeftSection/UploadProgress";
import { FileList } from "@/components/MiddleSection/FileGrid"; // Renamed from FileGrid
import { Pagination } from "@/components/MiddleSection/Pagination";
import { DocumentViewer } from "@/components/RightSection/DocumentViewer";
import { CreateFolderModal } from "@/components/Modals/CreateFolderModal";
import { UploadFileModal } from "@/components/Modals/UploadFileModal";

export function FileManager() {
  const { state, dispatch } = useFileManager();
  const { isLeftPanelOpen, isCreateFolderModalOpen, isUploadFileModalOpen } =
    state;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Section - Header */}
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
            className="hover:bg-primary-light text-primary"
          >
            {isLeftPanelOpen ? (
              <PanelLeftClose size={18} className="text-muted-foreground" />
            ) : (
              <PanelLeftOpen size={18} className="text-muted-foreground" />
            )}
          </Button>
          <Breadcrumb />
        </div>

        <div className="flex items-center space-x-4">
          <SearchFilter />
          <ActionMenu />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Section - Folder Tree */}
        {isLeftPanelOpen && (
          <aside className="w-80 border-r border-border bg-sidebar-background flex flex-col">
            <div className="flex-1 overflow-hidden">
              <FolderTree />
            </div>
            <UploadProgress />
          </aside>
        )}

        {/* Middle Section - File Grid */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-hidden">
            <FileList />
          </div>
          <Pagination />
        </main>

        {/* Right Section - Document Viewer */}
        <aside className="w-96 border-l border-border">
          <DocumentViewer />
        </aside>
      </div>
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => dispatch({ type: "CLOSE_CREATE_FOLDER_MODAL" })}
      />
      <UploadFileModal
        isOpen={isUploadFileModalOpen}
        onClose={() => dispatch({ type: "CLOSE_UPLOAD_FILE_MODAL" })}
      />
    </div>
  );
}
