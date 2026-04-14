import { StaffLayout } from '@/components/staff/StaffLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CapacityTab } from '@/components/staff/analytics/CapacityTab';
import { GroomingTab } from '@/components/staff/analytics/GroomingTab';
import { TrainingTab } from '@/components/staff/analytics/TrainingTab';
import { OwnersTab } from '@/components/staff/analytics/OwnersTab';
import { BarChart3, Scissors, GraduationCap, Crown, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorBoundary } from 'react';

class AnalyticsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold text-foreground mb-2">Analytics Unavailable</h3>
            <p className="text-muted-foreground">Shopify setup required to display analytics data.</p>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

import React from 'react';

const StaffAnalytics = () => (
  <StaffLayout>
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics & Reports</h1>
      <AnalyticsErrorBoundary>
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
      </AnalyticsErrorBoundary>
    </div>
  </StaffLayout>
);

export default StaffAnalytics;
