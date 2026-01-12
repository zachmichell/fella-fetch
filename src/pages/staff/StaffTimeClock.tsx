import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const StaffTimeClock = () => (
  <StaffLayout>
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Time Clock</h1>
      <Card>
        <CardHeader><CardTitle>Clock In/Out</CardTitle></CardHeader>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Time clock feature coming soon</p>
        </CardContent>
      </Card>
    </div>
  </StaffLayout>
);

export default StaffTimeClock;
