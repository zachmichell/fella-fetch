import { ProgressionFunnel } from './ProgressionFunnel';
import { ClassManager } from './ClassManager';
import { WaitlistTable } from './WaitlistTable';
import { useIsMobile } from '@/hooks/use-mobile';

export const TrainingTab = () => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4">
      <ProgressionFunnel />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!isMobile && <ClassManager />}
        <WaitlistTable />
      </div>
      {isMobile && <ClassManager />}
    </div>
  );
};
