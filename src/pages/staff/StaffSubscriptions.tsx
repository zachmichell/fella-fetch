import { StaffLayout } from '@/components/staff/StaffLayout';
import { SubscriptionsList } from '@/components/staff/subscriptions/SubscriptionsList';

export default function StaffSubscriptions() {
  return (
    <StaffLayout>
      <div className="container mx-auto p-6">
        <SubscriptionsList />
      </div>
    </StaffLayout>
  );
}
