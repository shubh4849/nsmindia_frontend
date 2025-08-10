import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useFileManager } from "@/context/FileManagerContext";

interface AdvancedFilterProps {
  onApplyFilters: (filters: {
    name: string;
    description: string;
    dateFrom: Date | undefined;
    dateTo: Date | undefined;
  }) => void;
  onClearFilters: () => void;
  onAfterChange?: () => void;
}

export function AdvancedFilter({
  onApplyFilters,
  onClearFilters,
  onAfterChange,
}: AdvancedFilterProps) {
  const { state } = useFileManager();
  const [nameFilter, setNameFilter] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState(
    state.filterByDescription || ""
  );
  const [dateFromFilter, setDateFromFilter] = useState<Date | undefined>(
    state.filterDateFrom
  );
  const [dateToFilter, setDateToFilter] = useState<Date | undefined>(
    state.filterDateTo
  );

  const handleApply = () => {
    onApplyFilters({
      name: nameFilter,
      description: descriptionFilter,
      dateFrom: dateFromFilter,
      dateTo: dateToFilter,
    });
    onAfterChange?.();
  };

  const handleClear = () => {
    setNameFilter("");
    setDescriptionFilter("");
    setDateFromFilter(undefined);
    setDateToFilter(undefined);
    onClearFilters();
    onAfterChange?.();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-surface hover:bg-surface-hover border-border"
        >
          <Filter size={16} />
          <span className="ml-2">Filter</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-background border-border shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-foreground">Filters</h4>
          <Button
            variant="link"
            onClick={handleClear}
            className="text-sm text-primary p-0 h-auto"
          >
            Clear
          </Button>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="filterName" className="text-foreground">
              Name
            </Label>
            <Input
              id="filterName"
              placeholder="Folder name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="mt-1 bg-input border-border focus:ring-primary"
            />
          </div>
          <div>
            <Label htmlFor="filterDescription" className="text-foreground">
              Description
            </Label>
            <Input
              id="filterDescription"
              placeholder="Folder Description"
              value={descriptionFilter}
              onChange={(e) => setDescriptionFilter(e.target.value)}
              className="mt-1 bg-input border-border focus:ring-primary"
            />
          </div>
          <div>
            <Label htmlFor="filterDate" className="text-foreground">
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1 bg-input border-border",
                    !dateFromFilter && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFromFilter ? (
                    dateToFilter ? (
                      `${format(dateFromFilter, "dd-MM-yyyy")} to ${format(
                        dateToFilter,
                        "dd-MM-yyyy"
                      )}`
                    ) : (
                      format(dateFromFilter, "dd-MM-yyyy")
                    )
                  ) : (
                    <span>DD-MM-YYYY</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="flex w-auto p-0 bg-background border-border shadow-lg"
                align="start"
              >
                <Calendar
                  mode="range"
                  selected={{
                    from: dateFromFilter,
                    to: dateToFilter,
                  }}
                  onSelect={(range) => {
                    setDateFromFilter(range?.from);
                    setDateToFilter(range?.to);
                  }}
                  numberOfMonths={2}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <Button
            variant="outline"
            onClick={handleClear}
            className="bg-surface hover:bg-surface-hover border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
