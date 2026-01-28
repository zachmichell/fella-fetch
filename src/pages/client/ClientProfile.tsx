import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { ClientPortalLayout } from '@/components/client/ClientPortalLayout';

const ClientProfile = () => {
  const { clientData, shopifyCustomer } = useClientAuth();

  return (
    <ClientPortalLayout title="Your Profile" description="View your account information">
      <div className="max-w-xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">
                  {shopifyCustomer?.firstName || clientData?.first_name || ''}{' '}
                  {shopifyCustomer?.lastName || clientData?.last_name || ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">
                  {shopifyCustomer?.email || clientData?.email || 'Not provided'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">
                  {shopifyCustomer?.phone || clientData?.phone || 'Not provided'}
                </p>
              </div>
            </div>

            {shopifyCustomer?.defaultAddress && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {[
                      shopifyCustomer.defaultAddress.address1,
                      shopifyCustomer.defaultAddress.city,
                      shopifyCustomer.defaultAddress.province,
                      shopifyCustomer.defaultAddress.zip,
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientPortalLayout>
  );
};

export default ClientProfile;
