import { ChevronRight, Home } from "lucide-react";
import { useFileManager } from "@/context/FileManagerContext";
import { Button } from "@/components/ui/button";

export function Breadcrumb() {
  const { state, navigateToPath } = useFileManager();
  const { currentPath, folderTree, rootFolderId } = state as any;

  const resolveFolderIdForPath = (path: string[]): string | null => {
    if (path.length === 1) return rootFolderId ?? null;
    const normalized = (path.join("/") + "/").replace(/\/+/g, "/");
    const match = (folderTree || []).find((f: any) => f.path === normalized);
    return match?.id ?? null;
  };

  const handleNavigate = (index: number) => {
    const newPath = currentPath.slice(0, index + 1);
    const folderId = resolveFolderIdForPath(newPath);
    navigateToPath(newPath, folderId);
  };

  return (
    <nav className="flex items-center space-x-1 text-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigateToPath(["Root"], rootFolderId ?? null)}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        <Home size={16} className="mr-1" />
        Home
      </Button>

      {currentPath.length > 1 && (
        <>
          <ChevronRight size={16} className="text-muted-foreground" />
          {currentPath.slice(1).map((segment: string, index: number) => (
            <div key={index} className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate(index + 1)}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                {segment}
              </Button>
              {index < currentPath.length - 2 && (
                <ChevronRight size={16} className="text-muted-foreground" />
              )}
            </div>
          ))}
        </>
      )}
    </nav>
  );
}
