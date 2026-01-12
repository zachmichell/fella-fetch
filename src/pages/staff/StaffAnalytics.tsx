import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const StaffAnalytics = () => (
  <StaffLayout>
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <Card>
        <CardHeader><CardTitle>Business Reports</CardTitle></CardHeader>
        <CardContent className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Analytics dashboard coming soon</p>
        </CardContent>
      </Card>
    </div>
  </StaffLayout>
);

export default StaffAnalytics;
