import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
  status?: 'uploading' | 'completed' | 'error';
}

export function ProgressBar({ 
  progress, 
  className = '', 
  showPercentage = true,
  status = 'uploading'
}: ProgressBarProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'error':
        return 'bg-destructive';
      default:
        return 'upload-progress';
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'completed':
        return 'text-success';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-primary';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1">
        {showPercentage && (
          <span className={`text-sm font-medium ${getTextColor()}`}>
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getStatusColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}