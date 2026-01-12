import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog } from 'lucide-react';

const StaffUsers = () => (
  <StaffLayout>
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">User Management</h1>
      <Card>
        <CardHeader><CardTitle>Manage Staff Roles</CardTitle></CardHeader>
        <CardContent className="text-center py-12 text-muted-foreground">
          <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>User management coming soon</p>
        </CardContent>
      </Card>
    </div>
  </StaffLayout>
);

export default StaffUsers;
