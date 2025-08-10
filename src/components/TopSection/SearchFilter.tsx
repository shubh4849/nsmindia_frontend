import { useFileManager } from "@/context/FileManagerContext";
import { AdvancedFilter } from "./AdvancedFilter";

export function SearchFilter() {
  const { state, applyFilters, clearFilters, fetchFiles, runUnifiedSearch } =
    useFileManager();

  return (
    <div className="flex items-center space-x-3">
      <AdvancedFilter
        onApplyFilters={async (filters) => {
          applyFilters(filters);
          const folderIdParam =
            state.currentFolderId &&
            /^[0-9a-fA-F]{24}$/.test(state.currentFolderId)
              ? state.currentFolderId
              : null;
          await runUnifiedSearch({
            name: filters.name || undefined,
            description: filters.description || undefined,
            dateFrom: filters.dateFrom
              ? filters.dateFrom.toISOString()
              : undefined,
            dateTo: filters.dateTo ? filters.dateTo.toISOString() : undefined,
            folderId: folderIdParam,
            page: state.currentPage,
            limit: state.itemsPerPage,
          });
        }}
        onClearFilters={async () => {
          clearFilters();
          await fetchFiles();
        }}
      />
    </div>
  );
}
