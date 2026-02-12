import { PayrollRevenueChart } from './PayrollRevenueChart';
import { IncidentHeatmap } from './IncidentHeatmap';
import { VipList } from './VipList';

export const OwnersTab = () => (
  <div className="space-y-4">
    <PayrollRevenueChart />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <IncidentHeatmap />
      <VipList />
    </div>
  </div>
);
