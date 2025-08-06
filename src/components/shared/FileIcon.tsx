import {
  Folder,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  File,
  Sheet,
  Presentation,
} from "lucide-react";
import { FileItem } from "@/context/FileManagerContext";
import { getFileIcon } from "@/utils/fileUtils";

interface FileIconProps {
  file: FileItem;
  size?: number;
  className?: string;
}

const iconMap = {
  Folder,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  File,
  Sheet,
  Presentation,
};

export function FileIcon({ file, size = 20, className = "" }: FileIconProps) {
  const iconName = getFileIcon(file);
  const IconComponent = iconMap[iconName as keyof typeof iconMap] || File;

  const getIconColor = () => {
    if (file.type === "folder") {
      return "text-primary";
    }

    switch (iconName) {
      case "FileText":
        return "text-gray-600 dark:text-gray-400"; // Muted text color
      case "Image":
        return "text-emerald-600 dark:text-emerald-400"; // Greenish for images
      case "Video":
        return "text-indigo-600 dark:text-indigo-400"; // Bluish for video
      case "Music":
        return "text-purple-600 dark:text-purple-400"; // Purplish for music
      case "Archive":
        return "text-orange-600 dark:text-orange-400"; // Orangish for archives
      case "Code":
        return "text-blue-600 dark:text-blue-400"; // Blue for code
      case "Sheet":
        return "text-teal-600 dark:text-teal-400"; // Teal for sheets
      case "Presentation":
        return "text-rose-600 dark:text-rose-400"; // Rosy for presentations
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <IconComponent size={size} className={`${getIconColor()} ${className}`} />
  );
}
