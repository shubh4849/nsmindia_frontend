import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileManager } from "@/context/FileManagerContext";
import { Breadcrumb } from "@/components/TopSection/Breadcrumb";
import { ActionMenu } from "@/components/TopSection/ActionMenu";
import { SearchFilter } from "@/components/TopSection/SearchFilter";
import { FolderTree } from "@/components/LeftSection/FolderTree";
import { UploadProgress } from "@/components/LeftSection/UploadProgress";
import { SummaryCounters } from "@/components/LeftSection/SummaryCounters"; // Import the new component
import { FileList } from "@/components/MiddleSection/FileGrid"; // Renamed from FileGrid
import { Pagination } from "@/components/MiddleSection/Pagination";
import { DocumentViewer } from "@/components/RightSection/DocumentViewer";
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
    folderToCreateParentPath, // Destructure the new state variable
  } = state;

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
            <SummaryCounters /> {/* Add SummaryCounters here */}
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
        {/* <aside className="w-96 border-l border-border">
          <DocumentViewer />
        </aside> */}
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
        parentFolderCurrentPath={folderToCreateParentPath} // Pass the new prop
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
