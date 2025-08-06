import React, { createContext, useContext, useReducer, ReactNode } from "react";

export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: string;
  createdAt: string;
  modifiedAt: string;
  path: string;
  parentId?: string;
  url?: string;
  children?: FileItem[];
  description?: string;
  mimeType?: string;
}

export interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
}

interface FileManagerState {
  currentPath: string[];
  selectedFile: FileItem | null;
  files: FileItem[];
  searchQuery: string;
  uploads: UploadProgress[];
  isLeftPanelOpen: boolean;
  currentPage: number;
  itemsPerPage: number;
  sortBy: "name" | "date" | "size";
  sortOrder: "asc" | "desc";
  expandedFolders: Set<string>;
  isCreateFolderModalOpen: boolean;
  isUploadFileModalOpen: boolean;
}

type FileManagerAction =
  | { type: "SET_CURRENT_PATH"; payload: string[] }
  | { type: "SET_SELECTED_FILE"; payload: FileItem | null }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "ADD_UPLOAD"; payload: UploadProgress }
  | {
      type: "UPDATE_UPLOAD";
      payload: {
        id: string;
        progress: number;
        status: UploadProgress["status"];
      };
    }
  | { type: "REMOVE_UPLOAD"; payload: string }
  | { type: "TOGGLE_LEFT_PANEL" }
  | { type: "SET_CURRENT_PAGE"; payload: number }
  | {
      type: "SET_SORT";
      payload: {
        sortBy: FileManagerState["sortBy"];
        sortOrder: FileManagerState["sortOrder"];
      };
    }
  | { type: "TOGGLE_FOLDER_EXPANSION"; payload: string }
  | { type: "ADD_FILE"; payload: FileItem }
  | { type: "ADD_FOLDER"; payload: FileItem }
  | { type: "OPEN_CREATE_FOLDER_MODAL" }
  | { type: "CLOSE_CREATE_FOLDER_MODAL" }
  | { type: "OPEN_UPLOAD_FILE_MODAL" }
  | { type: "CLOSE_UPLOAD_FILE_MODAL" };

const initialState: FileManagerState = {
  currentPath: ["Root"],
  selectedFile: null,
  files: [],
  searchQuery: "",
  uploads: [],
  isLeftPanelOpen: true,
  currentPage: 1,
  itemsPerPage: 10,
  sortBy: "name",
  sortOrder: "asc",
  expandedFolders: new Set(["root"]),
  isCreateFolderModalOpen: false,
  isUploadFileModalOpen: false,
};

function fileManagerReducer(
  state: FileManagerState,
  action: FileManagerAction
): FileManagerState {
  switch (action.type) {
    case "SET_CURRENT_PATH":
      return { ...state, currentPath: action.payload, currentPage: 1 };
    case "SET_SELECTED_FILE":
      return { ...state, selectedFile: action.payload };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload, currentPage: 1 };
    case "ADD_UPLOAD":
      return { ...state, uploads: [...state.uploads, action.payload] };
    case "UPDATE_UPLOAD":
      return {
        ...state,
        uploads: state.uploads.map((upload) =>
          upload.id === action.payload.id
            ? {
                ...upload,
                progress: action.payload.progress,
                status: action.payload.status,
              }
            : upload
        ),
      };
    case "REMOVE_UPLOAD":
      return {
        ...state,
        uploads: state.uploads.filter((upload) => upload.id !== action.payload),
      };
    case "TOGGLE_LEFT_PANEL":
      return { ...state, isLeftPanelOpen: !state.isLeftPanelOpen };
    case "SET_CURRENT_PAGE":
      return { ...state, currentPage: action.payload };
    case "SET_SORT":
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder,
      };
    case "TOGGLE_FOLDER_EXPANSION":
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return { ...state, expandedFolders: newExpanded };
    case "ADD_FILE":
      return { ...state, files: [...state.files, action.payload] };
    case "ADD_FOLDER":
      return { ...state, files: [...state.files, action.payload] };
    case "OPEN_CREATE_FOLDER_MODAL":
      return { ...state, isCreateFolderModalOpen: true };
    case "CLOSE_CREATE_FOLDER_MODAL":
      return { ...state, isCreateFolderModalOpen: false };
    case "OPEN_UPLOAD_FILE_MODAL":
      return { ...state, isUploadFileModalOpen: true };
    case "CLOSE_UPLOAD_FILE_MODAL":
      return { ...state, isUploadFileModalOpen: false };
    default:
      return state;
  }
}

interface FileManagerContextType {
  state: FileManagerState;
  dispatch: React.Dispatch<FileManagerAction>;
  navigateToPath: (path: string[]) => void;
  selectFile: (file: FileItem | null) => void;
  addUpload: (upload: UploadProgress) => void;
  updateUpload: (
    id: string,
    progress: number,
    status: UploadProgress["status"]
  ) => void;
  getCurrentFiles: () => FileItem[];
  getFilteredFiles: () => FileItem[];
  openCreateFolderModal: () => void;
  closeCreateFolderModal: () => void;
  openUploadFileModal: () => void;
  closeUploadFileModal: () => void;
}

const FileManagerContext = createContext<FileManagerContextType | undefined>(
  undefined
);

export function FileManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(fileManagerReducer, initialState);

  const navigateToPath = (path: string[]) => {
    dispatch({ type: "SET_CURRENT_PATH", payload: path });
  };

  const selectFile = (file: FileItem | null) => {
    dispatch({ type: "SET_SELECTED_FILE", payload: file });
  };

  const addUpload = (upload: UploadProgress) => {
    dispatch({ type: "ADD_UPLOAD", payload: upload });
  };

  const updateUpload = (
    id: string,
    progress: number,
    status: UploadProgress["status"]
  ) => {
    dispatch({ type: "UPDATE_UPLOAD", payload: { id, progress, status } });
  };

  const getCurrentFiles = (): FileItem[] => {
    // Mock file data - in real app, this would come from API
    return mockFileData.filter((file) => {
      const pathMatches =
        file.path === state.currentPath.join("/") ||
        (state.currentPath.length === 1 &&
          state.currentPath[0] === "Root" &&
          file.path === "");
      return pathMatches;
    });
  };

  const getFilteredFiles = (): FileItem[] => {
    let files = getCurrentFiles();

    // Apply search filter
    if (state.searchQuery) {
      files = files.filter(
        (file) =>
          file.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          file.description
            ?.toLowerCase()
            .includes(state.searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    files.sort((a, b) => {
      let comparison = 0;
      switch (state.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "date":
          comparison =
            new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
        case "size":
          const sizeA = a.size ? parseSize(a.size) : 0;
          const sizeB = b.size ? parseSize(b.size) : 0;
          comparison = sizeA - sizeB;
          break;
      }
      return state.sortOrder === "asc" ? comparison : -comparison;
    });

    return files;
  };

  const openCreateFolderModal = () => {
    dispatch({ type: "OPEN_CREATE_FOLDER_MODAL" });
  };

  const closeCreateFolderModal = () => {
    dispatch({ type: "CLOSE_CREATE_FOLDER_MODAL" });
  };

  const openUploadFileModal = () => {
    dispatch({ type: "OPEN_UPLOAD_FILE_MODAL" });
  };

  const closeUploadFileModal = () => {
    dispatch({ type: "CLOSE_UPLOAD_FILE_MODAL" });
  };

  const value: FileManagerContextType = {
    state,
    dispatch,
    navigateToPath,
    selectFile,
    addUpload,
    updateUpload,
    getCurrentFiles,
    getFilteredFiles,
    openCreateFolderModal,
    closeCreateFolderModal,
    openUploadFileModal,
    closeUploadFileModal,
  };

  return (
    <FileManagerContext.Provider value={value}>
      {children}
    </FileManagerContext.Provider>
  );
}

export function useFileManager() {
  const context = useContext(FileManagerContext);
  if (!context) {
    throw new Error("useFileManager must be used within a FileManagerProvider");
  }
  return context;
}

// Utility function to parse size strings
function parseSize(sizeStr: string): number {
  const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^([\d.]+)\s*([A-Z]+)$/);
  if (!match) return 0;
  const [, num, unit] = match;
  return parseFloat(num) * (units[unit as keyof typeof units] || 1);
}

// Mock data
const mockFileData: FileItem[] = [
  {
    id: "folder-1",
    name: "Documents",
    type: "folder",
    createdAt: "2024-01-15T10:00:00Z",
    modifiedAt: "2024-01-20T14:30:00Z",
    path: "",
    description: "Important documents and files",
  },
  {
    id: "folder-2",
    name: "Projects",
    type: "folder",
    createdAt: "2024-01-10T09:00:00Z",
    modifiedAt: "2024-01-25T16:45:00Z",
    path: "",
    description: "Active project files",
  },
  {
    id: "folder-3",
    name: "Media",
    type: "folder",
    createdAt: "2024-01-05T08:00:00Z",
    modifiedAt: "2024-01-18T12:15:00Z",
    path: "",
    description: "Images, videos, and other media",
  },
  {
    id: "file-1",
    name: "Annual Report 2024.pdf",
    type: "file",
    size: "2.4 MB",
    createdAt: "2024-01-15T10:30:00Z",
    modifiedAt: "2024-01-15T10:30:00Z",
    path: "Documents",
    mimeType: "application/pdf",
    url: "/mock-files/annual-report.pdf",
    description: "Company annual report for 2024",
  },
  {
    id: "file-2",
    name: "Meeting Notes.docx",
    type: "file",
    size: "156 KB",
    createdAt: "2024-01-20T14:00:00Z",
    modifiedAt: "2024-01-20T14:30:00Z",
    path: "Documents",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    description: "Weekly team meeting notes",
  },
  {
    id: "file-3",
    name: "Project Proposal.pdf",
    type: "file",
    size: "1.8 MB",
    createdAt: "2024-01-12T11:00:00Z",
    modifiedAt: "2024-01-12T11:00:00Z",
    path: "Projects",
    mimeType: "application/pdf",
    url: "/mock-files/project-proposal.pdf",
    description: "New project proposal document",
  },
  {
    id: "file-4",
    name: "Design Assets.zip",
    type: "file",
    size: "45.7 MB",
    createdAt: "2024-01-25T16:45:00Z",
    modifiedAt: "2024-01-25T16:45:00Z",
    path: "Projects",
    mimeType: "application/zip",
    description: "UI/UX design assets and mockups",
  },
  {
    id: "file-5",
    name: "Company Logo.png",
    type: "file",
    size: "245 KB",
    createdAt: "2024-01-05T08:30:00Z",
    modifiedAt: "2024-01-05T08:30:00Z",
    path: "Media",
    mimeType: "image/png",
    url: "/mock-files/logo.png",
    description: "Official company logo in PNG format",
  },
  {
    id: "file-6",
    name: "Presentation Video.mp4",
    type: "file",
    size: "89.3 MB",
    createdAt: "2024-01-18T12:15:00Z",
    modifiedAt: "2024-01-18T12:15:00Z",
    path: "Media",
    mimeType: "video/mp4",
    description: "Product presentation video",
  },
];
