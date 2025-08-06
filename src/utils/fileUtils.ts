import { FileItem } from '@/context/FileManagerContext';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function getFileIcon(file: FileItem): string {
  if (file.type === 'folder') {
    return 'Folder';
  }
  
  const extension = getFileExtension(file.name);
  const mimeType = file.mimeType;
  
  // Document types
  if (mimeType?.includes('pdf') || extension === 'pdf') {
    return 'FileText';
  }
  
  if (mimeType?.includes('word') || ['doc', 'docx'].includes(extension)) {
    return 'FileText';
  }
  
  if (mimeType?.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(extension)) {
    return 'Sheet';
  }
  
  if (mimeType?.includes('presentation') || ['ppt', 'pptx'].includes(extension)) {
    return 'Presentation';
  }
  
  // Image types
  if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
    return 'Image';
  }
  
  // Video types
  if (mimeType?.includes('video') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
    return 'Video';
  }
  
  // Audio types
  if (mimeType?.includes('audio') || ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension)) {
    return 'Music';
  }
  
  // Archive types
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return 'Archive';
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'php', 'rb'].includes(extension)) {
    return 'Code';
  }
  
  // Default file icon
  return 'File';
}

export function isPreviewable(file: FileItem): boolean {
  if (file.type === 'folder') return false;
  
  const extension = getFileExtension(file.name);
  const mimeType = file.mimeType;
  
  // Images
  if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
    return true;
  }
  
  // PDFs
  if (mimeType?.includes('pdf') || extension === 'pdf') {
    return true;
  }
  
  // Text files
  if (mimeType?.includes('text') || ['txt', 'md', 'json', 'xml', 'csv'].includes(extension)) {
    return true;
  }
  
  // Videos
  if (mimeType?.includes('video') || ['mp4', 'webm', 'ogg'].includes(extension)) {
    return true;
  }
  
  return false;
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function buildFilePath(pathSegments: string[]): string {
  return pathSegments.filter(segment => segment !== 'Root').join('/');
}

export function getParentPath(currentPath: string[]): string[] {
  if (currentPath.length <= 1) return ['Root'];
  return currentPath.slice(0, -1);
}

export function simulateFileUpload(file: File): Promise<FileItem> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newFile: FileItem = {
        id: generateId(),
        name: file.name,
        type: 'file',
        size: formatFileSize(file.size),
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        path: '',
        mimeType: file.type,
        description: `Uploaded file: ${file.name}`
      };
      resolve(newFile);
    }, 1000);
  });
}

export function validateFileName(name: string): string | null {
  if (!name.trim()) {
    return 'Name cannot be empty';
  }
  
  if (name.length > 255) {
    return 'Name is too long (max 255 characters)';
  }
  
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    return 'Name contains invalid characters';
  }
  
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];
  
  if (reservedNames.includes(name.toUpperCase())) {
    return 'Name is reserved by the system';
  }
  
  return null;
}

export function searchFiles(files: FileItem[], query: string): FileItem[] {
  if (!query.trim()) return files;
  
  const searchTerm = query.toLowerCase();
  return files.filter(file => 
    file.name.toLowerCase().includes(searchTerm) ||
    file.description?.toLowerCase().includes(searchTerm) ||
    file.mimeType?.toLowerCase().includes(searchTerm)
  );
}

export function sortFiles(files: FileItem[], sortBy: 'name' | 'date' | 'size', order: 'asc' | 'desc'): FileItem[] {
  return [...files].sort((a, b) => {
    // Always put folders first
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'date':
        comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
        break;
      case 'size':
        if (a.type === 'folder' && b.type === 'folder') {
          comparison = a.name.localeCompare(b.name);
        } else {
          const sizeA = a.size ? parseSize(a.size) : 0;
          const sizeB = b.size ? parseSize(b.size) : 0;
          comparison = sizeA - sizeB;
        }
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
}

function parseSize(sizeStr: string): number {
  const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^([\d.]+)\s*([A-Z]+)$/);
  if (!match) return 0;
  const [, num, unit] = match;
  return parseFloat(num) * (units[unit as keyof typeof units] || 1);
}