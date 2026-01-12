import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dog } from 'lucide-react';

const StaffPets = () => (
  <StaffLayout>
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pets</h1>
      <Card>
        <CardHeader><CardTitle>Pet Management</CardTitle></CardHeader>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Dog className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Pet management coming soon</p>
        </CardContent>
      </Card>
    </div>
  </StaffLayout>
);

export default StaffPets;
