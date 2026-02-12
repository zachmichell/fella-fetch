import { CommissionCalculator } from './CommissionCalculator';
import { ReliabilityChart } from './ReliabilityChart';
import { UpsellTracker } from './UpsellTracker';

export const GroomingTab = () => (
  <div className="space-y-4">
    <CommissionCalculator />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ReliabilityChart />
      <UpsellTracker />
    </div>
  </div>
);
