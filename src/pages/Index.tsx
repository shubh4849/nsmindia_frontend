import { FileManagerProvider } from '@/context/FileManagerContext';
import { FileManager } from '@/pages/FileManager';

const Index = () => {
  return (
    <FileManagerProvider>
      <FileManager />
    </FileManagerProvider>
  );
};

export default Index;
