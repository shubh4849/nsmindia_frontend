import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileManager } from "@/context/FileManagerContext";

export function Pagination() {
  const { state, dispatch, getFilteredFiles } = useFileManager();
  const { currentPage, itemsPerPage } = state;

  const files = getFilteredFiles();
  const totalPages = Math.ceil(files.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, files.length);

  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (page: number) => {
    dispatch({ type: "SET_CURRENT_PAGE", payload: page });
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
          className={`h-8 w-8 p-0 ${
            i === currentPage
              ? "bg-primary text-primary-foreground hover:bg-primary-hover"
              : "bg-surface hover:bg-surface-hover border-border"
          }`}
        >
          {i}
        </Button>
      );
    }

    return pages;
  };

  return (
    <div className="border-t border-border bg-surface px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{endIndex} of {files.length} items
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 bg-surface hover:bg-surface-hover border-border disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </Button>

          {renderPageNumbers()}

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0 bg-surface hover:bg-surface-hover border-border disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
