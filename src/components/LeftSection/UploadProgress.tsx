import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFileManager } from '@/context/FileManagerContext';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/ui/button';

export function UploadProgress() {
  const { state, dispatch } = useFileManager();
  const { uploads } = state;

  const removeUpload = (id: string) => {
    dispatch({ type: 'REMOVE_UPLOAD', payload: id });
  };

  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border bg-surface">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Upload Progress
        </h3>
        
        <AnimatePresence mode="popLayout">
          {uploads.map((upload) => (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-3 last:mb-0"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center min-w-0 flex-1">
                  {upload.status === 'completed' && (
                    <CheckCircle size={16} className="text-success mr-2 flex-shrink-0" />
                  )}
                  {upload.status === 'error' && (
                    <AlertCircle size={16} className="text-destructive mr-2 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">
                    {upload.fileName}
                  </span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUpload(upload.id)}
                  className="h-6 w-6 p-0 ml-2 hover:bg-surface-hover"
                >
                  <X size={14} className="text-muted-foreground" />
                </Button>
              </div>
              
              <ProgressBar 
                progress={upload.progress} 
                status={upload.status}
                showPercentage={upload.status === 'uploading'}
              />
              
              {upload.status === 'error' && (
                <p className="text-xs text-destructive mt-1">
                  Upload failed. Please try again.
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}