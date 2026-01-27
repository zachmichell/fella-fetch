import { useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShopifyProductMappings } from "@/components/staff/ShopifyProductMappings";
import { ShopifyCollectionMappings } from "@/components/staff/ShopifyCollectionMappings";
import { Package, FolderOpen } from "lucide-react";

export default function StaffShopifySettings() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shopify Settings</h1>
          <p className="text-muted-foreground">
            Map Shopify products to service types and categorize collections
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Product Mappings
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Collection Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ShopifyProductMappings />
          </TabsContent>

          <TabsContent value="collections">
            <ShopifyCollectionMappings />
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}
