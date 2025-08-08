import { Folder, FileText } from "lucide-react";
import { useFileManager } from "@/context/FileManagerContext";

export function SummaryCounters() {
  const { state } = useFileManager();
  const { totalFolders, totalDocuments } = state;

  return (
    <div className="grid grid-cols-2 gap-4 p-4 border-b border-border">
      <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-surface-hover text-primary">
        <Folder size={24} className="mb-2" />
        <span className="text-lg font-semibold">Folders</span>
        <span className="text-sm text-muted-foreground">{totalFolders}+</span>
      </div>
      <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-surface-hover text-primary">
        <FileText size={24} className="mb-2" />
        <span className="text-lg font-semibold">Documents</span>
        <span className="text-sm text-muted-foreground">{totalDocuments}+</span>
      </div>
    </div>
  );
}
