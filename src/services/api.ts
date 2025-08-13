import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

if (!API_BASE_URL) {
  throw new Error(
    "Backend URL is not defined. Please set VITE_BACKEND_URL in your .env file."
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Helper predicates
const isPlainObject = (obj: any): obj is Record<string, any> => {
  if (obj === null || typeof obj !== "object") return false;
  const proto = Object.getPrototypeOf(obj);
  return proto === Object.prototype || proto === null;
};
const isSkippableObject = (obj: any): boolean => {
  if (typeof obj !== "object" || obj === null) return true;
  // Skip browser-native complex objects
  if (typeof FormData !== "undefined" && obj instanceof FormData) return true;
  if (typeof Blob !== "undefined" && obj instanceof Blob) return true;
  if (typeof File !== "undefined" && obj instanceof File) return true;
  if (typeof Date !== "undefined" && obj instanceof Date) return true;
  if (
    typeof ArrayBuffer !== "undefined" &&
    (obj instanceof ArrayBuffer || ArrayBuffer.isView?.(obj))
  )
    return true;
  return false;
};

// Cycle-safe key transform that only touches plain JSON objects/arrays
const transformKeys = (
  obj: any,
  fromKey: string,
  toKey: string,
  seen?: WeakSet<object>
): any => {
  if (obj === null || typeof obj !== "object") return obj;
  if (isSkippableObject(obj)) return obj;
  const seenSet = seen || new WeakSet<object>();
  if (seenSet.has(obj as object)) return obj;
  seenSet.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, fromKey, toKey, seenSet));
  }
  if (!isPlainObject(obj)) return obj;

  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    const newKey = key === fromKey ? toKey : key;
    newObj[newKey] = transformKeys((obj as any)[key], fromKey, toKey, seenSet);
  }
  return newObj;
};

// Request interceptor to transform 'id' to '_id' for outgoing data
api.interceptors.request.use((config) => {
  // If sending FormData, let the browser set Content-Type with boundary and skip transforms
  if (
    config.data &&
    typeof FormData !== "undefined" &&
    config.data instanceof FormData
  ) {
    if (config.headers) {
      delete (config.headers as any)["Content-Type"];
    }
    return config;
  }
  if (
    config.data &&
    (config.method === "post" ||
      config.method === "put" ||
      config.method === "patch")
  ) {
    if (isPlainObject(config.data) || Array.isArray(config.data)) {
      config.data = transformKeys(config.data, "id", "_id");
    }
  }
  return config;
});

// Response interceptor to transform '_id' to 'id' for incoming data
api.interceptors.response.use(
  (response) => {
    if (
      response &&
      response.data &&
      (isPlainObject(response.data) || Array.isArray(response.data))
    ) {
      response.data = transformKeys(response.data, "_id", "id");
    }
    return response;
  },
  (error) => {
    if (
      error &&
      error.response &&
      (isPlainObject(error.response.data) || Array.isArray(error.response.data))
    ) {
      error.response.data = transformKeys(error.response.data, "_id", "id");
    }
    return Promise.reject(error);
  }
);

export const fileApi = {
  getFiles: (params?: {
    path?: string;
    sortBy?: string;
    limit?: number;
    page?: number;
    folderId?: string;
  }) => {
    return api.get(`/files`, { params });
  },
  searchFiles: (params?: {
    q?: string;
    folderId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    name?: string;
    description?: string;
    page?: number; // Added
    limit?: number; // Added
    sortBy?: string; // Added
    sortOrder?: string; // Added
  }) => {
    return api.get(`/files/search`, { params });
  },
  initUpload: (params: {
    fileName?: string;
    fileSize?: number;
    folderId?: string;
  }) => {
    return api.post(`/files/upload/init`, params);
  },
  uploadFile: (
    file: File,
    currentPath: string[],
    folderId: string | undefined,
    uploadId: string,
    opts?: { fileName?: string; fileSize?: number }
  ) => {
    const formData = new FormData();
    // identifiers/metadata as headers; do not include uploadId in the form body
    formData.append("path", currentPath.join("/"));
    if (folderId) {
      formData.append("folderId", folderId);
    }
    if (opts?.fileName) formData.append("fileName", opts.fileName);
    if (typeof opts?.fileSize === "number")
      formData.append("fileSize", String(opts.fileSize));
    // Append the file with explicit name
    formData.append("file", file, file.name);

    return api.post("/files/upload", formData, {
      headers: {
        "x-upload-id": uploadId,
        ...(typeof opts?.fileSize === "number"
          ? { "x-file-size": String(opts.fileSize) }
          : {}),
      },
      transformRequest: [(data) => data],
    });
  },
  getFile: (fileId: string) => {
    return api.get(`/files/${fileId}`);
  },
  updateFile: (
    fileId: string,
    data: { name?: string; description?: string }
  ) => {
    return api.patch(`/files/${fileId}`, data);
  },
  deleteFile: (fileId: string) => {
    return api.delete(`/files/${fileId}`);
  },
  downloadFile: (fileId: string) => {
    return api.get(`/files/${fileId}/download`, { responseType: "blob" });
  },
  previewFile: (fileId: string) => {
    return api.get(`/files/${fileId}/preview`, { responseType: "blob" });
  },
  getFilesCount: () => {
    return api.get(`/files/count`);
  },
};

export const folderApi = {
  createFolder: (
    name: string,
    description: string,
    parentPath: string[],
    parentId?: string
  ) => {
    return api.post("/folders", {
      name,
      description,
      path: parentPath.join("/") + "/", // Ensure trailing slash
      parentId, // Include parentId if available
    });
  },
  getFolders: (params?: {
    parentId?: string;
    sortOrder?: string;
    sortBy?: string;
    limit?: number;
    page?: number;
    includeChildCounts?: boolean;
  }) => {
    return api.get(`/folders`, { params });
  },
  getFolderTree: () => {
    return api.get(`/folders/tree`);
  },
  getFolder: (folderId: string) => {
    return api.get(`/folders/${folderId}`);
  },
  updateFolder: (
    folderId: string,
    data: {
      name?: string;
      description?: string;
      parentId?: string;
      path?: string;
    }
  ) => {
    return api.patch(`/folders/${folderId}`, data);
  },
  deleteFolder: (folderId: string) => {
    return api.delete(`/folders/${folderId}`);
  },
  getFolderContents: (
    folderId: string,
    params?: { page?: number; limit?: number; includeChildCounts?: boolean }
  ) => {
    return api.get(`/folders/${folderId}/contents`, { params });
  },
  getFolderBreadcrumb: (folderId: string) => {
    return api.get(`/folders/${folderId}/breadcrumb`);
  },
  getRootContents: (params?: {
    page?: number;
    limit?: number;
    includeChildCounts?: boolean;
  }) => {
    return api.get(`/folders/root/contents`, { params });
  },
  unifiedSearch: (params: {
    name?: string;
    description?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
    includeChildCounts?: boolean;
  }) => {
    const searchParams: any = { ...params };
    return api.get(`/folders/search`, { params: searchParams });
  },
  getFoldersCount: () => {
    return api.get(`/folders/count`);
  },
  getDirectChildFoldersCount: (folderId: string) => {
    return api.get(`/folders/${folderId}/child-folders/count`);
  },
  getDirectChildFilesCount: (folderId: string) => {
    return api.get(`/folders/${folderId}/child-files/count`);
  },
};

export const statsApi = {
  getCounts: () => api.get(`/stats/counts`),
};

export const sseApi = {
  getUploadProgress: (uploadId: string) => {
    return new EventSource(`${API_BASE_URL}/sse/upload-progress/${uploadId}`);
  },
  getFolderUpdates: (folderId: string) => {
    return new EventSource(`${API_BASE_URL}/sse/folder-updates/${folderId}`);
  },
  openUploadProgress: (
    uploadId: string,
    handlers?: {
      onConnected?: () => void;
      onPing?: () => void;
      onMessage?: (data: any) => void;
      onError?: (error: any) => void;
    }
  ) => {
    const es = new EventSource(
      `${API_BASE_URL}/sse/upload-progress/${uploadId}`
    );
    if (handlers?.onConnected)
      es.addEventListener("connected", handlers.onConnected as any);
    if (handlers?.onPing) es.addEventListener("ping", handlers.onPing as any);
    if (handlers?.onMessage)
      es.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          handlers.onMessage?.(parsed);
        } catch {
          // ignore parse errors
        }
      };
    if (handlers?.onError)
      es.onerror = (e) => {
        handlers.onError?.(e);
      };
    return es;
  },
  debugUploadProgress: (uploadId: string) => {
    const es = new EventSource(
      `${API_BASE_URL}/sse/upload-progress/${uploadId}`
    );
    es.addEventListener("connected", () =>
      console.log("[SSE connected]", uploadId)
    );
    es.addEventListener("ping", () => console.log("[SSE ping]", uploadId));
    es.onmessage = (evt) => console.log("[SSE message]", uploadId, evt.data);
    es.onerror = (e) => console.warn("[SSE error]", uploadId, e);
    return es;
  },
};
