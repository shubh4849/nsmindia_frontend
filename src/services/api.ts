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

// Helper function to recursively transform keys
const transformKeys = (obj: any, fromKey: string, toKey: string): any => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  // Do not transform FormData; it must be sent as-is
  if (typeof FormData !== "undefined" && obj instanceof FormData) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, fromKey, toKey));
  }
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = key === fromKey ? toKey : key;
      newObj[newKey] = transformKeys(obj[key], fromKey, toKey);
    }
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
    config.data = transformKeys(config.data, "id", "_id");
  }
  // Special handling for URL params if necessary, though backend uses :fileId/:folderId
  return config;
});

// Response interceptor to transform '_id' to 'id' for incoming data
api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = transformKeys(response.data, "_id", "id");
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.data) {
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
  uploadFile: (
    file: File,
    currentPath: string[],
    folderId: string | undefined, // New parameter
    onUploadProgress?: (progressEvent: any) => void
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", currentPath.join("/"));
    if (folderId) {
      formData.append("folderId", folderId);
    }

    return api.post("/files/upload", formData, {
      // Let the browser set the Content-Type with proper boundary for FormData
      onUploadProgress,
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
    params?: { page?: number; limit?: number }
  ) => {
    return api.get(`/folders/${folderId}/contents`, { params });
  },
  getFolderBreadcrumb: (folderId: string) => {
    return api.get(`/folders/${folderId}/breadcrumb`);
  },
  getFilteredFolderContents: (
    folderId: string,
    params?: {
      q?: string;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    }
  ) => {
    return api.get(`/folders/${folderId}/filtered`, { params });
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

export const sseApi = {
  getUploadProgress: (uploadId: string) => {
    return new EventSource(`${API_BASE_URL}/sse/upload-progress/${uploadId}`);
  },
  getFolderUpdates: (folderId: string) => {
    return new EventSource(`${API_BASE_URL}/sse/folder-updates/${folderId}`);
  },
};
