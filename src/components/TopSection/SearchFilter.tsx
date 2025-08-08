import { Search, SortAsc, SortDesc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFileManager } from "@/context/FileManagerContext";
import { AdvancedFilter } from "./AdvancedFilter"; // Import AdvancedFilter

export function SearchFilter() {
  const { state, dispatch, applyFilters, clearFilters } = useFileManager();
  const { searchQuery, sortBy, sortOrder } = state;

  const handleSearchChange = (value: string) => {
    dispatch({ type: "SET_SEARCH_QUERY", payload: value });
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    const newSortOrder =
      sortBy === newSortBy && sortOrder === "asc" ? "desc" : "asc";
    dispatch({
      type: "SET_SORT",
      payload: { sortBy: newSortBy, sortOrder: newSortOrder },
    });
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search files and folders..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 w-64 bg-surface border-border focus:ring-primary"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-surface hover:bg-surface-hover border-border"
          >
            {sortOrder === "asc" ? (
              <SortAsc size={16} />
            ) : (
              <SortDesc size={16} />
            )}
            <span className="ml-2 capitalize">{sortBy}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-surface border-border shadow-lg"
        >
          <DropdownMenuItem
            onClick={() => handleSortChange("name")}
            className={`cursor-pointer hover:bg-surface-hover ${
              sortBy === "name" ? "bg-surface-selected" : ""
            }`}
          >
            Sort by Name
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSortChange("date")}
            className={`cursor-pointer hover:bg-surface-hover ${
              sortBy === "date" ? "bg-surface-selected" : ""
            }`}
          >
            Sort by Date
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleSortChange("size")}
            className={`cursor-pointer hover:bg-surface-hover ${
              sortBy === "size" ? "bg-surface-selected" : ""
            }`}
          >
            Sort by Size
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AdvancedFilter
        onApplyFilters={applyFilters}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
