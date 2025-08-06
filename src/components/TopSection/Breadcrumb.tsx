import { ChevronRight, Home } from 'lucide-react';
import { useFileManager } from '@/context/FileManagerContext';
import { Button } from '@/components/ui/button';

export function Breadcrumb() {
  const { state, navigateToPath } = useFileManager();
  const { currentPath } = state;

  const handleNavigate = (index: number) => {
    const newPath = currentPath.slice(0, index + 1);
    navigateToPath(newPath);
  };

  return (
    <nav className="flex items-center space-x-1 text-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigateToPath(['Root'])}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        <Home size={16} className="mr-1" />
        Home
      </Button>
      
      {currentPath.length > 1 && (
        <>
          <ChevronRight size={16} className="text-muted-foreground" />
          {currentPath.slice(1).map((segment, index) => (
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