import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchShopifyProducts, getProductIdFromGid, type ShopifyProduct } from "@/lib/shopify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type ServiceType = "daycare" | "boarding" | "grooming" | "training";

interface ServiceMapping {
  id: string;
  shopify_product_id: string;
  shopify_product_title: string;
  service_type: ServiceType;
  credit_value: number;
  created_at: string;
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  daycare: "Daycare Credits",
  boarding: "Boarding Credits",
  grooming: "Grooming Services",
  training: "Training Services",
};

const SERVICE_COLORS: Record<ServiceType, string> = {
  daycare: "bg-blue-100 text-blue-800",
  boarding: "bg-purple-100 text-purple-800",
  grooming: "bg-pink-100 text-pink-800",
  training: "bg-green-100 text-green-800",
};

export function ShopifyProductMappings() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType>("daycare");
  const [creditValue, setCreditValue] = useState(1);
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch existing mappings
  const { data: mappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ["shopify-service-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopify_service_mappings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ServiceMapping[];
    },
  });

  // Fetch Shopify products for dialog
  const loadProducts = async (query?: string) => {
    setIsLoadingProducts(true);
    try {
      const result = await fetchShopifyProducts(50, query);
      if (result?.edges) {
        setShopifyProducts(result.edges);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load Shopify products");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isAddDialogOpen) {
      loadProducts(debouncedSearch || undefined);
    }
  }, [isAddDialogOpen, debouncedSearch]);

  // Add mapping mutation
  const addMappingMutation = useMutation({
    mutationFn: async ({
      product,
      serviceType,
      creditValue,
    }: {
      product: ShopifyProduct;
      serviceType: ServiceType;
      creditValue: number;
    }) => {
      const productId = getProductIdFromGid(product.node.id);
      const { error } = await supabase.from("shopify_service_mappings").insert({
        shopify_product_id: productId,
        shopify_product_title: product.node.title,
        service_type: serviceType,
        credit_value: creditValue,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-service-mappings"] });
      toast.success("Product mapping added");
      setIsAddDialogOpen(false);
      setSelectedProduct(null);
      setCreditValue(1);
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This product is already mapped to this service type");
      } else {
        toast.error("Failed to add mapping");
      }
    },
  });

  // Delete mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shopify_service_mappings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-service-mappings"] });
      toast.success("Mapping removed");
    },
    onError: () => {
      toast.error("Failed to remove mapping");
    },
  });

  const handleAddMapping = () => {
    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }
    addMappingMutation.mutate({
      product: selectedProduct,
      serviceType: selectedServiceType,
      creditValue,
    });
  };

  // Filter products to exclude already mapped ones
  const getFilteredProducts = () => {
    const mappedIds = new Set(
      mappings
        ?.filter((m) => m.service_type === selectedServiceType)
        .map((m) => m.shopify_product_id) || []
    );
    return shopifyProducts.filter(
      (p) => !mappedIds.has(getProductIdFromGid(p.node.id))
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Product Service Mappings</CardTitle>
          <CardDescription>
            Link Shopify products to daycare credits, boarding credits, or service types
          </CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Product Mapping</DialogTitle>
              <DialogDescription>
                Select a Shopify product and map it to a service type
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select
                    value={selectedServiceType}
                    onValueChange={(v) => setSelectedServiceType(v as ServiceType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(selectedServiceType === "daycare" || selectedServiceType === "boarding") && (
                  <div className="space-y-2">
                    <Label>Credit Value</Label>
                    <Input
                      type="number"
                      min={1}
                      value={creditValue}
                      onChange={(e) => setCreditValue(parseInt(e.target.value) || 1)}
                    />
                  </div>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {selectedProduct && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                  <span className="flex-1 font-medium">{selectedProduct.node.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedProduct(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex-1 overflow-auto border rounded-md min-h-[200px]">
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredProducts().map((product) => (
                        <TableRow
                          key={product.node.id}
                          className={`cursor-pointer ${
                            selectedProduct?.node.id === product.node.id
                              ? "bg-primary/10"
                              : ""
                          }`}
                          onClick={() => setSelectedProduct(product)}
                        >
                          <TableCell className="font-medium">
                            {product.node.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {product.node.productType || "No type"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            ${parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={
                                selectedProduct?.node.id === product.node.id
                                  ? "default"
                                  : "outline"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(product);
                              }}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {getFilteredProducts().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No products found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddMapping}
                disabled={!selectedProduct || addMappingMutation.isPending}
              >
                {addMappingMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Add Mapping
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoadingMappings ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : mappings?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No product mappings configured</p>
            <p className="text-sm">Click "Add Mapping" to link Shopify products to services</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings?.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-medium">
                    {mapping.shopify_product_title}
                  </TableCell>
                  <TableCell>
                    <Badge className={SERVICE_COLORS[mapping.service_type]}>
                      {SERVICE_LABELS[mapping.service_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {mapping.service_type === "daycare" || mapping.service_type === "boarding"
                      ? mapping.credit_value
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMappingMutation.mutate(mapping.id)}
                      disabled={deleteMappingMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
