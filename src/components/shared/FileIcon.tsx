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
  badgeCount?: number; // New: optional tally badge
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

export function FileIcon({
  file,
  size = 20,
  className = "",
  badgeCount,
}: FileIconProps) {
  const iconName = getFileIcon(file);
  const IconComponent = iconMap[iconName as keyof typeof iconMap] || File;

  const getIconColor = () => {
    if (file.type === "folder") {
      return "text-primary";
    }

    switch (iconName) {
      case "FileText":
        return "text-gray-600 dark:text-gray-400";
      case "Image":
        return "text-emerald-600 dark:text-emerald-400";
      case "Video":
        return "text-indigo-600 dark:text-indigo-400";
      case "Music":
        return "text-purple-600 dark:text-purple-400";
      case "Archive":
        return "text-orange-600 dark:text-orange-400";
      case "Code":
        return "text-blue-600 dark:text-blue-400";
      case "Sheet":
        return "text-teal-600 dark:text-teal-400";
      case "Presentation":
        return "text-rose-600 dark:text-rose-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <span className={`relative inline-flex ${className}`}>
      <IconComponent size={size} className={getIconColor()} />
      {typeof badgeCount === "number" && (
        <span
          className="absolute -top-2 -left-2 rounded-full bg-amber-400 text-black text-[10px] leading-none h-4 min-w-[16px] px-1 flex items-center justify-center font-semibold shadow"
          aria-label={`${badgeCount} items`}
        >
          {badgeCount}
        </span>
      )}
    </span>
  );
}
