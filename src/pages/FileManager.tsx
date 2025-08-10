import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileManager } from "@/context/FileManagerContext";
import { Breadcrumb } from "@/components/TopSection/Breadcrumb";
import { ActionMenu } from "@/components/TopSection/ActionMenu";
import { SearchFilter } from "@/components/TopSection/SearchFilter";
import { FolderTree } from "@/components/LeftSection/FolderTree";
import { UploadProgress } from "@/components/LeftSection/UploadProgress";
import { SummaryCounters } from "@/components/LeftSection/SummaryCounters";
import { FileList } from "@/components/MiddleSection/FileGrid";
import { Pagination } from "@/components/MiddleSection/Pagination";
import { CreateFolderModal } from "@/components/Modals/CreateFolderModal";
import { UploadFileModal } from "@/components/Modals/UploadFileModal";

export function FileManager() {
  const { state, dispatch } = useFileManager();
  const {
    isLeftPanelOpen,
    isCreateFolderModalOpen,
    isUploadFileModalOpen,
    isLoading,
    folderToCreateInId,
    folderToCreateParentPath,
  } = state;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Section - Header */}
      <header className="h-auto md:h-16 border-b border-border bg-surface flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 md:px-6 py-2">
        <div className="flex items-center justify-between md:justify-start space-x-2 md:space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
            className="hover:bg-primary-light text-primary"
          >
            {isLeftPanelOpen ? (
              <PanelLeftClose size={20} className="text-muted-foreground" />
            ) : (
              <PanelLeftOpen size={20} className="text-muted-foreground" />
            )}
          </Button>
          <Breadcrumb />
        </div>

        <div className="flex items-center flex-wrap gap-2 md:gap-4">
          <SearchFilter />
          <ActionMenu />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Section - Folder Tree */}
        {isLeftPanelOpen && (
          <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border bg-sidebar-background flex flex-col max-h-60 md:max-h-none">
            <SummaryCounters />
            <div className="flex-1 overflow-auto">
              <FolderTree />
            </div>
            <UploadProgress />
          </aside>
        )}

        {/* Middle Section - File Grid */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto">
            <FileList />
          </div>
          <div className="border-t border-border">
            <Pagination />
          </div>
        </main>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-8 w-8 text-primary mb-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-foreground">Loading...</p>
          </div>
        </div>
      )}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => dispatch({ type: "CLOSE_CREATE_FOLDER_MODAL" })}
        parentFolderId={folderToCreateInId}
        parentFolderCurrentPath={folderToCreateParentPath}
      />
      <UploadFileModal
        isOpen={isUploadFileModalOpen}
        onClose={() => dispatch({ type: "CLOSE_UPLOAD_FILE_MODAL" })}
        parentFolderId={folderToCreateInId}
        parentFolderCurrentPath={folderToCreateParentPath}
      />
    </div>
  );
}
