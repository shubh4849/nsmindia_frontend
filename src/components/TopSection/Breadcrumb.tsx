import { ChevronRight, Home } from "lucide-react";
import { useFileManager } from "@/context/FileManagerContext";

export function Breadcrumb() {
  const { state } = useFileManager();
  const { currentPath } = state as any;

  const segments: string[] =
    Array.isArray(currentPath) && currentPath.length ? currentPath : ["Root"]; // Fallback

  return (
    <nav className="flex items-center space-x-1 text-sm select-none">
      <span className="inline-flex items-center text-muted-foreground">
        <Home size={16} className="mr-1" />
        <span>Home</span>
      </span>
      {segments.length > 1 && (
        <>
          <ChevronRight size={16} className="text-muted-foreground" />
          {segments.slice(1).map((segment, index) => (
            <span
              key={index}
              className="inline-flex items-center text-muted-foreground"
            >
              <span className="px-1 text-foreground/80">{segment}</span>
              {index < segments.length - 2 && (
                <ChevronRight size={16} className="text-muted-foreground" />
              )}
            </span>
          ))}
        </>
      )}
    </nav>
  );
}
