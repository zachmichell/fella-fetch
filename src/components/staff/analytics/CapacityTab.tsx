import { CapacityHeatmap } from './CapacityHeatmap';
import { GhostReport } from './GhostReport';
import { TurnAwayForm } from './TurnAwayForm';

export const CapacityTab = () => (
  <div className="space-y-4">
    <CapacityHeatmap />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <GhostReport />
      <TurnAwayForm />
    </div>
  </div>
);
