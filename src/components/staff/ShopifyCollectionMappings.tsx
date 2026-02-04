import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchShopifyCollections, getCollectionIdFromGid, type ShopifyCollection } from "@/lib/shopify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

type CollectionCategory = "reservations" | "services" | "addons" | "retail";

interface CollectionMapping {
  id: string;
  shopify_collection_id: string;
  shopify_collection_title: string;
  category: CollectionCategory;
  created_at: string;
}

const CATEGORY_LABELS: Record<CollectionCategory, string> = {
  reservations: "Reservations (Daycare/Boarding)",
  services: "Services (Grooming/Training)",
  addons: "Add-ons (Nail Trim/Bath/etc.)",
  retail: "Retail Products",
};

const CATEGORY_COLORS: Record<CollectionCategory, string> = {
  reservations: "bg-blue-100 text-blue-800",
  services: "bg-green-100 text-green-800",
  addons: "bg-cyan-100 text-cyan-800",
  retail: "bg-orange-100 text-orange-800",
};

export function ShopifyCollectionMappings() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<ShopifyCollection | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CollectionCategory>("reservations");
  const [shopifyCollections, setShopifyCollections] = useState<ShopifyCollection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);

  // Fetch existing mappings
  const { data: mappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ["shopify-collection-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopify_collection_mappings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CollectionMapping[];
    },
  });

  // Fetch Shopify collections for dialog
  const loadCollections = async () => {
    setIsLoadingCollections(true);
    try {
      const result = await fetchShopifyCollections(100);
      if (result?.edges) {
        setShopifyCollections(result.edges);
      }
    } catch (error) {
      console.error("Error loading collections:", error);
      toast.error("Failed to load Shopify collections");
    } finally {
      setIsLoadingCollections(false);
    }
  };

  useEffect(() => {
    if (isAddDialogOpen) {
      loadCollections();
    }
  }, [isAddDialogOpen]);

  // Add mapping mutation
  const addMappingMutation = useMutation({
    mutationFn: async ({
      collection,
      category,
    }: {
      collection: ShopifyCollection;
      category: CollectionCategory;
    }) => {
      const collectionId = getCollectionIdFromGid(collection.node.id);
      const { error } = await supabase.from("shopify_collection_mappings").insert({
        shopify_collection_id: collectionId,
        shopify_collection_title: collection.node.title,
        category,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-collection-mappings"] });
      toast.success("Collection category set");
      setIsAddDialogOpen(false);
      setSelectedCollection(null);
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This collection is already categorized");
      } else {
        toast.error("Failed to add collection category");
      }
    },
  });

  // Delete mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shopify_collection_mappings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-collection-mappings"] });
      toast.success("Collection category removed");
    },
    onError: () => {
      toast.error("Failed to remove collection category");
    },
  });

  // Update mapping mutation
  const updateMappingMutation = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: CollectionCategory }) => {
      const { error } = await supabase
        .from("shopify_collection_mappings")
        .update({ category })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopify-collection-mappings"] });
      toast.success("Collection category updated");
    },
    onError: () => {
      toast.error("Failed to update collection category");
    },
  });

  const handleAddMapping = () => {
    if (!selectedCollection) {
      toast.error("Please select a collection");
      return;
    }
    addMappingMutation.mutate({
      collection: selectedCollection,
      category: selectedCategory,
    });
  };

  // Filter collections to exclude already mapped ones
  const getFilteredCollections = () => {
    const mappedIds = new Set(mappings?.map((m) => m.shopify_collection_id) || []);
    return shopifyCollections.filter(
      (c) => !mappedIds.has(getCollectionIdFromGid(c.node.id))
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Collection Categories</CardTitle>
          <CardDescription>
            Categorize Shopify collections as reservations, services, or retail
          </CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto flex flex-col">
            <DialogHeader>
              <DialogTitle>Categorize Collection</DialogTitle>
              <DialogDescription>
                Select a Shopify collection and assign it to a category
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(v) => setSelectedCategory(v as CollectionCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 overflow-auto border rounded-md min-h-[200px]">
                {isLoadingCollections ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Collection</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredCollections().map((collection) => (
                        <TableRow
                          key={collection.node.id}
                          className={`cursor-pointer ${
                            selectedCollection?.node.id === collection.node.id
                              ? "bg-primary/10"
                              : ""
                          }`}
                          onClick={() => setSelectedCollection(collection)}
                        >
                          <TableCell className="font-medium">
                            {collection.node.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {collection.node.handle}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={
                                selectedCollection?.node.id === collection.node.id
                                  ? "default"
                                  : "outline"
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCollection(collection);
                              }}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {getFilteredCollections().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            No uncategorized collections found
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
                disabled={!selectedCollection || addMappingMutation.isPending}
              >
                {addMappingMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Add Collection
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
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No collections categorized</p>
            <p className="text-sm">Click "Add Collection" to categorize your Shopify collections</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collection</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings?.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-medium">
                    {mapping.shopify_collection_title}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.category}
                      onValueChange={(v) =>
                        updateMappingMutation.mutate({
                          id: mapping.id,
                          category: v as CollectionCategory,
                        })
                      }
                    >
                      <SelectTrigger className="w-[220px]">
                        <Badge className={CATEGORY_COLORS[mapping.category as CollectionCategory]}>
                          {CATEGORY_LABELS[mapping.category as CollectionCategory]}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
