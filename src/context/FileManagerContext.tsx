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
  path: string;
  parentId?: string;
  url?: string;
  publicViewUrl?: string;
  filePath?: string;
  children?: FileItem[];
  description?: string;
  mimeType?: string;
}

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
  filterByDescription: string; // New: filter by description
  filterDateFrom: Date | undefined; // New: filter date from
  filterDateTo: Date | undefined; // New: filter date to
  folderToCreateInId: string | null; // New: ID of the folder to create new item in
  folderToCreateParentPath: string[]; // New: Path of the folder where new item is being created
  rootFoldersWithCounts: FolderItemWithCounts[]; // New: For displaying root folders with counts in the main grid
  // Main table inline expansion state
  mainExpandedIds: Set<string>;
  mainChildrenByParent: Record<string, FileItem[]>;
  selectedMainFolderId: string | null;
  isSearchMode: boolean;
  folderMetaById: Record<string, { name: string; parentId: string | null }>;
  // Preview dialog state
  isPreviewDialogOpen: boolean;
}

type FileManagerAction =
  | { type: "SET_CURRENT_PATH"; payload: string[] }
  | { type: "SET_SELECTED_FILE"; payload: FileItem | null }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_SEARCH_MODE"; payload: boolean }
  | {
      type: "MERGE_FOLDER_META";
      payload: Record<string, { name: string; parentId: string | null }>;
    }
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
      payload: { parentId: string | null; parentPath: string[] };
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
  | { type: "SET_ROOT_FOLDERS"; payload: FolderItemWithCounts[] }
  | {
      type: "SET_FOLDER_CHILDREN";
      payload: { parentId: string; children: FileItem[] };
    }
  // Preview dialog actions
  | { type: "OPEN_PREVIEW_DIALOG"; payload: FileItem }
  | { type: "CLOSE_PREVIEW_DIALOG" }
  // Main view and optimistic actions
  | { type: "TOGGLE_MAIN_EXPAND"; payload: string }
  | {
      type: "SET_MAIN_CHILDREN";
      payload: { parentId: string; children: FileItem[] };
    }
  | { type: "SET_SELECTED_MAIN_FOLDER"; payload: string | null }
  | { type: "CLEAR_MAIN_EXPANSIONS" }
  | {
      type: "OPTIMISTIC_ADD_CHILD";
      payload: { parentId: string | null; child: FileItem };
    }
  | {
      type: "OPTIMISTIC_ADD_TREE_CHILD";
      payload: { parentId: string | null; child: FileItem };
    }
  | {
      type: "OPTIMISTIC_REMOVE_CHILD";
      payload: { parentId: string | null; id: string };
    }
  | {
      type: "OPTIMISTIC_REMOVE_TREE_CHILD";
      payload: { parentId: string | null; id: string };
    }
  | {
      type: "ADJUST_FOLDER_COUNTS";
      payload: { folderId: string; deltaFolders?: number; deltaFiles?: number };
    };

const initialState: FileManagerState = {
  currentPath: ["Root"],
  currentFolderId: null,
  selectedFile: null,
  files: [],
  searchQuery: "",
  uploads: [],
  isLeftPanelOpen: true,
  currentPage: 1,
  itemsPerPage: 10,
  sortBy: "date",
  sortOrder: "asc",
  expandedFolders: new Set(["root"]),
  isCreateFolderModalOpen: false,
  isUploadFileModalOpen: false,
  isLoading: false,
  folderTree: [],
  rootFolderId: null,
  totalFiles: 0,
  totalFolders: 0,
  totalDocuments: 0,
  filterByDescription: "",
  filterDateFrom: undefined,
  filterDateTo: undefined,
  folderToCreateInId: null,
  folderToCreateParentPath: ["Root"],
  rootFoldersWithCounts: [],
  mainExpandedIds: new Set<string>(),
  mainChildrenByParent: {},
  selectedMainFolderId: null,
  isSearchMode: false,
  folderMetaById: {},
  isPreviewDialogOpen: false,
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
    case "SET_SEARCH_MODE":
      return { ...state, isSearchMode: action.payload };
    case "MERGE_FOLDER_META": {
      const next = { ...state.folderMetaById };
      for (const [id, meta] of Object.entries(action.payload)) {
        next[id] = meta;
      }
      return { ...state, folderMetaById: next };
    }
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
        folderToCreateInId: action.payload.parentId,
        folderToCreateParentPath: action.payload.parentPath,
      };
    case "CLOSE_CREATE_FOLDER_MODAL":
      return {
        ...state,
        isCreateFolderModalOpen: false,
        folderToCreateInId: null,
        folderToCreateParentPath: ["Root"],
      };
    case "OPEN_UPLOAD_FILE_MODAL":
      return {
        ...state,
        isUploadFileModalOpen: true,
        folderToCreateInId: action.payload.parentId,
        folderToCreateParentPath: action.payload.parentPath,
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
        filterByDescription: action.payload.description,
        filterDateFrom: action.payload.dateFrom,
        filterDateTo: action.payload.dateTo,
        currentPage: 1,
      };
    case "SET_ROOT_FOLDERS":
      return { ...state, rootFoldersWithCounts: action.payload };
    case "SET_FOLDER_CHILDREN": {
      const updateChildren = (nodes: FileItem[]): FileItem[] =>
        nodes.map((n) => {
          if (n.id === action.payload.parentId) {
            return { ...n, children: action.payload.children };
          }
          if (n.children && n.children.length > 0) {
            return { ...n, children: updateChildren(n.children) };
          }
          return n;
        });
      return { ...state, folderTree: updateChildren(state.folderTree) };
    }
    case "OPEN_PREVIEW_DIALOG":
      return {
        ...state,
        selectedFile: action.payload,
        isPreviewDialogOpen: true,
      };
    case "CLOSE_PREVIEW_DIALOG":
      return { ...state, isPreviewDialogOpen: false };
    case "TOGGLE_MAIN_EXPAND": {
      const newSet = new Set(state.mainExpandedIds);
      if (newSet.has(action.payload)) newSet.delete(action.payload);
      else newSet.add(action.payload);
      return { ...state, mainExpandedIds: newSet };
    }
    case "SET_MAIN_CHILDREN": {
      const next = { ...state.mainChildrenByParent };
      next[action.payload.parentId] = action.payload.children;
      return { ...state, mainChildrenByParent: next };
    }
    case "OPTIMISTIC_ADD_CHILD": {
      const { parentId, child } = action.payload;
      const next = { ...state.mainChildrenByParent };
      const key = parentId ?? "__root__";
      const existing = next[key] || [];
      next[key] = [...existing, child];

      let rootFoldersWithCounts = state.rootFoldersWithCounts;
      if (!parentId && child.type === "folder") {
        rootFoldersWithCounts = [
          ...state.rootFoldersWithCounts,
          { ...(child as any), totalChildFolders: 0, totalChildFiles: 0 },
        ];
      }
      return { ...state, mainChildrenByParent: next, rootFoldersWithCounts };
    }
    case "OPTIMISTIC_ADD_TREE_CHILD": {
      const { parentId, child } = action.payload;
      const addToTree = (nodes: FileItem[]): FileItem[] =>
        nodes.map((n) => {
          if (n.id === parentId) {
            const kids = n.children || [];
            return { ...n, children: [...kids, child] };
          }
          if (n.children && n.children.length > 0) {
            return { ...n, children: addToTree(n.children) };
          }
          return n;
        });

      const updatedTree = parentId
        ? addToTree(state.folderTree)
        : [...state.folderTree, child];
      return { ...state, folderTree: updatedTree };
    }
    case "OPTIMISTIC_REMOVE_CHILD": {
      const { parentId, id } = action.payload;
      const next = { ...state.mainChildrenByParent };
      const key = parentId ?? "__root__";
      next[key] = (next[key] || []).filter((c) => c.id !== id);
      let rootFoldersWithCounts = state.rootFoldersWithCounts;
      if (!parentId) {
        rootFoldersWithCounts = state.rootFoldersWithCounts.filter(
          (f) => f.id !== id
        );
      }
      return { ...state, mainChildrenByParent: next, rootFoldersWithCounts };
    }
    case "OPTIMISTIC_REMOVE_TREE_CHILD": {
      const { parentId, id } = action.payload;
      const removeFromTree = (nodes: FileItem[]): FileItem[] =>
        nodes
          .map((n) => {
            if (n.children && n.children.length > 0) {
              const filtered = n.children.filter((c) => c.id !== id);
              return { ...n, children: removeFromTree(filtered) };
            }
            return n;
          })
          .filter((n) => n.id !== id);
      const newTree = removeFromTree(state.folderTree);
      return { ...state, folderTree: newTree };
    }
    case "ADJUST_FOLDER_COUNTS": {
      const { folderId, deltaFolders = 0, deltaFiles = 0 } = action.payload;

      const updatedRoot = state.rootFoldersWithCounts.map((f) =>
        f.id === folderId
          ? {
              ...f,
              totalChildFolders: Math.max(
                0,
                ((f as any).totalChildFolders ?? 0) + deltaFolders
              ),
              totalChildFiles: Math.max(
                0,
                ((f as any).totalChildFiles ?? 0) + deltaFiles
              ),
            }
          : f
      );

      const updatedChildren: Record<string, FileItem[]> = {};
      for (const [pid, list] of Object.entries(state.mainChildrenByParent)) {
        updatedChildren[pid] = (list || []).map((it: any) =>
          it.id === folderId && it.type === "folder"
            ? {
                ...it,
                totalChildFolders: Math.max(
                  0,
                  (it.totalChildFolders ?? 0) + deltaFolders
                ),
                totalChildFiles: Math.max(
                  0,
                  (it.totalChildFiles ?? 0) + deltaFiles
                ),
              }
            : it
        );
      }
      return {
        ...state,
        rootFoldersWithCounts: updatedRoot,
        mainChildrenByParent: updatedChildren,
      };
    }
    case "SET_SELECTED_MAIN_FOLDER":
      return { ...state, selectedMainFolderId: action.payload };
    case "CLEAR_MAIN_EXPANSIONS":
      return {
        ...state,
        selectedMainFolderId: null,
        mainExpandedIds: new Set<string>(),
      };
    default:
      return state;
  }
}

interface FileManagerContextType {
  state: FileManagerState;
  dispatch: React.Dispatch<FileManagerAction>;
  navigateToPath: (path: string[], folderId: string | null) => void;
  setBreadcrumbOnly: (segments: string[]) => void;
  selectFile: (file: FileItem | null) => void;
  addUpload: (upload: UploadProgress) => void;
  updateUpload: (
    id: string,
    progress: number,
    status: UploadProgress["status"]
  ) => void;
  fetchFiles: () => Promise<void>;
  getCurrentFiles: () => FileItem[];
  getFilteredFiles: () => FileItem[];
  openCreateFolderModal: (parentId: string | null) => void;
  closeCreateFolderModal: () => void;
  openUploadFileModal: (parentId: string | null) => void;
  closeUploadFileModal: () => void;
  fetchFolderTree: () => Promise<void>;
  fetchFolderChildren: (parentId: string) => Promise<void>;
  fetchMainChildren: (parentId: string) => Promise<void>;
  toggleMainExpand: (folderId: string) => void;
  selectMainFolder: (folderId: string | null) => void;
  fetchRootFolders: () => Promise<void>;
  applyFilters: (filters: {
    name: string;
    description: string;
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
  }) => void;
  clearFilters: () => void;
  setBreadcrumbPath: (segments: string[]) => void;
  clearMainExploration: () => void;
  getPathSegmentsFor: (folderId: string | null) => string[];
  setBreadcrumbToFolderId: (folderId: string) => void;

  optimisticAddChild: (parentId: string | null, child: FileItem) => void;
  optimisticAddTreeChild: (parentId: string | null, child: FileItem) => void;
  revalidateQuietly: (parentId: string | null) => void;
  optimisticRemoveChild: (parentId: string | null, id: string) => void;
  optimisticRemoveTreeChild: (parentId: string | null, id: string) => void;
  adjustFolderCounts: (
    folderId: string,
    deltaFolders?: number,
    deltaFiles?: number
  ) => void;
  revealFolderInMain: (folderId: string) => Promise<void>;
  revealFolderInTree: (folderId: string) => Promise<void>;
  runUnifiedSearch: (params: {
    q?: string;
    name?: string;
    description?: string;
    dateFrom?: string;
    dateTo?: string;
    folderId?: string | null;
    page?: number;
    limit?: number;
    includeChildCounts?: boolean;
  }) => Promise<void>;
  // Preview controls
  openPreview: (file: FileItem) => void;
  closePreview: () => void;
  // Deterministic collapse helpers
  collapseFolderInTree: (folderId: string) => void;
  collapseFolderInMain: (folderId: string) => void;
}

const FileManagerContext = createContext<FileManagerContextType | undefined>(
  undefined
);

export function FileManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(fileManagerReducer, initialState);
  const uploadEventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const folderEventSourceRef = useRef<EventSource | null>(null);
  const revalidateTimersRef = useRef<Map<string, number>>(new Map());

  const isValidObjectId = useCallback((value: unknown): value is string => {
    return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
  }, []);

  const navigateToPath = useCallback(
    (path: string[], folderId: string | null) => {
      console.log(
        "[navigateToPath] setting path:",
        path,
        "folderId:",
        folderId
      );
      dispatch({ type: "SET_CURRENT_PATH", payload: path });
      // Prioritize the provided folderId, if valid
      // const resolvedId = folderId ?? resolveFolderIdByPath(path);
      const resolvedId = folderId; // Directly use the provided folderId
      dispatch({ type: "SET_CURRENT_FOLDER_ID", payload: resolvedId });
    },
    []
  );

  // Compute breadcrumb segments from folderMetaById
  const getPathSegmentsFor = useCallback(
    (folderId: string | null): string[] => {
      if (!folderId) return ["Root"];
      const names: string[] = [];
      let cursor: string | null = folderId;
      let guard = 0;
      while (cursor && guard < 100) {
        const meta = (state.folderMetaById as any)[cursor];
        if (!meta) break;
        names.push(meta.name);
        cursor = meta.parentId;
        guard += 1;
      }
      return ["Root", ...names.reverse()];
    },
    [state.folderMetaById]
  );

  const setBreadcrumbToFolderId = useCallback(
    (folderId: string) => {
      const segs = getPathSegmentsFor(folderId);
      navigateToPath(segs, folderId);
    },
    [getPathSegmentsFor, navigateToPath]
  );

  const setBreadcrumbOnly = useCallback((segments: string[]) => {
    dispatch({ type: "SET_CURRENT_PATH", payload: segments });
  }, []);

  const selectFile = useCallback((file: FileItem | null) => {
    dispatch({ type: "SET_SELECTED_FILE", payload: file });
  }, []);

  const addUpload = useCallback((upload: UploadProgress) => {
    dispatch({ type: "ADD_UPLOAD", payload: upload });

    console.log("[SSE upload start] opening EventSource for", upload.id);
    const eventSource = sseApi.getUploadProgress(upload.id);
    uploadEventSourcesRef.current.set(upload.id, eventSource);

    eventSource.onopen = () => {
      console.log("[SSE upload open]", upload.id);
    };

    eventSource.addEventListener("message", (event: MessageEvent) => {
      try {
        const data = JSON.parse((event as any).data);
        console.log("[SSE upload message(event)]", upload.id, data);
      } catch {}
    });

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("[SSE upload message]", upload.id, data);
      dispatch({
        type: "UPDATE_UPLOAD",
        payload: {
          id: upload.id,
          progress: data.progress,
          status: data.status === "failed" ? "error" : data.status,
        },
      });
      const terminal = data.status === "completed" || data.status === "failed";
      if (terminal) {
        eventSource.close();
        uploadEventSourcesRef.current.delete(upload.id);
      }
    };

    eventSource.addEventListener("timeout", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data || "{}");
        console.warn("[SSE upload timeout]", upload.id, data);

        dispatch({
          type: "UPDATE_UPLOAD",
          payload: {
            id: upload.id,
            progress: typeof data.progress === "number" ? data.progress : 0,
            status: "uploading",
          },
        });
      } catch {
        console.warn("[SSE upload timeout parse error]", upload.id);
        dispatch({
          type: "UPDATE_UPLOAD",
          payload: { id: upload.id, progress: 0, status: "uploading" },
        });
      }
    });

    eventSource.addEventListener("connected", () => {
      console.log("[SSE upload connected]", upload.id);

      dispatch({
        type: "UPDATE_UPLOAD",
        payload: { id: upload.id, progress: 0, status: "uploading" },
      });
    });
    eventSource.addEventListener("ping", () => {
      console.log("[SSE upload ping]", upload.id);
    });

    eventSource.onerror = (error) => {
      console.warn("SSE closed or errored for upload", upload.id, error);

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
      const raw = response.data as any;
      const tree: FileItem[] = Array.isArray(raw)
        ? raw
        : raw?.results || raw?.tree || raw?.folders || raw?.data || [];
      // Merge meta from tree
      const meta: Record<string, { name: string; parentId: string | null }> =
        {};
      const collect = (nodes: any[]) => {
        for (const n of nodes || []) {
          if (n && n.id)
            meta[n.id] = {
              name: n.name,
              parentId: (n as any).parentId ?? null,
            };
          if (n.children) collect(n.children);
        }
      };
      collect(tree as any);
      dispatch({ type: "MERGE_FOLDER_META", payload: meta });

      const rootFolder = Array.isArray(tree)
        ? tree.find(
            (f: any) => f && (f.parentId === null || f.parentId === undefined)
          )
        : null;
      if (rootFolder) {
        dispatch({
          type: "SET_ROOT_FOLDER_ID",
          payload: (rootFolder as any).id,
        });

        if (!state.currentPath || state.currentPath.length === 0) {
          dispatch({ type: "SET_CURRENT_PATH", payload: ["Root"] });
        }
      } else {
        if (state.currentFolderId !== null) {
          dispatch({ type: "SET_CURRENT_FOLDER_ID", payload: null });
          dispatch({ type: "SET_CURRENT_PATH", payload: ["Root"] });
        }
      }
      dispatch({ type: "SET_FOLDER_TREE", payload: tree });
    } catch (error) {
      console.error("Error fetching folder tree:", error);
      dispatch({ type: "SET_FOLDER_TREE", payload: [] });
    }
  }, [state.currentFolderId]);

  const fetchFiles = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_SEARCH_MODE", payload: false });
    try {
      let response;
      let combinedContents: FileItem[] = [];
      let totalCombined: number = 0;

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
        if (state.currentFolderId === null) {
          console.log(
            "Fetching root contents (folders + files) for main content area..."
          );
          const rootContents = await folderApi.getRootContents({
            page: state.currentPage,
            limit: state.itemsPerPage,
          });

          // Enrich folders with direct child counts (like other views)
          const foldersRaw = rootContents.data.folders || [];
          const foldersWithCounts: FolderItemWithCounts[] = await Promise.all(
            foldersRaw.map(async (f: any) => {
              try {
                const [cf, cfi] = await Promise.all([
                  folderApi.getDirectChildFoldersCount(f.id || f._id),
                  folderApi.getDirectChildFilesCount(f.id || f._id),
                ]);
                return {
                  ...(f as any),
                  id: f.id || f._id,
                  type: "folder",
                  totalChildFolders: cf.data.count ?? 0,
                  totalChildFiles: cfi.data.count ?? 0,
                } as FolderItemWithCounts;
              } catch {
                return {
                  ...(f as any),
                  id: f.id || f._id,
                  type: "folder",
                  totalChildFolders: 0,
                  totalChildFiles: 0,
                } as FolderItemWithCounts;
              }
            })
          );
          // Merge meta from root folders
          const meta: Record<
            string,
            { name: string; parentId: string | null }
          > = {};
          for (const f of foldersWithCounts as any[])
            meta[f.id] = { name: f.name, parentId: f.parentId ?? null };
          dispatch({ type: "MERGE_FOLDER_META", payload: meta });

          dispatch({
            type: "SET_FILES_AND_TOTAL",
            payload: {
              files: foldersWithCounts as unknown as FileItem[],
              total:
                rootContents.data.pagination?.totalFolders ||
                foldersWithCounts.length,
            },
          });
          dispatch({ type: "SET_ROOT_FOLDERS", payload: foldersWithCounts });
        } else if (isValidObjectId(state.currentFolderId)) {
          // If currentFolderId is set, fetch contents of that specific folder.
          console.log(
            `Fetching contents for folder ID: ${state.currentFolderId}...`
          );
          const folderContentsResponse = await folderApi.getFolderContents(
            state.currentFolderId,
            { page: state.currentPage, limit: state.itemsPerPage }
          );

          const mappedFolders: FileItem[] = (
            folderContentsResponse.data.folders || []
          ).map((f: any) => ({
            ...f,
            type: "folder",
          }));
          // Merge meta from children folders
          const meta: Record<
            string,
            { name: string; parentId: string | null }
          > = {};
          for (const f of mappedFolders as any[])
            meta[(f as any).id || (f as any)._id] = {
              name: f.name,
              parentId: (f as any).parentId ?? null,
            };
          dispatch({ type: "MERGE_FOLDER_META", payload: meta });

          const mappedFiles: FileItem[] = (
            folderContentsResponse.data.files || []
          ).map((f: any) => ({
            ...f,
            type: "file",
          }));
          const combinedContentsForFolder = [...mappedFolders, ...mappedFiles];
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

          dispatch({ type: "SET_ROOT_FOLDERS", payload: [] });
        } else {
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
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [
    state.currentFolderId,
    state.currentPage,
    state.itemsPerPage,
    state.searchQuery,
    state.sortBy,
    state.sortOrder,
    isValidObjectId,
  ]);

  const getCurrentFiles = useCallback((): FileItem[] => {
    let filtered = state.files;

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
    state.filterByDescription,
    state.filterDateFrom,
    state.filterDateTo,
  ]);

  const getFilteredFiles = getCurrentFiles;

  const openCreateFolderModal = useCallback(
    (targetParentId: string | null = null) => {
      console.log(
        "openCreateFolderModal called with targetParentId:",
        targetParentId
      );
      console.log("Current state.folderTree:", state.folderTree);

      let parentPath: string[] = ["Root"];
      if (targetParentId) {
        const parentFolder = state.folderTree.find(
          (f) => f.id === targetParentId
        );
        console.log("Found parentFolder:", parentFolder);
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
        const resolved = findPath(state.folderTree, targetParentId, []);
        if (resolved) parentPath = resolved;
        if (targetParentId === state.rootFolderId) {
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

  const fetchFolderChildren = useCallback(async (parentId: string) => {
    try {
      const res = await folderApi.getFolderContents(parentId, {
        page: 1,
        limit: 200,
      });
      const childFolders: FileItem[] = (res.data.folders || []).map(
        (f: any) => ({
          ...f,
          type: "folder",
        })
      );
      const childFiles: FileItem[] = (res.data.files || []).map((f: any) => ({
        ...f,
        id: f.id || f._id,
        type: "file",
      }));
      const combinedChildren: FileItem[] = [...childFolders, ...childFiles];
      dispatch({
        type: "SET_FOLDER_CHILDREN",
        payload: { parentId, children: combinedChildren },
      });
    } catch (e) {
      console.error("Failed to fetch folder children for tree:", parentId, e);
      dispatch({
        type: "SET_FOLDER_CHILDREN",
        payload: { parentId, children: [] },
      });
    }
  }, []);

  const fetchMainChildren = useCallback(async (parentId: string) => {
    try {
      // Use contents endpoint as requested
      const res = await folderApi.getFolderContents(parentId, {
        page: 1,
        limit: 200,
      });
      const foldersRaw = res.data.folders || [];
      // Enrich folders with direct child counts
      const foldersWithCounts: FileItem[] = await Promise.all(
        foldersRaw.map(async (f: any) => {
          try {
            const [cf, cfi] = await Promise.all([
              folderApi.getDirectChildFoldersCount(f.id || f._id),
              folderApi.getDirectChildFilesCount(f.id || f._id),
            ]);
            return {
              ...f,
              id: f.id || f._id,
              type: "folder",
              totalChildFolders: cf.data.count ?? 0,
              totalChildFiles: cfi.data.count ?? 0,
            } as FileItem;
          } catch {
            return { ...f, id: f.id || f._id, type: "folder" } as FileItem;
          }
        })
      );
      // Merge meta
      const meta: Record<string, { name: string; parentId: string | null }> =
        {};
      for (const f of foldersWithCounts as any[])
        meta[f.id] = {
          name: (f as any).name,
          parentId: (f as any).parentId ?? null,
        };
      dispatch({ type: "MERGE_FOLDER_META", payload: meta });
      const childFiles: FileItem[] = (res.data.files || []).map((f: any) => ({
        ...f,
        id: f.id || f._id,
        type: "file",
      }));
      const combined = [...foldersWithCounts, ...childFiles];
      dispatch({
        type: "SET_MAIN_CHILDREN",
        payload: { parentId, children: combined },
      });
    } catch (e) {
      console.error("Failed to fetch main children for", parentId, e);
      dispatch({
        type: "SET_MAIN_CHILDREN",
        payload: { parentId, children: [] },
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

  const scheduleRevalidate = useCallback(
    (parentId: string | null) => {
      const key = parentId ?? "__root__";
      const existing = revalidateTimersRef.current.get(key);
      if (existing) window.clearTimeout(existing);
      const timer = window.setTimeout(async () => {
        try {
          if (parentId) {
            await fetchMainChildren(parentId);
          } else {
            await fetchRootFolders();
          }
          await fetchCounts();
          await fetchFolderTree();
        } catch (e) {
          console.warn("Quiet revalidation failed", e);
        } finally {
          revalidateTimersRef.current.delete(key);
        }
      }, 1500);
      revalidateTimersRef.current.set(key, timer);
    },
    [fetchMainChildren, fetchRootFolders, fetchCounts, fetchFolderTree]
  );

  const findPathIds = useCallback(
    (targetId: string): string[] | null => {
      const dfs = (nodes: FileItem[], acc: string[]): string[] | null => {
        for (const n of nodes) {
          const next = [...acc, n.id];
          if (n.id === targetId) return next;
          if (n.children && n.children.length > 0) {
            const found = dfs(n.children, next);
            if (found) return found;
          }
        }
        return null;
      };
      return dfs(state.folderTree || [], []);
    },
    [state.folderTree]
  );

  // Collect all descendant folder IDs under a given folderId from the tree
  const getDescendantIds = useCallback(
    (folderId: string): string[] => {
      const result: string[] = [];
      const walk = (nodes: FileItem[]): boolean => {
        for (const n of nodes) {
          if (n.id === folderId) {
            const traverse = (kids?: FileItem[]) => {
              for (const child of kids || []) {
                result.push(child.id);
                if (child.children && child.children.length > 0) {
                  traverse(child.children);
                }
              }
            };
            traverse(n.children);
            return true;
          }
          if (n.children && n.children.length > 0) {
            const found = walk(n.children);
            if (found) return true;
          }
        }
        return false;
      };
      walk(state.folderTree || []);
      return result;
    },
    [state.folderTree]
  );

  // Determine if candidateId is a descendant of ancestorId via parent map
  const isDescendantOf = useCallback(
    (candidateId: string, ancestorId: string): boolean => {
      if (candidateId === ancestorId) return true;
      let cursor: string | null = candidateId;
      let guard = 0;
      while (cursor && guard < 1000) {
        const meta = (state.folderMetaById as any)[cursor];
        if (!meta) break;
        if (meta.parentId === ancestorId) return true;
        cursor = meta.parentId;
        guard += 1;
      }
      return false;
    },
    [state.folderMetaById]
  );

  const revealFolderInMain = useCallback(
    async (folderId: string) => {
      const pathIds = findPathIds(folderId);
      if (!pathIds || pathIds.length === 0) return;

      for (const id of pathIds) {
        if (!state.mainExpandedIds.has(id)) {
          dispatch({ type: "TOGGLE_MAIN_EXPAND", payload: id });
        }
        try {
          await fetchMainChildren(id);
        } catch {}
      }

      const namesFromTree = (() => {
        const names: string[] = ["Root"];
        const collect = (
          nodes: FileItem[],
          ids: string[],
          idx: number
        ): boolean => {
          for (const n of nodes) {
            if (n.id === ids[idx]) {
              names.push(n.name);
              if (idx === ids.length - 1) return true;
              return collect(n.children || [], ids, idx + 1);
            }
            if (n.children && n.children.length > 0) {
              const ok = collect(n.children, ids, idx);
              if (ok) return true;
            }
          }
          return false;
        };
        collect(state.folderTree || [], pathIds, 0);
        return names;
      })();
      dispatch({ type: "SET_CURRENT_PATH", payload: namesFromTree });
    },
    [
      dispatch,
      state.folderTree,
      state.mainExpandedIds,
      fetchMainChildren,
      findPathIds,
    ]
  );

  // Expand the left tree to reveal a folder by id
  const revealFolderInTree = useCallback(
    async (folderId: string) => {
      const ids = findPathIds(folderId);
      if (!ids || ids.length === 0) return;
      // Ensure each ancestor has its children loaded in the tree
      for (const id of ids) {
        if (!state.expandedFolders.has(id)) {
          dispatch({ type: "TOGGLE_FOLDER_EXPANSION", payload: id });
        }
        try {
          await fetchFolderChildren(id);
        } catch {}
      }
    },
    [findPathIds, state.expandedFolders, fetchFolderChildren]
  );

  // Collapse helpers for sync
  const collapseFolderInTree = useCallback(
    (folderId: string) => {
      // Close all expanded nodes that are descendants of folderId (or itself)
      const toClose: string[] = [];
      state.expandedFolders.forEach((id) => {
        if (isDescendantOf(id, folderId)) toClose.push(id);
      });
      for (const id of toClose) {
        dispatch({ type: "TOGGLE_FOLDER_EXPANSION", payload: id });
      }
      // If current selection is the collapsed node or within its subtree, move selection to parent of folderId
      const selectedId = state.selectedMainFolderId;
      if (selectedId && isDescendantOf(selectedId, folderId)) {
        const parentId =
          (state.folderMetaById as any)[folderId]?.parentId ?? null;
        dispatch({ type: "SET_SELECTED_MAIN_FOLDER", payload: parentId });
        const segs = getPathSegmentsFor(parentId);
        dispatch({ type: "SET_CURRENT_PATH", payload: segs });
      }
    },
    [
      state.expandedFolders,
      state.selectedMainFolderId,
      state.folderMetaById,
      getPathSegmentsFor,
      isDescendantOf,
    ]
  );

  const collapseFolderInMain = useCallback(
    (folderId: string) => {
      // Close all expanded nodes that are descendants of folderId (or itself)
      const toClose: string[] = [];
      state.mainExpandedIds.forEach((id) => {
        if (isDescendantOf(id, folderId)) toClose.push(id);
      });
      for (const id of toClose) {
        dispatch({ type: "TOGGLE_MAIN_EXPAND", payload: id });
      }
      // If current selection is the collapsed node or within its subtree, move selection to parent of folderId
      const selectedId = state.selectedMainFolderId;
      if (selectedId && isDescendantOf(selectedId, folderId)) {
        const parentId =
          (state.folderMetaById as any)[folderId]?.parentId ?? null;
        dispatch({ type: "SET_SELECTED_MAIN_FOLDER", payload: parentId });
        const segs = getPathSegmentsFor(parentId);
        dispatch({ type: "SET_CURRENT_PATH", payload: segs });
      }
    },
    [
      state.mainExpandedIds,
      state.selectedMainFolderId,
      state.folderMetaById,
      getPathSegmentsFor,
      isDescendantOf,
    ]
  );

  const runUnifiedSearch = useCallback(
    async (params: {
      q?: string;
      name?: string;
      description?: string;
      dateFrom?: string;
      dateTo?: string;
      folderId?: string | null;
      page?: number;
      limit?: number;
      includeChildCounts?: boolean;
    }) => {
      dispatch({ type: "SET_SEARCH_MODE", payload: true });
      const res = await folderApi.unifiedSearch(params);
      const folders = (res.data.folders || []).map(
        (f: any) => ({ ...f, id: f.id || f._id, type: "folder" } as FileItem)
      );
      const files = (res.data.files || []).map(
        (f: any) => ({ ...f, id: f.id || f._id, type: "file" } as FileItem)
      );
      const combined = [...folders, ...files];
      dispatch({
        type: "SET_FILES_AND_TOTAL",
        payload: { files: combined, total: combined.length },
      });
    },
    [dispatch]
  );

  useEffect(() => {
    fetchFolderTree();
    fetchFiles();
    fetchCounts();
  }, [fetchFolderTree, fetchFiles, fetchCounts]);

  useEffect(() => {
    if (isValidObjectId(state.currentFolderId)) {
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
        fetchFiles();
        fetchFolderTree();
      };

      eventSource.addEventListener("folderUpdate", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log("SSE folderUpdate:", data);
        } catch {}
        fetchFiles();
        fetchFolderTree();
      });

      eventSource.onerror = (error) => {
        console.error("SSE Error for folder", state.currentFolderId, error);
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
      folderEventSourceRef.current.close();
      folderEventSourceRef.current = null;
      console.log("Closed folder SSE because currentFolderId is null.");
    }
  }, [state.currentFolderId, fetchFiles, fetchFolderTree, isValidObjectId]);

  return (
    <FileManagerContext.Provider
      value={{
        state,
        dispatch,
        navigateToPath,
        setBreadcrumbPath: (segments: string[]) =>
          dispatch({ type: "SET_CURRENT_PATH", payload: segments }),
        setBreadcrumbOnly,
        getPathSegmentsFor,
        setBreadcrumbToFolderId,
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
        fetchFolderChildren,
        fetchMainChildren,
        toggleMainExpand: (id: string) =>
          dispatch({ type: "TOGGLE_MAIN_EXPAND", payload: id }),
        selectMainFolder: (id: string | null) =>
          dispatch({ type: "SET_SELECTED_MAIN_FOLDER", payload: id }),
        fetchRootFolders,
        applyFilters,
        clearFilters,
        clearMainExploration: () => dispatch({ type: "CLEAR_MAIN_EXPANSIONS" }),
        revalidateQuietly: scheduleRevalidate,
        revealFolderInMain,
        revealFolderInTree,
        collapseFolderInTree,
        collapseFolderInMain,
        runUnifiedSearch,

        optimisticAddChild: (parentId: string | null, child: FileItem) =>
          dispatch({
            type: "OPTIMISTIC_ADD_CHILD",
            payload: { parentId, child },
          }),
        optimisticAddTreeChild: (parentId: string | null, child: FileItem) =>
          dispatch({
            type: "OPTIMISTIC_ADD_TREE_CHILD",
            payload: { parentId, child },
          }),
        optimisticRemoveChild: (parentId: string | null, id: string) =>
          dispatch({
            type: "OPTIMISTIC_REMOVE_CHILD",
            payload: { parentId, id },
          }),
        optimisticRemoveTreeChild: (parentId: string | null, id: string) =>
          dispatch({
            type: "OPTIMISTIC_REMOVE_TREE_CHILD",
            payload: { parentId, id },
          }),
        adjustFolderCounts: (
          folderId: string,
          deltaFolders = 0,
          deltaFiles = 0
        ) =>
          dispatch({
            type: "ADJUST_FOLDER_COUNTS",
            payload: { folderId, deltaFolders, deltaFiles },
          }),
        // Preview controls
        openPreview: (file: FileItem) =>
          dispatch({ type: "OPEN_PREVIEW_DIALOG", payload: file }),
        closePreview: () => dispatch({ type: "CLOSE_PREVIEW_DIALOG" }),
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

function parseSize(sizeStr: string): number {
  const sizeMap: { [key: string]: number } = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };
  const [value, unit] = sizeStr.split(" ");
  return parseFloat(value) * (sizeMap[unit.toUpperCase()] || 1);
}
