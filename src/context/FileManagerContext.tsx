import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { fileApi, folderApi, sseApi } from "@/services/api";

export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: string;
  createdAt: string;
  modifiedAt: string;
  path: string; // This will now represent the full path string like "Root/Documents/" or "Root/"
  parentId?: string;
  url?: string;
  children?: FileItem[];
  description?: string;
  mimeType?: string;
}

// New interface for folders displayed in the main grid with counts
export interface FolderItemWithCounts extends FileItem {
  totalChildFolders: number;
  totalChildFiles: number;
}

export interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
}

interface FileManagerState {
  currentPath: string[];
  currentFolderId: string | null; // ID of the currently viewed folder, null for root
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
  isLoading: boolean; // Add loading state
  folderTree: FileItem[]; // For the left folder tree
  rootFolderId: string | null; // To store the ID of the "Root" folder
  totalFiles: number; // For pagination
  totalFolders: number; // New: total folder count
  totalDocuments: number; // New: total document count
  filterByName: string; // New: filter by name
  filterByDescription: string; // New: filter by description
  filterDateFrom: Date | undefined; // New: filter date from
  filterDateTo: Date | undefined; // New: filter date to
  folderToCreateInId: string | null; // New: ID of the folder to create new item in
  folderToCreateParentPath: string[]; // New: Path of the folder where new item is being created
  rootFoldersWithCounts: FolderItemWithCounts[]; // New: For displaying root folders with counts in the main grid
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
  | { type: "SET_FILES"; payload: FileItem[] }
  | { type: "SET_LOADING"; payload: boolean }
  | {
      type: "OPEN_CREATE_FOLDER_MODAL";
      payload: { parentId: string | null; parentPath: string[] };
    }
  | { type: "CLOSE_CREATE_FOLDER_MODAL" }
  | {
      type: "OPEN_UPLOAD_FILE_MODAL";
      payload: { parentId: string | null; parentPath: string[] }; // Updated payload
    }
  | { type: "CLOSE_UPLOAD_FILE_MODAL" }
  | { type: "SET_CURRENT_FOLDER_ID"; payload: string | null }
  | { type: "SET_FOLDER_TREE"; payload: FileItem[] }
  | { type: "SET_ROOT_FOLDER_ID"; payload: string | null }
  | {
      type: "SET_FILES_AND_TOTAL";
      payload: { files: FileItem[]; total: number };
    }
  | {
      type: "SET_COUNTS";
      payload: { totalFolders: number; totalDocuments: number };
    }
  | {
      type: "SET_FILTERS";
      payload: {
        name: string;
        description: string;
        dateFrom: Date | undefined;
        dateTo: Date | undefined;
      };
    }
  | { type: "SET_ROOT_FOLDERS"; payload: FolderItemWithCounts[] };

const initialState: FileManagerState = {
  currentPath: ["Root"],
  currentFolderId: null, // Start with null for root
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
  isLoading: false, // Initial loading state
  folderTree: [],
  rootFolderId: null,
  totalFiles: 0,
  totalFolders: 0, // Initialize to 0
  totalDocuments: 0, // Initialize to 0
  filterByName: "", // Initialize to empty string
  filterByDescription: "", // Initialize to empty string
  filterDateFrom: undefined, // Initialize to undefined
  filterDateTo: undefined, // Initialize to undefined
  folderToCreateInId: null, // Initialize to null
  folderToCreateParentPath: ["Root"], // Initialize with Root path
  rootFoldersWithCounts: [], // Initialize root folders with counts array
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
    case "SET_FILES":
      return { ...state, files: action.payload };
    case "SET_FILES_AND_TOTAL":
      return {
        ...state,
        files: action.payload.files,
        totalFiles: action.payload.total,
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "OPEN_CREATE_FOLDER_MODAL":
      return {
        ...state,
        isCreateFolderModalOpen: true,
        folderToCreateInId: action.payload.parentId, // Set the target parent ID
        folderToCreateParentPath: action.payload.parentPath, // Set the parent path
      };
    case "CLOSE_CREATE_FOLDER_MODAL":
      return {
        ...state,
        isCreateFolderModalOpen: false,
        folderToCreateInId: null, // Clear the target parent ID on close
        folderToCreateParentPath: ["Root"], // Reset parent path on close
      };
    case "OPEN_UPLOAD_FILE_MODAL":
      return {
        ...state,
        isUploadFileModalOpen: true,
        folderToCreateInId: action.payload.parentId, // Set the target parent ID for upload
        folderToCreateParentPath: action.payload.parentPath, // Set parent path
      };
    case "CLOSE_UPLOAD_FILE_MODAL":
      return { ...state, isUploadFileModalOpen: false };
    case "SET_CURRENT_FOLDER_ID":
      return { ...state, currentFolderId: action.payload };
    case "SET_FOLDER_TREE":
      return { ...state, folderTree: action.payload };
    case "SET_ROOT_FOLDER_ID":
      return { ...state, rootFolderId: action.payload };
    case "SET_COUNTS":
      return {
        ...state,
        totalFolders: action.payload.totalFolders,
        totalDocuments: action.payload.totalDocuments,
      };
    case "SET_FILTERS":
      return {
        ...state,
        filterByName: action.payload.name,
        filterByDescription: action.payload.description,
        filterDateFrom: action.payload.dateFrom,
        filterDateTo: action.payload.dateTo,
        currentPage: 1, // Reset to first page on filter change
      };
    case "SET_ROOT_FOLDERS":
      return { ...state, rootFoldersWithCounts: action.payload };
    default:
      return state;
  }
}

interface FileManagerContextType {
  state: FileManagerState;
  dispatch: React.Dispatch<FileManagerAction>;
  navigateToPath: (path: string[], folderId: string | null) => void;
  selectFile: (file: FileItem | null) => void;
  addUpload: (upload: UploadProgress) => void;
  updateUpload: (
    id: string,
    progress: number,
    status: UploadProgress["status"]
  ) => void;
  fetchFiles: () => Promise<void>; // Add fetchFiles to context type
  getCurrentFiles: () => FileItem[];
  getFilteredFiles: () => FileItem[];
  openCreateFolderModal: (parentId: string | null) => void;
  closeCreateFolderModal: () => void;
  openUploadFileModal: (parentId: string | null) => void; // Update signature to accept parentId
  closeUploadFileModal: () => void;
  fetchFolderTree: () => Promise<void>;
  fetchRootFolders: () => Promise<void>; // New function for fetching root folders
  applyFilters: (filters: {
    name: string;
    description: string;
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
  }) => void;
  clearFilters: () => void;
}

const FileManagerContext = createContext<FileManagerContextType | undefined>(
  undefined
);

export function FileManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(fileManagerReducer, initialState);
  const uploadEventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const folderEventSourceRef = useRef<EventSource | null>(null);

  // Helper to check if a value is a valid MongoDB ObjectId (24 hex characters)
  const isValidObjectId = useCallback((value: unknown): value is string => {
    return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
  }, []);

  // Helper to resolve folderId by path - NO LONGER USED, REMOVE OR SIMPLIFY
  // Keeping it for now but it will be removed in next step
  // const resolveFolderIdByPath = (path: string[]): string | null => {
  //   // Simplified logic: find the folder in the tree that matches the path
  //   // This assumes paths are unique and accurately reflect the tree structure
  //   const targetPath = path.join("/") + (path.length > 0 ? "/" : "");
  //   const folder = state.folderTree.find(
  //     (f) => f.type === "folder" && f.path === targetPath
  //   );
  //   return folder ? folder.id : null;
  // };

  const navigateToPath = useCallback(
    (path: string[], folderId: string | null) => {
      dispatch({ type: "SET_CURRENT_PATH", payload: path });
      // Prioritize the provided folderId, if valid
      // const resolvedId = folderId ?? resolveFolderIdByPath(path);
      const resolvedId = folderId; // Directly use the provided folderId
      dispatch({ type: "SET_CURRENT_FOLDER_ID", payload: resolvedId });
    },
    []
  );

  const selectFile = useCallback((file: FileItem | null) => {
    dispatch({ type: "SET_SELECTED_FILE", payload: file });
  }, []);

  const addUpload = useCallback((upload: UploadProgress) => {
    dispatch({ type: "ADD_UPLOAD", payload: upload });

    const eventSource = sseApi.getUploadProgress(upload.id);
    uploadEventSourcesRef.current.set(upload.id, eventSource);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      dispatch({
        type: "UPDATE_UPLOAD",
        payload: {
          id: upload.id,
          progress: data.progress,
          status: data.status,
        },
      });
      if (data.status === "completed" || data.status === "failed") {
        eventSource.close();
        uploadEventSourcesRef.current.delete(upload.id);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error for upload", upload.id, error);
      dispatch({
        type: "UPDATE_UPLOAD",
        payload: { id: upload.id, progress: 0, status: "error" },
      });
      eventSource.close();
      uploadEventSourcesRef.current.delete(upload.id);
    };
  }, []);

  const updateUpload = useCallback(
    (id: string, progress: number, status: UploadProgress["status"]) => {
      dispatch({ type: "UPDATE_UPLOAD", payload: { id, progress, status } });
    },
    []
  );

  const fetchFolderTree = useCallback(async () => {
    try {
      const response = await folderApi.getFolderTree();
      console.log("Raw folder tree response data:", response.data);
      const rootFolder = response.data.find(
        (f: FileItem) => f.parentId === null
      );
      if (rootFolder) {
        dispatch({ type: "SET_ROOT_FOLDER_ID", payload: rootFolder.id });
        // Only set current folder to root if it's currently null (initial load)
        if (state.currentFolderId === null) {
          dispatch({ type: "SET_CURRENT_FOLDER_ID", payload: rootFolder.id });
          dispatch({ type: "SET_CURRENT_PATH", payload: [rootFolder.name] });
        }
      } else {
        // If no root folder, ensure current folder is null
        if (state.currentFolderId !== null) {
          dispatch({ type: "SET_CURRENT_FOLDER_ID", payload: null });
          dispatch({ type: "SET_CURRENT_PATH", payload: ["Root"] });
        }
      }
      dispatch({ type: "SET_FOLDER_TREE", payload: response.data });
    } catch (error) {
      console.error("Error fetching folder tree:", error);
      dispatch({ type: "SET_FOLDER_TREE", payload: [] });
    }
  }, [state.currentFolderId]);

  const fetchFiles = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      // const folderIdParam = isValidObjectId(state.currentFolderId)
      //   ? state.currentFolderId
      //   : undefined;

      let response;
      let combinedContents: FileItem[] = []; // Declare combinedContents
      let totalCombined: number = 0; // Declare totalCombined

      // If there's a search query, use searchFiles
      if (state.searchQuery) {
        response = await fileApi.searchFiles({
          q: state.searchQuery,
          folderId: state.currentFolderId || undefined,
          page: state.currentPage,
          limit: state.itemsPerPage,
          sortBy: state.sortBy === "date" ? "modifiedAt" : state.sortBy,
          sortOrder: state.sortOrder,
        });

        combinedContents = response.data.files || [];
        totalCombined = response.data.pagination?.total || 0;

        dispatch({
          type: "SET_FILES_AND_TOTAL",
          payload: { files: combinedContents, total: totalCombined },
        });
      } else {
        // If currentFolderId is null (homepage/root), fetch root folders with counts.
        if (state.currentFolderId === null) {
          console.log("Fetching root folders for main content area...");
          const rootFoldersResponse = await folderApi.getFolders({
            parentId: null,
            page: state.currentPage,
            limit: state.itemsPerPage,
          });

          const foldersWithCounts: FolderItemWithCounts[] = await Promise.all(
            rootFoldersResponse.data.results.map(async (folder: FileItem) => {
              const [childFoldersCountResponse, childFilesCountResponse] =
                await Promise.all([
                  folderApi.getDirectChildFoldersCount(folder.id),
                  folderApi.getDirectChildFilesCount(folder.id),
                ]);
              return {
                ...folder,
                totalChildFolders: childFoldersCountResponse.data.count,
                totalChildFiles: childFilesCountResponse.data.count,
              };
            })
          );

          dispatch({
            type: "SET_FILES_AND_TOTAL",
            payload: {
              files: foldersWithCounts,
              total: foldersWithCounts.length,
            },
          });
          dispatch({ type: "SET_ROOT_FOLDERS", payload: foldersWithCounts });
          console.log("Dispatched SET_ROOT_FOLDERS with:", foldersWithCounts);
        } else if (isValidObjectId(state.currentFolderId)) {
          // If currentFolderId is set, fetch contents of that specific folder.
          console.log(
            `Fetching contents for folder ID: ${state.currentFolderId}...`
          );
          const folderContentsResponse = await folderApi.getFolderContents(
            state.currentFolderId,
            { page: state.currentPage, limit: state.itemsPerPage }
          );

          const combinedContentsForFolder = [
            ...(folderContentsResponse.data.folders || []),
            ...(folderContentsResponse.data.files || []),
          ];
          const totalCombinedForFolder =
            (folderContentsResponse.data.pagination?.totalFolders || 0) +
            (folderContentsResponse.data.pagination?.totalFiles || 0);

          dispatch({
            type: "SET_FILES_AND_TOTAL",
            payload: {
              files: combinedContentsForFolder,
              total: totalCombinedForFolder,
            },
          });
          // Clear rootFoldersWithCounts when navigating into a specific folder
          dispatch({ type: "SET_ROOT_FOLDERS", payload: [] });
        } else {
          // Fallback if no valid folderId
          console.warn("No valid folder ID to fetch contents for.");
          dispatch({
            type: "SET_FILES_AND_TOTAL",
            payload: { files: [], total: 0 },
          });
          dispatch({ type: "SET_ROOT_FOLDERS", payload: [] });
        }
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
      dispatch({
        type: "SET_FILES_AND_TOTAL",
        payload: { files: [], total: 0 },
      }); // Clear files on error
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [
    state.currentFolderId,
    state.currentPage,
    state.searchQuery,
    state.sortBy,
    state.sortOrder,
    isValidObjectId,
  ]);

  const getCurrentFiles = useCallback((): FileItem[] => {
    // This function will now apply client-side filtering based on advanced filters
    let filtered = state.files;

    if (state.filterByName) {
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(state.filterByName.toLowerCase())
      );
    }
    if (state.filterByDescription) {
      filtered = filtered.filter((file) =>
        file.description
          ?.toLowerCase()
          .includes(state.filterByDescription.toLowerCase())
      );
    }
    if (state.filterDateFrom) {
      filtered = filtered.filter(
        (file) => new Date(file.modifiedAt) >= state.filterDateFrom!
      );
    }
    if (state.filterDateTo) {
      filtered = filtered.filter(
        (file) => new Date(file.modifiedAt) <= state.filterDateTo!
      );
    }
    return filtered;
  }, [
    state.files,
    state.filterByName,
    state.filterByDescription,
    state.filterDateFrom,
    state.filterDateTo,
  ]);

  const getFilteredFiles = getCurrentFiles; // getFilteredFiles now just calls getCurrentFiles

  const openCreateFolderModal = useCallback(
    (targetParentId: string | null = null) => {
      console.log(
        "openCreateFolderModal called with targetParentId:",
        targetParentId
      );
      console.log("Current state.folderTree:", state.folderTree);

      // Determine the parent path based on targetParentId
      let parentPath: string[] = ["Root"];
      if (targetParentId) {
        const parentFolder = state.folderTree.find(
          (f) => f.id === targetParentId
        );
        console.log("Found parentFolder:", parentFolder);
        if (parentFolder && parentFolder.path) {
          // Split and filter for consistency, then append parentFolder.name
          parentPath = parentFolder.path.split("/").filter(Boolean);
        } else if (targetParentId === state.rootFolderId) {
          parentPath = ["Root"];
        }
      }

      console.log("Dispatching OPEN_CREATE_FOLDER_MODAL with:", {
        parentId: targetParentId,
        parentPath,
      });

      dispatch({
        type: "OPEN_CREATE_FOLDER_MODAL",
        payload: { parentId: targetParentId, parentPath: parentPath },
      });
    },
    [state.folderTree, state.rootFolderId]
  );

  const closeCreateFolderModal = useCallback(() => {
    dispatch({ type: "CLOSE_CREATE_FOLDER_MODAL" });
  }, []);

  const openUploadFileModal = useCallback(
    (parentId: string | null = null) => {
      // Resolve the parent path based on parentId
      let parentPath: string[] = ["Root"];
      if (parentId && state.folderTree) {
        const findPath = (
          nodes: FileItem[],
          id: string | null,
          currentPathSegments: string[]
        ): string[] | null => {
          for (const node of nodes) {
            const newPathSegments = [...currentPathSegments, node.name];
            if (node.id === id) {
              return newPathSegments;
            }
            if (node.children) {
              const childPath = findPath(node.children, id, newPathSegments);
              if (childPath) return childPath;
            }
          }
          return null;
        };
        const resolvedPath = findPath(state.folderTree, parentId, []);
        if (resolvedPath) {
          parentPath = resolvedPath;
        }
      }
      dispatch({
        type: "OPEN_UPLOAD_FILE_MODAL",
        payload: { parentId, parentPath },
      });
    },
    [state.folderTree]
  );

  const closeUploadFileModal = useCallback(() => {
    dispatch({ type: "CLOSE_UPLOAD_FILE_MODAL" });
  }, []);

  const applyFilters = useCallback(
    (filters: {
      name: string;
      description: string;
      dateFrom: Date | undefined;
      dateTo: Date | undefined;
    }) => {
      dispatch({ type: "SET_FILTERS", payload: filters });
    },
    []
  );

  const clearFilters = useCallback(() => {
    dispatch({
      type: "SET_FILTERS",
      payload: {
        name: "",
        description: "",
        dateFrom: undefined,
        dateTo: undefined,
      },
    });
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      console.log("Attempting to fetch folder count...");
      const foldersCountResponse = await folderApi.getFoldersCount();
      console.log("Folder count API response:", foldersCountResponse.data);

      console.log("Attempting to fetch file count...");
      const filesCountResponse = await fileApi.getFilesCount();
      console.log("File count API response:", filesCountResponse.data);

      dispatch({
        type: "SET_COUNTS",
        payload: {
          totalFolders: foldersCountResponse.data.count,
          totalDocuments: filesCountResponse.data.count,
        },
      });
    } catch (error) {
      console.error("Error fetching counts:", error);
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        "data" in error.response
      ) {
        console.error("Error response data:", (error.response as any).data);
      }
      if (error && typeof error === "object" && "message" in error) {
        console.error("Error message:", (error as any).message);
      }
      dispatch({
        type: "SET_COUNTS",
        payload: { totalFolders: 0, totalDocuments: 0 },
      });
    }
  }, []);

  const fetchRootFolders = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const rootFoldersResponse = await folderApi.getFolders({
        parentId: null,
        page: state.currentPage,
        limit: state.itemsPerPage,
      });

      const foldersWithCounts: FolderItemWithCounts[] = await Promise.all(
        rootFoldersResponse.data.results.map(async (folder: FileItem) => {
          const [childFoldersCountResponse, childFilesCountResponse] =
            await Promise.all([
              folderApi.getDirectChildFoldersCount(folder.id),
              folderApi.getDirectChildFilesCount(folder.id), // Corrected: Should be folderApi.getDirectChildFilesCount
            ]);
          return {
            ...folder,
            totalChildFolders: childFoldersCountResponse.data.count,
            totalChildFiles: childFilesCountResponse.data.count,
          };
        })
      );

      dispatch({
        type: "SET_FILES_AND_TOTAL",
        payload: { files: foldersWithCounts, total: foldersWithCounts.length },
      });
      dispatch({ type: "SET_ROOT_FOLDERS", payload: foldersWithCounts });
    } catch (error) {
      console.error("Failed to fetch root folders:", error);
      dispatch({
        type: "SET_FILES_AND_TOTAL",
        payload: { files: [], total: 0 },
      });
      dispatch({ type: "SET_ROOT_FOLDERS", payload: [] });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state.currentPage, state.itemsPerPage]);

  useEffect(() => {
    // Initial data fetch on component mount
    fetchFolderTree();
    fetchFiles();
    fetchCounts();
  }, [fetchFolderTree, fetchFiles, fetchCounts]);

  // SSE for folder updates in the current folder
  useEffect(() => {
    if (isValidObjectId(state.currentFolderId)) {
      // Close existing EventSource if open
      if (folderEventSourceRef.current) {
        folderEventSourceRef.current.close();
        console.log(
          "Closed existing folder SSE for folder:",
          state.currentFolderId
        );
      }

      console.log(
        "Connecting to folder SSE for folder:",
        state.currentFolderId
      );
      const eventSource = sseApi.getFolderUpdates(state.currentFolderId);
      folderEventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("SSE Folder Update:", data);
        // Depending on the update type, you might re-fetch files or update a specific item
        fetchFiles(); // Re-fetch files to reflect changes
        fetchFolderTree(); // Re-fetch folder tree to reflect folder structure changes
      };

      eventSource.onerror = (error) => {
        console.error("SSE Error for folder", state.currentFolderId, error);
        // Optionally, dispatch an error state or show a toast
        if (folderEventSourceRef.current) {
          folderEventSourceRef.current.close();
          folderEventSourceRef.current = null;
        }
      };

      return () => {
        if (folderEventSourceRef.current) {
          folderEventSourceRef.current.close();
          folderEventSourceRef.current = null;
          console.log(
            "Cleaned up folder SSE for folder:",
            state.currentFolderId
          );
        }
      };
    } else if (folderEventSourceRef.current) {
      // If currentFolderId becomes null, close any active SSE connection
      folderEventSourceRef.current.close();
      folderEventSourceRef.current = null;
      console.log("Closed folder SSE because currentFolderId is null.");
    }
  }, [state.currentFolderId, fetchFiles, fetchFolderTree, isValidObjectId]); // Added isValidObjectId dependency

  return (
    <FileManagerContext.Provider
      value={{
        state,
        dispatch,
        navigateToPath,
        selectFile,
        addUpload,
        updateUpload,
        fetchFiles,
        getCurrentFiles,
        getFilteredFiles,
        openCreateFolderModal,
        closeCreateFolderModal,
        openUploadFileModal,
        closeUploadFileModal,
        fetchFolderTree,
        fetchRootFolders,
        applyFilters,
        clearFilters,
      }}
    >
      {children}
    </FileManagerContext.Provider>
  );
}

export function useFileManager() {
  const context = useContext(FileManagerContext);
  if (context === undefined) {
    throw new Error("useFileManager must be used within a FileManagerProvider");
  }
  return context;
}

// Utility function to parse size strings
function parseSize(sizeStr: string): number {
  const sizeMap: { [key: string]: number } = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };
  const [value, unit] = sizeStr.split(" ");
  return parseFloat(value) * (sizeMap[unit.toUpperCase()] || 1);
}

// Remove mock data as it's replaced by API calls
// const mockFileData: FileItem[] = [...];
