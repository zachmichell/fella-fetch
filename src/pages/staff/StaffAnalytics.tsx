import { StaffLayout } from '@/components/staff/StaffLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CapacityTab } from '@/components/staff/analytics/CapacityTab';
import { GroomingTab } from '@/components/staff/analytics/GroomingTab';
import { TrainingTab } from '@/components/staff/analytics/TrainingTab';
import { OwnersTab } from '@/components/staff/analytics/OwnersTab';
import { BarChart3, Scissors, GraduationCap, Crown } from 'lucide-react';

const StaffAnalytics = () => (
  <StaffLayout>
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics & Reports</h1>
      <Tabs defaultValue="capacity" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="capacity" className="text-xs sm:text-sm"><BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" /> Capacity</TabsTrigger>
          <TabsTrigger value="grooming" className="text-xs sm:text-sm"><Scissors className="h-4 w-4 mr-1 hidden sm:inline" /> Grooming</TabsTrigger>
          <TabsTrigger value="training" className="text-xs sm:text-sm"><GraduationCap className="h-4 w-4 mr-1 hidden sm:inline" /> Training</TabsTrigger>
          <TabsTrigger value="owners" className="text-xs sm:text-sm"><Crown className="h-4 w-4 mr-1 hidden sm:inline" /> Owner's View</TabsTrigger>
        </TabsList>
        <TabsContent value="capacity"><CapacityTab /></TabsContent>
        <TabsContent value="grooming"><GroomingTab /></TabsContent>
        <TabsContent value="training"><TrainingTab /></TabsContent>
        <TabsContent value="owners"><OwnersTab /></TabsContent>
      </Tabs>
    </div>
  </StaffLayout>
);

export default StaffAnalytics;
