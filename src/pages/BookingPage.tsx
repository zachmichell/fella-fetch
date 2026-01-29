import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Dog, ArrowRight, ArrowLeft, Check, LogIn, CreditCard, AlertTriangle, ShoppingCart, Loader2, Scissors, User, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInDays, format, parse, addMinutes } from "date-fns";
import { calculateNextGroomingDate, getGroomingDueStatus } from "@/lib/groomingUtils";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { storefrontApiRequest, SHOPIFY_STORE_PERMANENT_DOMAIN } from "@/lib/shopify";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GroomerSelector } from "@/components/booking/GroomerSelector";
import { GroomingCalendar } from "@/components/booking/GroomingCalendar";
import { GroomingTimeSlots } from "@/components/booking/GroomingTimeSlots";

import iconStay from "@/assets/icons/icon-stay.png";
import iconGroom from "@/assets/icons/icon-groom.png";
import iconTrain from "@/assets/icons/icon-train.png";

type ServiceType = "daycare" | "boarding" | "grooming" | "training";

interface SelectedPet {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  grooming_product_id: string | null;
  grooming_product_title: string | null;
  grooming_frequency: string | null;
  last_grooming_date: string | null;
}

interface Groomer {
  id: string;
  name: string;
  color: string | null;
}

interface GroomerSchedule {
  groomer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface GroomingVariant {
  id: string;
  title: string;
  price: string;
}

interface GroomingService {
  id: string;
  shopify_product_id: string;
  shopify_product_title: string;
  variants: GroomingVariant[];
}

interface BookingData {
  service: ServiceType | null;
  selectedPets: SelectedPet[];
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  selectedGroomerId: string | null;
  selectedGroomingService: GroomingService | null;
  selectedGroomingVariant: GroomingVariant | null;
  groomingDate: Date | null;
  groomingTime: string | null;
  groomingEndTime: string | null;
  groomingDurationMinutes: number;
}

const serviceOptions = [
  { id: "daycare" as const, name: "Daycare", icon: iconStay, description: "Supervised play & socialization for your pup" },
  { id: "boarding" as const, name: "Boarding", icon: iconStay, description: "Comfortable overnight stays with 24/7 care" },
  { id: "grooming" as const, name: "Grooming", icon: iconGroom, description: "Professional baths, haircuts & spa treatments" },
  { id: "training" as const, name: "Training", icon: iconTrain, description: "Group classes & private sessions" },
];

const groomingTrainingTimeSlots = [
  "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
];

// Shopify Cart mutations
const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
      userErrors { field message }
    }
  }
`;

const BookingPage = () => {
  const { isAuthenticated, pets, clientData, loading } = useClientAuth();
  const [step, setStep] = useState(1);
  const [isCreatingCart, setIsCreatingCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creditProduct, setCreditProduct] = useState<{ shopify_product_id: string; shopify_product_title: string } | null>(null);
  
  // Grooming-specific state
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [groomerSchedules, setGroomerSchedules] = useState<GroomerSchedule[]>([]);
  const [loadingGroomers, setLoadingGroomers] = useState(false);
  const [existingGroomingReservations, setExistingGroomingReservations] = useState<any[]>([]);
  const [groomerServiceDurations, setGroomerServiceDurations] = useState<Map<string, number>>(new Map());
  const [groomingServices, setGroomingServices] = useState<GroomingService[]>([]);
  const [loadingGroomingServices, setLoadingGroomingServices] = useState(false);

  const [bookingData, setBookingData] = useState<BookingData>({
    service: null,
    selectedPets: [],
    date: "",
    time: "",
    endDate: "",
    endTime: "",
    selectedGroomerId: null,
    selectedGroomingService: null,
    selectedGroomingVariant: null,
    groomingDate: null,
    groomingTime: null,
    groomingEndTime: null,
    groomingDurationMinutes: 60,
  });

  // Fetch groomers and schedules when grooming is selected
  useEffect(() => {
    const fetchGroomersAndSchedules = async () => {
      if (bookingData.service !== "grooming") return;
      
      setLoadingGroomers(true);
      try {
        // Fetch active groomers
        const { data: groomersData, error: groomersError } = await supabase
          .from("groomers")
          .select("id, name, color")
          .eq("is_active", true)
          .order("sort_order");

        if (groomersError) throw groomersError;
        setGroomers(groomersData || []);

        // Fetch all groomer schedules
        const { data: schedulesData, error: schedulesError } = await supabase
          .from("groomer_schedules")
          .select("groomer_id, day_of_week, start_time, end_time, is_available");

        if (schedulesError) throw schedulesError;
        setGroomerSchedules(schedulesData || []);

        // Fetch existing grooming reservations with pet/client info
        const { data: reservationsData } = await supabase
          .from("reservations")
          .select(`
            start_date, 
            start_time, 
            end_time, 
            groomer_id,
            pets:pet_id (
              name,
              clients:client_id (
                first_name,
                last_name
              )
            )
          `)
          .eq("service_type", "grooming")
          .neq("status", "cancelled");

        // Transform to include pet_name and client_name
        const transformedReservations = (reservationsData || []).map((r: any) => ({
          start_date: r.start_date,
          start_time: r.start_time,
          end_time: r.end_time,
          groomer_id: r.groomer_id,
          pet_name: r.pets?.name || null,
          client_name: r.pets?.clients 
            ? `${r.pets.clients.first_name} ${r.pets.clients.last_name}` 
            : null,
        }));

        setExistingGroomingReservations(transformedReservations);
      } catch (error) {
        console.error("Error fetching groomers:", error);
        toast.error("Failed to load groomers");
      } finally {
        setLoadingGroomers(false);
      }
    };

    fetchGroomersAndSchedules();
  }, [bookingData.service]);

  // Fetch groomer service durations when groomer and grooming service are selected
  useEffect(() => {
    const fetchServiceDuration = async () => {
      // Only fetch if we have grooming service selected
      if (bookingData.service !== "grooming") return;
      if (!bookingData.selectedGroomerId) {
        // Reset to default when no groomer selected
        setBookingData(prev => ({ ...prev, groomingDurationMinutes: 60 }));
        return;
      }
      
      // Use the selected grooming service, not the pet's recommended product
      const selectedService = bookingData.selectedGroomingService;
      if (!selectedService?.shopify_product_id) {
        // No service selected, use default duration
        setBookingData(prev => ({ ...prev, groomingDurationMinutes: 60 }));
        return;
      }

      try {
        // Fetch duration for this groomer + product combination
        const { data, error } = await supabase
          .from("groomer_service_durations")
          .select("duration_minutes")
          .eq("groomer_id", bookingData.selectedGroomerId)
          .eq("shopify_product_id", selectedService.shopify_product_id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching service duration:", error);
          return;
        }

        const duration = data?.duration_minutes || 60;
        setBookingData(prev => ({ ...prev, groomingDurationMinutes: duration }));
      } catch (error) {
        console.error("Error fetching service duration:", error);
      }
    };

    fetchServiceDuration();
  }, [bookingData.service, bookingData.selectedGroomerId, bookingData.selectedGroomingService]);

  // Fetch grooming services using product_type:Groom (same source as groomer durations)
  useEffect(() => {
    const fetchGroomingServices = async () => {
      if (bookingData.service !== "grooming") {
        setGroomingServices([]);
        return;
      }

      setLoadingGroomingServices(true);
      try {
        // Query products with product_type:Groom including variants (same as GroomerDurationsDialog)
        const GROOM_PRODUCTS_QUERY = `
          query GetGroomProducts {
            products(first: 100, query: "product_type:Groom") {
              edges {
                node {
                  id
                  title
                  productType
                  variants(first: 50) {
                    edges {
                      node {
                        id
                        title
                        price {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const response = await storefrontApiRequest(GROOM_PRODUCTS_QUERY, {});
        
        if (response?.data?.products?.edges) {
          const products = response.data.products.edges;
          // Filter to only Groom/Grooming product types
          const groomProducts = products.filter((edge: any) => 
            edge.node.productType === 'Groom' || edge.node.productType === 'Grooming'
          );
          
          const services: GroomingService[] = groomProducts.map((edge: any) => {
            const product = edge.node;
            // Extract numeric ID from gid://shopify/Product/123456
            const productIdMatch = product.id.match(/Product\/(\d+)/);
            const numericId = productIdMatch ? productIdMatch[1] : product.id;
            
            // Map variants
            const variants: GroomingVariant[] = product.variants.edges.map((variantEdge: any) => {
              const variant = variantEdge.node;
              const variantIdMatch = variant.id.match(/ProductVariant\/(\d+)/);
              const variantNumericId = variantIdMatch ? variantIdMatch[1] : variant.id;
              
              return {
                id: variantNumericId,
                title: variant.title,
                price: variant.price?.amount || '0',
              };
            });
            
            return {
              id: numericId,
              shopify_product_id: numericId,
              shopify_product_title: product.title,
              variants,
            };
          });

          setGroomingServices(services);

          // Pre-select the pet's recommended service if available
          const selectedPet = bookingData.selectedPets[0];
          if (selectedPet?.grooming_product_id && !bookingData.selectedGroomingService) {
            const recommendedService = services.find(
              s => s.shopify_product_id === selectedPet.grooming_product_id
            );
            if (recommendedService) {
              setBookingData(prev => ({ ...prev, selectedGroomingService: recommendedService }));
            }
          }
        } else {
          setGroomingServices([]);
        }
      } catch (error) {
        console.error("Error fetching grooming services:", error);
        toast.error("Failed to load grooming services");
      } finally {
        setLoadingGroomingServices(false);
      }
    };

    fetchGroomingServices();
  }, [bookingData.service]);

  // Fetch the linked credit product for daycare/boarding
  useEffect(() => {
    const fetchCreditProduct = async () => {
      if (bookingData.service !== "daycare" && bookingData.service !== "boarding") {
        setCreditProduct(null);
        return;
      }

      const { data, error } = await supabase
        .from("shopify_service_mappings")
        .select("shopify_product_id, shopify_product_title")
        .eq("service_type", bookingData.service)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credit product:", error);
        return;
      }

      setCreditProduct(data);
    };

    fetchCreditProduct();
  }, [bookingData.service]);

  // Calculate total steps based on service type
  const getStepConfig = () => {
    if (bookingData.service === "grooming") {
      // Grooming: Service → Pet → Groomer → Groom Type → Date → Time → Confirm
      return {
        totalSteps: 7,
        labels: ["Service", "Pet", "Groomer", "Groom Type", "Date", "Time", "Confirm"],
      };
    } else if (bookingData.service === "daycare" || bookingData.service === "boarding") {
      // Daycare/Boarding: Service → Pets → Date/Time → Credits → Confirm
      return {
        totalSteps: 5,
        labels: ["Service", "Select Pets", "Date & Time", "Credits", "Confirm"],
      };
    } else {
      // Training: Service → Pet → Date/Time → Confirm
      return {
        totalSteps: 4,
        labels: ["Service", "Select Pets", "Date & Time", "Confirm"],
      };
    }
  };

  const { totalSteps, labels: stepLabels } = getStepConfig();
  const needsCreditsStep = bookingData.service === "daycare" || bookingData.service === "boarding";
  const isGrooming = bookingData.service === "grooming";

  // Calculate required credits
  const creditsRequired = useMemo(() => {
    if (!bookingData.service || !bookingData.date || !bookingData.endDate || bookingData.selectedPets.length === 0) {
      return 0;
    }

    const startDate = new Date(bookingData.date);
    const endDate = new Date(bookingData.endDate);

    if (bookingData.service === "boarding") {
      const nights = Math.max(1, differenceInDays(endDate, startDate));
      return nights * bookingData.selectedPets.length;
    } else if (bookingData.service === "daycare") {
      const days = differenceInDays(endDate, startDate) + 1;
      return days * bookingData.selectedPets.length;
    }

    return 0;
  }, [bookingData.service, bookingData.date, bookingData.endDate, bookingData.selectedPets.length]);

  // Get current credit balance
  const currentCredits = useMemo(() => {
    if (!clientData) return 0;
    if (bookingData.service === "boarding") {
      return clientData.boarding_credits;
    } else if (bookingData.service === "daycare") {
      return clientData.daycare_credits;
    }
    return 0;
  }, [clientData, bookingData.service]);

  const creditsAfterBooking = currentCredits - creditsRequired;
  const hasEnoughCredits = creditsAfterBooking >= 0;
  const creditsNeeded = hasEnoughCredits ? 0 : Math.abs(creditsAfterBooking);

  const handleServiceSelect = (service: ServiceType) => {
    setBookingData({ 
      ...bookingData, 
      service,
      selectedGroomerId: null,
      selectedGroomingService: null,
      groomingDate: null,
      groomingTime: null,
      groomingEndTime: null,
    });
    setStep(2);
  };

  const handlePetToggle = (pet: SelectedPet) => {
    const isSelected = bookingData.selectedPets.some(p => p.id === pet.id);
    if (isSelected) {
      setBookingData({
        ...bookingData,
        selectedPets: bookingData.selectedPets.filter(p => p.id !== pet.id),
        selectedGroomingService: null, // Reset service when pet changes
      });
    } else {
      // For grooming, only allow one pet at a time
      if (isGrooming) {
        setBookingData({
          ...bookingData,
          selectedPets: [pet],
          selectedGroomingService: null, // Reset service when pet changes
        });
      } else {
        setBookingData({
          ...bookingData,
          selectedPets: [...bookingData.selectedPets, pet]
        });
      }
    }
  };

  const handleGroomerSelect = (groomerId: string | null) => {
    setBookingData({
      ...bookingData,
      selectedGroomerId: groomerId,
      groomingDate: null, // Reset date when groomer changes
      groomingTime: null,
      groomingEndTime: null,
    });
  };

  const handleGroomingDateSelect = (date: Date) => {
    setBookingData({
      ...bookingData,
      groomingDate: date,
      groomingTime: null, // Reset time when date changes
    });
  };

  const handleGroomingTimeSelect = (time: string) => {
    // Calculate end time using the fetched duration (or default 60 minutes)
    const baseDate = new Date(2000, 0, 1);
    const startTime = parse(time, "h:mm a", baseDate);
    const endTime = addMinutes(startTime, bookingData.groomingDurationMinutes);
    const endTimeStr = format(endTime, "h:mm a");
    
    setBookingData({
      ...bookingData,
      groomingTime: time,
      groomingEndTime: endTimeStr,
    });
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1: 
        return !!bookingData.service;
      case 2: 
        return bookingData.selectedPets.length > 0;
      case 3:
        if (isGrooming) {
          // Groomer selection step - always can proceed (null = any available)
          return true;
        }
        // Date/Time step for other services
        if (bookingData.service === "daycare" || bookingData.service === "boarding") {
          return !!bookingData.date && !!bookingData.time && !!bookingData.endDate && !!bookingData.endTime;
        }
        return !!bookingData.date && !!bookingData.time;
      case 4:
        if (isGrooming) {
          // Grooming service selection step - must select a service AND a variant
          return !!bookingData.selectedGroomingService && !!bookingData.selectedGroomingVariant;
        }
        if (needsCreditsStep) {
          return hasEnoughCredits;
        }
        return true;
      case 5:
        if (isGrooming) {
          // Calendar step - date must be selected
          return !!bookingData.groomingDate;
        }
        return true;
      case 6:
        if (isGrooming) {
          // Time slot step - time must be selected
          return !!bookingData.groomingTime;
        }
        return true;
      default: 
        return true;
    }
  };

  // Submit grooming reservation
  const handleSubmitGroomingReservation = async () => {
    if (!bookingData.groomingDate || !bookingData.groomingTime || bookingData.selectedPets.length === 0) {
      toast.error("Please complete all booking details");
      return;
    }

    setIsSubmitting(true);
    try {
      const pet = bookingData.selectedPets[0];
      const startDate = format(bookingData.groomingDate, "yyyy-MM-dd");
      
      // Convert time to 24h format for database
      const parsedTime = parse(bookingData.groomingTime, "h:mm a", new Date());
      const startTime = format(parsedTime, "HH:mm:ss");

      const { error } = await supabase.from("reservations").insert({
        pet_id: pet.id,
        service_type: "grooming",
        status: "pending",
        start_date: startDate,
        start_time: startTime,
        groomer_id: bookingData.selectedGroomerId,
        notes: bookingData.selectedGroomerId 
          ? `Requested groomer: ${groomers.find(g => g.id === bookingData.selectedGroomerId)?.name}`
          : "Any available groomer",
      });

      if (error) throw error;

      toast.success("Appointment requested!", {
        description: "We'll confirm your grooming appointment shortly.",
      });

      // Reset form
      setStep(1);
      setBookingData({
        service: null,
        selectedPets: [],
        date: "",
        time: "",
        endDate: "",
        endTime: "",
        selectedGroomerId: null,
        selectedGroomingService: null,
        selectedGroomingVariant: null,
        groomingDate: null,
        groomingTime: null,
        groomingEndTime: null,
        groomingDurationMinutes: 60,
      });
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast.error("Failed to submit reservation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Shopify cart for credit purchase
  const handlePurchaseCredits = async () => {
    if (!creditProduct) {
      toast.error("No credit package found", {
        description: "Please contact us to purchase credits."
      });
      return;
    }

    setIsCreatingCart(true);
    try {
      const PRODUCT_QUERY = `
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
            title
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  availableForSale
                }
              }
            }
          }
        }
      `;

      const productGid = `gid://shopify/Product/${creditProduct.shopify_product_id}`;
      const productData = await storefrontApiRequest(PRODUCT_QUERY, { id: productGid });
      
      if (!productData?.data?.product?.variants?.edges?.length) {
        toast.error("Product not available", {
          description: "The credit package is currently unavailable."
        });
        return;
      }

      const firstVariant = productData.data.product.variants.edges[0].node;
      
      const cartData = await storefrontApiRequest(CART_CREATE_MUTATION, {
        input: {
          lines: [{ quantity: creditsNeeded, merchandiseId: firstVariant.id }]
        }
      });

      if (cartData?.data?.cartCreate?.userErrors?.length > 0) {
        console.error("Cart creation errors:", cartData.data.cartCreate.userErrors);
        toast.error("Failed to create checkout");
        return;
      }

      const checkoutUrl = cartData?.data?.cartCreate?.cart?.checkoutUrl;
      if (checkoutUrl) {
        const url = new URL(checkoutUrl);
        url.searchParams.set('channel', 'online_store');
        window.open(url.toString(), '_blank');
      } else {
        toast.error("Failed to create checkout URL");
      }
    } catch (error) {
      console.error("Error creating cart:", error);
      toast.error("Failed to create checkout");
    } finally {
      setIsCreatingCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container-app max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Book Your Visit
            </h1>
            <p className="text-muted-foreground">
              Quick and easy booking in just a few steps
            </p>
          </motion.div>

          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      s <= step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s < step ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < totalSteps && (
                    <div className={`hidden sm:block w-8 lg:w-16 h-1 mx-1 rounded ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
              {stepLabels.map((label, i) => (
                <span key={i} className="text-center flex-1">{label}</span>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {/* Step 1: Select Service */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6">
                  What service would you like to book?
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {serviceOptions.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service.id)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all ${
                        bookingData.service === service.id
                          ? "border-primary bg-accent/30"
                          : "border-border hover:border-primary/50 bg-card"
                      }`}
                    >
                      <img src={service.icon} alt={service.name} className="w-12 h-12 mb-3" />
                      <h3 className="font-semibold text-foreground text-lg">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Select Pets */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Dog className="w-5 h-5 text-primary" />
                  {isGrooming ? "Select Your Pet" : "Select Your Pets"}
                </h2>

                {!isAuthenticated ? (
                  <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <LogIn className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">Sign in to see your pets</h3>
                    <p className="text-muted-foreground">
                      Log in to your account to select from your registered pets.
                    </p>
                    <Button asChild variant="hero">
                      <Link to="/login">Sign In</Link>
                    </Button>
                  </div>
                ) : loading ? (
                  <div className="bg-card rounded-2xl border border-border p-8 text-center">
                    <p className="text-muted-foreground">Loading your pets...</p>
                  </div>
                ) : pets.length === 0 ? (
                  <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <Dog className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">No pets found</h3>
                    <p className="text-muted-foreground">
                      You don't have any pets registered yet. Add pets to your profile to book services.
                    </p>
                    <Button asChild variant="outline">
                      <Link to="/portal/pets">Add a Pet</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      {isGrooming 
                        ? "Select the pet for this grooming appointment."
                        : "Select one or more pets for this booking. Each pet will have their own reservation."
                      }
                    </p>
                    <div className="grid gap-3">
                      {pets.map((pet) => {
                        const isSelected = bookingData.selectedPets.some(p => p.id === pet.id);
                        return (
                          <button
                            key={pet.id}
                            onClick={() => handlePetToggle({
                              id: pet.id,
                              name: pet.name,
                              breed: pet.breed,
                              photo_url: pet.photo_url,
                              grooming_product_id: pet.grooming_product_id,
                              grooming_product_title: pet.grooming_product_title,
                              grooming_frequency: pet.grooming_frequency,
                              last_grooming_date: pet.last_grooming_date,
                            })}
                            className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all text-left ${
                              isSelected
                                ? "border-primary bg-accent/30"
                                : "border-border hover:border-primary/50 bg-card"
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {!isGrooming && (
                                <Checkbox
                                  checked={isSelected}
                                  className="pointer-events-none"
                                />
                              )}
                              {pet.photo_url ? (
                                <img 
                                  src={pet.photo_url} 
                                  alt={pet.name} 
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                  <Dog className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-foreground">{pet.name}</h3>
                                {pet.breed && (
                                  <p className="text-sm text-muted-foreground">{pet.breed}</p>
                                )}
                                {isGrooming && pet.grooming_product_title && (
                                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                    <Scissors className="w-3 h-3" />
                                    Recommended: {pet.grooming_product_title}
                                  </p>
                                )}
                                {isGrooming && (() => {
                                  const nextDate = calculateNextGroomingDate(pet.last_grooming_date, pet.grooming_frequency);
                                  const status = getGroomingDueStatus(nextDate);
                                  if (!status.label) return null;
                                  return (
                                    <p className={`text-xs mt-1 flex items-center gap-1 ${
                                      status.isOverdue ? 'text-destructive font-medium' : 
                                      status.isDueToday ? 'text-warning font-medium' :
                                      status.isDueSoon ? 'text-primary' : 'text-muted-foreground'
                                    }`}>
                                      <CalendarClock className="w-3 h-3" />
                                      {status.label}
                                    </p>
                                  );
                                })()}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {bookingData.selectedPets.length > 0 && !isGrooming && (
                      <div className="bg-accent/20 rounded-xl p-4 text-sm text-foreground">
                        <strong>{bookingData.selectedPets.length}</strong> pet{bookingData.selectedPets.length > 1 ? 's' : ''} selected
                        {bookingData.selectedPets.length > 1 && (
                          <span className="text-muted-foreground ml-1">
                            — {bookingData.selectedPets.length} separate reservations will be created
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Step 3: Groomer Selection (Grooming only) */}
            {step === 3 && isGrooming && (
              <motion.div
                key="step3-groomer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-primary" />
                  Select Your Groomer
                </h2>
                <p className="text-muted-foreground">
                  Choose a specific groomer or let us match you with the first available.
                </p>
                <GroomerSelector
                  groomers={groomers}
                  selectedGroomerId={bookingData.selectedGroomerId}
                  onSelect={handleGroomerSelect}
                  loading={loadingGroomers}
                />
              </motion.div>
            )}

            {/* Step 4: Grooming Service Selection (Grooming only) */}
            {step === 4 && isGrooming && (
              <motion.div
                key="step4-service"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-primary" />
                  {bookingData.selectedGroomingService ? "Select Size/Option" : "Select Grooming Service"}
                </h2>
                <p className="text-muted-foreground">
                  {bookingData.selectedGroomingService 
                    ? `Choose an option for ${bookingData.selectedGroomingService.shopify_product_title}`
                    : `Choose the grooming service you'd like for ${bookingData.selectedPets[0]?.name}.`
                  }
                </p>
                
                {/* Show recommended service if pet has one and no service selected yet */}
                {!bookingData.selectedGroomingService && bookingData.selectedPets[0]?.grooming_product_title && (
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm text-primary font-medium flex items-center gap-2">
                      <Scissors className="w-4 h-4" />
                      Recommended: {bookingData.selectedPets[0].grooming_product_title}
                    </p>
                  </div>
                )}

                {loadingGroomingServices ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : groomingServices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scissors className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No grooming services available</p>
                    <p className="text-sm">Please contact us to book a grooming appointment.</p>
                  </div>
                ) : !bookingData.selectedGroomingService ? (
                  /* Step 1: Select Product */
                  <div className="grid gap-3">
                    {groomingServices.map((service) => {
                      const isRecommended = service.shopify_product_id === bookingData.selectedPets[0]?.grooming_product_id;
                      
                      return (
                        <button
                          key={service.id}
                          onClick={() => {
                            // If only one variant, auto-select it
                            if (service.variants.length === 1) {
                              setBookingData({ 
                                ...bookingData, 
                                selectedGroomingService: service,
                                selectedGroomingVariant: service.variants[0]
                              });
                            } else {
                              setBookingData({ 
                                ...bookingData, 
                                selectedGroomingService: service,
                                selectedGroomingVariant: null
                              });
                            }
                          }}
                          className="relative w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <Scissors className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{service.shopify_product_title}</span>
                                  {isRecommended && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                                {service.variants.length > 1 && (
                                  <span className="text-sm text-muted-foreground">
                                    {service.variants.length} options available
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Step 2: Select Variant */
                  <div className="space-y-4">
                    {/* Back button to change product */}
                    <button
                      onClick={() => setBookingData({ 
                        ...bookingData, 
                        selectedGroomingService: null,
                        selectedGroomingVariant: null
                      })}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Change service
                    </button>
                    
                    <div className="grid gap-3">
                      {bookingData.selectedGroomingService.variants.map((variant) => {
                        const isSelected = bookingData.selectedGroomingVariant?.id === variant.id;
                        
                        return (
                          <button
                            key={variant.id}
                            onClick={() => setBookingData({ ...bookingData, selectedGroomingVariant: variant })}
                            className={`relative w-full p-4 rounded-xl border-2 transition-all text-left ${
                              isSelected 
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}>
                                  <Scissors className="w-5 h-5" />
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">
                                    {variant.title === "Default Title" 
                                      ? bookingData.selectedGroomingService.shopify_product_title 
                                      : variant.title}
                                  </span>
                                  <p className="text-sm text-muted-foreground">
                                    ${parseFloat(variant.price).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 5: Calendar (Grooming only) */}
            {step === 5 && isGrooming && (
              <motion.div
                key="step5-calendar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Select a Date
                </h2>
                <p className="text-muted-foreground">
                  {bookingData.selectedGroomerId 
                    ? `Showing availability for ${groomers.find(g => g.id === bookingData.selectedGroomerId)?.name}`
                    : "Showing dates when any groomer is available"
                  }
                </p>
                <GroomingCalendar
                  selectedGroomerId={bookingData.selectedGroomerId}
                  groomers={groomers}
                  schedules={groomerSchedules}
                  selectedDate={bookingData.groomingDate}
                  onSelectDate={handleGroomingDateSelect}
                  existingReservations={existingGroomingReservations}
                />
              </motion.div>
            )}

            {/* Step 6: Time Slots (Grooming only) */}
            {step === 6 && isGrooming && (
              <motion.div
                key="step6-time"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Select a Time
                </h2>
                {bookingData.groomingDate && (
                  <GroomingTimeSlots
                    selectedDate={bookingData.groomingDate}
                    selectedGroomerId={bookingData.selectedGroomerId}
                    groomers={groomers}
                    schedules={groomerSchedules}
                    selectedTime={bookingData.groomingTime}
                    onSelectTime={handleGroomingTimeSelect}
                    existingReservations={existingGroomingReservations}
                  />
                )}
              </motion.div>
            )}

            {/* Step 7: Confirmation (Grooming) */}
            {step === 7 && isGrooming && (
              <motion.div
                key="step7-confirm-grooming"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6">
                  Review Your Appointment
                </h2>

                <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  {/* Pet */}
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    {bookingData.selectedPets[0]?.photo_url ? (
                      <img 
                        src={bookingData.selectedPets[0].photo_url} 
                        alt={bookingData.selectedPets[0].name} 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Dog className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-foreground">{bookingData.selectedPets[0]?.name}</span>
                      {bookingData.selectedPets[0]?.breed && (
                        <span className="text-muted-foreground text-sm ml-2">• {bookingData.selectedPets[0].breed}</span>
                      )}
                    </div>
                  </div>

                  {/* Selected Grooming Service & Variant */}
                  {bookingData.selectedGroomingService && (
                    <div className="flex justify-between items-center pb-4 border-b border-border">
                      <span className="text-muted-foreground">Service</span>
                      <div className="text-right">
                        <span className="font-semibold text-foreground flex items-center gap-1 justify-end">
                          <Scissors className="w-4 h-4" />
                          {bookingData.selectedGroomingService.shopify_product_title}
                        </span>
                        {bookingData.selectedGroomingVariant && (
                          <span className="text-sm text-muted-foreground">
                            {bookingData.selectedGroomingVariant.title !== "Default Title" && (
                              <span>{bookingData.selectedGroomingVariant.title} • </span>
                            )}
                            ${parseFloat(bookingData.selectedGroomingVariant.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Next Grooming Due */}
                  {(() => {
                    const pet = bookingData.selectedPets[0];
                    const nextDate = calculateNextGroomingDate(pet?.last_grooming_date, pet?.grooming_frequency);
                    const status = getGroomingDueStatus(nextDate);
                    if (!status.label) return null;
                    return (
                      <div className="flex justify-between items-center pb-4 border-b border-border">
                        <span className="text-muted-foreground">Grooming Due</span>
                        <span className={`font-semibold flex items-center gap-1 ${
                          status.isOverdue ? 'text-destructive' : 
                          status.isDueToday ? 'text-warning' :
                          status.isDueSoon ? 'text-primary' : 'text-foreground'
                        }`}>
                          <CalendarClock className="w-4 h-4" />
                          {status.label}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Groomer */}
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-muted-foreground">Groomer</span>
                    <div className="flex items-center gap-2">
                      {bookingData.selectedGroomerId ? (
                        <>
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: groomers.find(g => g.id === bookingData.selectedGroomerId)?.color || '#3b82f6' }}
                          >
                            <User className="w-3 h-3 text-white" />
                          </div>
                          <span className="font-semibold text-foreground">
                            {groomers.find(g => g.id === bookingData.selectedGroomerId)?.name}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-foreground">Any Available</span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-semibold text-foreground">
                      {bookingData.groomingDate && format(bookingData.groomingDate, "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-semibold text-foreground">
                      {bookingData.groomingTime}
                      {bookingData.groomingEndTime && ` – ${bookingData.groomingEndTime}`}
                    </span>
                  </div>

                  {/* Total */}
                  {bookingData.selectedGroomingVariant && (
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-semibold text-foreground">Total</span>
                      <span className="text-xl font-bold text-primary">
                        ${parseFloat(bookingData.selectedGroomingVariant.price).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-accent/20 rounded-2xl p-6 text-center">
                  <p className="text-foreground mb-2">
                    Your appointment request will be sent to our team
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You'll receive a confirmation once approved
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Date & Time (Non-grooming services) */}
            {step === 3 && !isGrooming && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {(bookingData.service === "daycare" || bookingData.service === "boarding") ? (
                  <>
                    {/* Start Date & Time */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          Drop-off Date
                        </h2>
                        <input
                          type="date"
                          value={bookingData.date}
                          onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full p-4 rounded-xl border border-border bg-card text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-primary" />
                          Drop-off Time
                        </h2>
                        <Input
                          type="text"
                          value={bookingData.time}
                          onChange={(e) => setBookingData({ ...bookingData, time: e.target.value })}
                          placeholder="e.g., 8:30 AM"
                          className="w-full p-4 h-14 rounded-xl border border-border bg-card text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* End Date & Time */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          Pick-up Date
                        </h2>
                        <input
                          type="date"
                          value={bookingData.endDate}
                          onChange={(e) => setBookingData({ ...bookingData, endDate: e.target.value })}
                          min={bookingData.date || new Date().toISOString().split('T')[0]}
                          className="w-full p-4 rounded-xl border border-border bg-card text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-primary" />
                          Pick-up Time
                        </h2>
                        <Input
                          type="text"
                          value={bookingData.endTime}
                          onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })}
                          placeholder="e.g., 5:00 PM"
                          className="w-full p-4 h-14 rounded-xl border border-border bg-card text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Select a Date
                      </h2>
                      <input
                        type="date"
                        value={bookingData.date}
                        onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full p-4 rounded-xl border border-border bg-card text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Select a Time
                      </h2>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {groomingTrainingTimeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setBookingData({ ...bookingData, time })}
                            className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                              bookingData.time === time
                                ? "border-primary bg-accent/30 text-primary"
                                : "border-border hover:border-primary/50 text-foreground"
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 4: Credits Check (for daycare/boarding only) */}
            {step === 4 && needsCreditsStep && (
              <motion.div
                key="step4-credits"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {bookingData.service === "boarding" ? "Boarding" : "Daycare"} Credits
                </h2>

                {/* Credit Summary Card */}
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-muted-foreground">Current Balance</span>
                    <span className="font-semibold text-foreground text-lg">
                      {currentCredits} {bookingData.service === "boarding" ? "night" : "day"}{currentCredits !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <div>
                      <span className="text-muted-foreground">Required for this booking</span>
                      <p className="text-sm text-muted-foreground">
                        {bookingData.selectedPets.length} pet{bookingData.selectedPets.length > 1 ? 's' : ''} × {' '}
                        {bookingData.service === "boarding" 
                          ? `${Math.max(1, differenceInDays(new Date(bookingData.endDate), new Date(bookingData.date)))} night${Math.max(1, differenceInDays(new Date(bookingData.endDate), new Date(bookingData.date))) !== 1 ? 's' : ''}`
                          : `${differenceInDays(new Date(bookingData.endDate), new Date(bookingData.date)) + 1} day${differenceInDays(new Date(bookingData.endDate), new Date(bookingData.date)) + 1 !== 1 ? 's' : ''}`
                        }
                      </p>
                    </div>
                    <span className="font-semibold text-foreground text-lg">
                      -{creditsRequired} {bookingData.service === "boarding" ? "night" : "day"}{creditsRequired !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold text-foreground">Balance After Booking</span>
                    <span className={`font-bold text-xl ${hasEnoughCredits ? 'text-green-600' : 'text-destructive'}`}>
                      {creditsAfterBooking} {bookingData.service === "boarding" ? "night" : "day"}{creditsAfterBooking !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Not Enough Credits Warning */}
                {!hasEnoughCredits && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-foreground">Not Enough Credits</h3>
                        <p className="text-muted-foreground text-sm">
                          You need <strong>{creditsNeeded} more {bookingData.service === "boarding" ? "boarding" : "daycare"} credit{creditsNeeded !== 1 ? 's' : ''}</strong> to complete this booking.
                          Purchase a credit package to continue.
                        </p>
                      </div>
                    </div>

                    <Button 
                      variant="hero" 
                      className="w-full" 
                      onClick={handlePurchaseCredits}
                      disabled={isCreatingCart}
                    >
                      {isCreatingCart ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5" />
                          Purchase Credit Package
                        </>
                      )}
                    </Button>

                    <p className="text-sm text-muted-foreground text-center mt-3">
                      After completing your purchase, please return to this page to finish your reservation.
                    </p>
                  </div>
                )}

                {/* Enough Credits Success */}
                {hasEnoughCredits && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                      <Check className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="font-semibold text-foreground">You have enough credits!</h3>
                        <p className="text-muted-foreground text-sm">
                          Continue to review and submit your reservation request.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Final Step: Confirmation (Non-grooming) */}
            {((step === 4 && !needsCreditsStep && !isGrooming) || (step === 5 && needsCreditsStep)) && (
              <motion.div
                key="step-confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6">
                  Review Your Booking{bookingData.selectedPets.length > 1 ? 's' : ''}
                </h2>

                {bookingData.selectedPets.length > 1 && (
                  <div className="bg-accent/20 rounded-xl p-4 text-sm text-foreground mb-4">
                    You are booking <strong>{bookingData.selectedPets.length} reservations</strong> — one for each pet selected.
                  </div>
                )}

                <div className="space-y-4">
                  {bookingData.selectedPets.map((pet) => (
                    <div key={pet.id} className="bg-card rounded-2xl border border-border p-6 space-y-4">
                      <div className="flex items-center gap-3 pb-4 border-b border-border">
                        {pet.photo_url ? (
                          <img 
                            src={pet.photo_url} 
                            alt={pet.name} 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Dog className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-foreground">{pet.name}</span>
                          {pet.breed && (
                            <span className="text-muted-foreground text-sm ml-2">• {pet.breed}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pb-4 border-b border-border">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-semibold text-foreground capitalize">
                          {serviceOptions.find(s => s.id === bookingData.service)?.name}
                        </span>
                      </div>

                      {(bookingData.service === "daycare" || bookingData.service === "boarding") ? (
                        <>
                          <div className="flex justify-between items-center pb-4 border-b border-border">
                            <span className="text-muted-foreground">Drop-off</span>
                            <span className="font-semibold text-foreground">
                              {bookingData.date ? new Date(bookingData.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''} at {bookingData.time}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Pick-up</span>
                            <span className="font-semibold text-foreground">
                              {bookingData.endDate ? new Date(bookingData.endDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''} at {bookingData.endTime}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center pb-4 border-b border-border">
                            <span className="text-muted-foreground">Date</span>
                            <span className="font-semibold text-foreground">
                              {bookingData.date ? new Date(bookingData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Time</span>
                            <span className="font-semibold text-foreground">{bookingData.time}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {needsCreditsStep && (
                  <div className="bg-accent/20 rounded-2xl p-6 text-center space-y-2">
                    <p className="text-foreground">
                      <strong>{creditsRequired}</strong> {bookingData.service === "boarding" ? "boarding" : "daycare"} credit{creditsRequired !== 1 ? 's' : ''} will be used
                    </p>
                    <p className="text-sm text-muted-foreground">
                      New balance: {creditsAfterBooking} credit{creditsAfterBooking !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                <div className="bg-accent/20 rounded-2xl p-6 text-center">
                  <p className="text-foreground mb-2">
                    Your reservation request will be sent to our team for approval
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You'll receive a confirmation once approved
                  </p>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Hours: Mon-Fri 7am-7pm • Sat-Sun 9am-5pm<br />
                  Located in Victoria Park Village, Toronto
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-12">
            {step > 1 ? (
              <Button variant="outline" size="lg" onClick={prevStep}>
                <ArrowLeft className="w-5 h-5" />
                Back
              </Button>
            ) : (
              <div />
            )}
            
            {step === 1 ? (
              <div />
            ) : step < totalSteps ? (
              <Button
                variant="hero"
                size="lg"
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </Button>
            ) : isGrooming ? (
              <Button 
                variant="hero" 
                size="lg"
                onClick={handleSubmitGroomingReservation}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Request Appointment
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            ) : (
              <Button variant="hero" size="lg">
                Request Reservation
                <ArrowRight className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingPage;
