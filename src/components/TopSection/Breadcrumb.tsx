import { ChevronRight, Home } from "lucide-react";
import { useFileManager } from "@/context/FileManagerContext";
import { useEffect, useRef } from "react";

export function Breadcrumb() {
  const { state } = useFileManager();
  const { currentPath } = state as any;
  const containerRef = useRef<HTMLDivElement>(null);

  const segments: string[] =
    Array.isArray(currentPath) && currentPath.length ? currentPath : ["Root"]; // Fallback

  useEffect(() => {
    // Auto scroll to end whenever path changes
    const el = containerRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth;
    }
  }, [segments.join("/")]);

  return (
    <div
      ref={containerRef}
      className="flex items-center text-sm select-none overflow-x-auto no-scrollbar max-w-full"
      style={{ scrollbarWidth: "none" }}
    >
      <nav className="flex items-center space-x-1">
        <span className="inline-flex items-center text-muted-foreground flex-shrink-0">
          <Home size={16} className="mr-1" />
          <span>Home</span>
        </span>
        {segments.length > 1 && (
          <>
            <ChevronRight
              size={16}
              className="text-muted-foreground flex-shrink-0"
            />
            {segments.slice(1).map((segment, index) => (
              <span
                key={index}
                className="inline-flex items-center text-muted-foreground whitespace-nowrap flex-shrink-0"
              >
                <span className="px-1 text-foreground/80 max-w-[200px] truncate">
                  {segment}
                </span>
                {index < segments.length - 2 && (
                  <ChevronRight
                    size={16}
                    className="text-muted-foreground flex-shrink-0"
                  />
                )}
              </span>
            ))}
          </>
        )}
      </nav>
    </div>
  );
}
