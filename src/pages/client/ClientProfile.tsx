import { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { User, Mail, Phone, MapPin, UserPlus, Pencil, Save, X, MessageSquare, Bell } from 'lucide-react';
import { ClientPortalLayout } from '@/components/client/ClientPortalLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizePhone } from '@/lib/phoneUtils';

const ClientProfile = () => {
  const { clientData, shopifyCustomer, fetchClientData } = useClientAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: clientData?.first_name || '',
    last_name: clientData?.last_name || '',
    phone: clientData?.phone || '',
    address: clientData?.address || '',
    city: clientData?.city || '',
    province: clientData?.province || '',
    postal_code: clientData?.postal_code || '',
    sms_opt_in: clientData?.sms_opt_in || false,
    email_opt_in: clientData?.email_opt_in || false,
    emergency_contact_name: clientData?.emergency_contact_name || '',
    emergency_contact_phone: clientData?.emergency_contact_phone || '',
    emergency_contact_relationship: clientData?.emergency_contact_relationship || '',
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!clientData?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: normalizePhone(formData.phone) || null,
          address: formData.address || null,
          city: formData.city || null,
          province: formData.province || null,
          postal_code: formData.postal_code || null,
          sms_opt_in: formData.sms_opt_in,
          email_opt_in: formData.email_opt_in,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          emergency_contact_relationship: formData.emergency_contact_relationship || null,
        })
        .eq('id', clientData.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setIsEditing(false);
      fetchClientData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: clientData?.first_name || '',
      last_name: clientData?.last_name || '',
      phone: clientData?.phone || '',
      address: clientData?.address || '',
      city: clientData?.city || '',
      province: clientData?.province || '',
      postal_code: clientData?.postal_code || '',
      sms_opt_in: clientData?.sms_opt_in || false,
      email_opt_in: clientData?.email_opt_in || false,
      emergency_contact_name: clientData?.emergency_contact_name || '',
      emergency_contact_phone: clientData?.emergency_contact_phone || '',
      emergency_contact_relationship: clientData?.emergency_contact_relationship || '',
    });
    setIsEditing(false);
  };

  const handleEdit = () => {
    setFormData({
      first_name: clientData?.first_name || '',
      last_name: clientData?.last_name || '',
      phone: clientData?.phone || '',
      address: clientData?.address || '',
      city: clientData?.city || '',
      province: clientData?.province || '',
      postal_code: clientData?.postal_code || '',
      sms_opt_in: clientData?.sms_opt_in || false,
      email_opt_in: clientData?.email_opt_in || false,
      emergency_contact_name: clientData?.emergency_contact_name || '',
      emergency_contact_phone: clientData?.emergency_contact_phone || '',
      emergency_contact_relationship: clientData?.emergency_contact_relationship || '',
    });
    setIsEditing(true);
  };

  return (
    <ClientPortalLayout title="Your Profile" description="View and edit your account information">
      <div className="max-w-2xl space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">
                    {clientData?.first_name || ''}{' '}
                    {clientData?.last_name || ''}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">
                  {shopifyCustomer?.email || clientData?.email || 'Not provided'}
                </p>
              </div>
            </div>

            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Street Address
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Street address"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    <Input
                      id="province"
                      value={formData.province}
                      onChange={(e) => handleInputChange('province', e.target.value)}
                      placeholder="Province"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      placeholder="Postal code"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">
                      {shopifyCustomer?.phone || clientData?.phone || 'Not provided'}
                    </p>
                  </div>
                </div>

                {(clientData?.address || clientData?.city || clientData?.province || clientData?.postal_code) && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Address</p>
                      {clientData?.address && (
                        <p className="font-medium">{clientData.address}</p>
                      )}
                      {(clientData?.city || clientData?.province || clientData?.postal_code) && (
                        <p className="font-medium">
                          {[clientData?.city, clientData?.province, clientData?.postal_code].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="emergency_name">Full Name</Label>
                  <Input
                    id="emergency_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Phone Number</Label>
                  <Input
                    id="emergency_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                    placeholder="Emergency contact phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_relationship">Relationship</Label>
                  <Input
                    id="emergency_relationship"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                    placeholder="e.g., Spouse, Parent, Friend"
                  />
                </div>
              </>
            ) : (
              <>
                {clientData?.emergency_contact_name || clientData?.emergency_contact_phone || clientData?.emergency_contact_relationship ? (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {clientData?.emergency_contact_name || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">
                          {clientData?.emergency_contact_phone || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    {clientData?.emergency_contact_relationship && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <UserPlus className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Relationship</p>
                          <p className="font-medium">
                            {clientData.emergency_contact_relationship}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No emergency contact added. Click "Edit" to add one.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
        {/* Communication Preferences */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Communication Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">SMS Messages</p>
                  <p className="text-sm text-muted-foreground">
                    Receive appointment reminders and updates via text
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.sms_opt_in}
                onCheckedChange={(checked) => handleInputChange('sms_opt_in', checked)}
                disabled={!isEditing}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email Messages</p>
                  <p className="text-sm text-muted-foreground">
                    Receive newsletters, promotions, and updates via email
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.email_opt_in}
                onCheckedChange={(checked) => handleInputChange('email_opt_in', checked)}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientPortalLayout>
  );
};

export default ClientProfile;
