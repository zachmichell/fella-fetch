import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';

const StaffReportCards = () => (
  <StaffLayout>
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Report Cards</h1>
      <Card>
        <CardHeader><CardTitle>Send Pet Updates</CardTitle></CardHeader>
        <CardContent className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Report card feature coming soon</p>
        </CardContent>
      </Card>
    </div>
  </StaffLayout>
);

export default StaffReportCards;
