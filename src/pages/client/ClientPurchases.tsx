import { ClientPortalLayout } from '@/components/client/ClientPortalLayout';
import OrderHistory from '@/components/client/OrderHistory';

const ClientPurchases = () => {
  return (
    <ClientPortalLayout title="Purchase History" description="View your order history">
      <div className="max-w-2xl">
        <OrderHistory />
      </div>
    </ClientPortalLayout>
  );
};

export default ClientPurchases;
