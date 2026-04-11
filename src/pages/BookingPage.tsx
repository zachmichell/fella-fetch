import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Dog, ArrowRight, ArrowLeft, Check, LogIn, CreditCard, AlertTriangle, ShoppingCart, Loader2, Scissors, User, CalendarClock, Repeat } from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInDays, format, parse, addMinutes } from "date-fns";

// Parse date string as local date (not UTC) to avoid timezone shifting
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};
import { calculateNextGroomingDate, getGroomingDueStatus } from "@/lib/groomingUtils";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { storefrontApiRequest, SHOPIFY_STORE_PERMANENT_DOMAIN } from "@/lib/shopify";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GroomerSelector } from "@/components/booking/GroomerSelector";
import { GroomingCalendar } from "@/components/booking/GroomingCalendar";
import { GroomingTimeSlots } from "@/components/booking/GroomingTimeSlots";
import { useBusinessHours, generateTimeSlots, isWeekendDate } from "@/hooks/useBusinessHours";
import { RecurringDaycareForm } from "@/components/booking/RecurringDaycareForm";
import { GroomQuestionnaire } from "@/components/booking/GroomQuestionnaire";

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
  size: string | null;
  groom_level: number | null;
  level_expiration_date: string | null;
}

interface Groomer {
  id: string;
  name: string;
  color: string | null;
  bio: string | null;
}

interface GroomerSchedule {
  groomer_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
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

type DaycareType = "full" | "half";

interface BookingData {
  service: ServiceType | null;
  selectedPets: SelectedPet[];
  daycareType: DaycareType | null;
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
  payInStore: boolean;
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
  const { businessHours, isLoading: isLoadingBusinessHours } = useBusinessHours();
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
  
  // Recurring daycare state
  const [isRecurringDaycare, setIsRecurringDaycare] = useState(false);
  
  // Two-lane grooming state
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);

  // Next available groomer state
  const [showNextAvailable, setShowNextAvailable] = useState(false);
  const [nextAvailableDate, setNextAvailableDate] = useState<string | null>(null);
  const [nextAvailableGroomers, setNextAvailableGroomers] = useState<string[]>([]);

  // Service permissions state
  const [allowedServices, setAllowedServices] = useState<Set<string>>(new Set(['daycare', 'boarding', 'grooming', 'training']));
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const [bookingData, setBookingData] = useState<BookingData>({
    service: null,
    selectedPets: [],
    daycareType: null,
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
    payInStore: false,
  });

  // Fetch client service permissions via edge function (bypasses RLS for Shopify auth)
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!isAuthenticated || !clientData?.id) {
        setAllowedServices(new Set(['daycare', 'boarding', 'grooming', 'training']));
        return;
      }

      setLoadingPermissions(true);
      try {
        const sessionRaw = localStorage.getItem('shopify_customer_session');
        if (!sessionRaw) throw new Error('No session');
        const session = JSON.parse(sessionRaw);

        const { data, error } = await supabase.functions.invoke('shopify-customer-auth', {
          body: { action: 'getServicePermissions', accessToken: session.accessToken },
        });

        if (error) throw error;

        if (data?.allowed) {
          setAllowedServices(new Set(data.allowed as string[]));
        } else {
          setAllowedServices(new Set(['daycare', 'boarding', 'grooming', 'training']));
        }
      } catch (error) {
        console.error('Error fetching service permissions:', error);
        setAllowedServices(new Set(['daycare', 'boarding', 'grooming', 'training']));
      } finally {
        setLoadingPermissions(false);
      }
    };

    fetchPermissions();
  }, [isAuthenticated, clientData?.id]);

  // Filter service options based on permissions
  const filteredServiceOptions = useMemo(() => {
    return serviceOptions.filter(service => allowedServices.has(service.id));
  }, [allowedServices]);

  // Fetch groomers and schedules when grooming is selected
  useEffect(() => {
    const fetchGroomersAndSchedules = async () => {
      if (bookingData.service !== "grooming") return;
      
      setLoadingGroomers(true);
      try {
        // Fetch active groomers from public view (excludes email/phone for privacy)
        const { data: groomersData, error: groomersError } = await supabase
          .from("groomers_public" as any)
          .select("id, name, color")
          .order("sort_order") as { data: Groomer[] | null; error: any };

        if (groomersError) throw groomersError;
        setGroomers(groomersData || []);

        // Fetch all groomer available dates
        const { data: schedulesData, error: schedulesError } = await supabase
          .from("groomer_available_dates")
          .select("groomer_id, available_date, start_time, end_time");

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
    } else if (bookingData.service === "daycare") {
      // Daycare: Service → Pets → Day Type → Date/Time → Credits → Confirm
      return {
        totalSteps: 6,
        labels: ["Service", "Select Pets", "Day Type", "Date & Time", "Credits", "Confirm"],
      };
    } else if (bookingData.service === "boarding") {
      // Boarding: Service → Pets → Date/Time → Credits → Confirm
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
  const isDaycare = bookingData.service === "daycare";

  // Calculate required credits
  const creditsRequired = useMemo(() => {
    if (!bookingData.service || bookingData.selectedPets.length === 0) {
      return 0;
    }

    if (bookingData.service === "boarding") {
      if (!bookingData.date || !bookingData.endDate) return 0;
      const startDate = new Date(bookingData.date);
      const endDate = new Date(bookingData.endDate);
      const nights = Math.max(1, differenceInDays(endDate, startDate));
      return nights * bookingData.selectedPets.length;
    } else if (bookingData.service === "daycare") {
      // Daycare is always single day now
      if (!bookingData.date) return 0;
      return 1 * bookingData.selectedPets.length;
    }

    return 0;
  }, [bookingData.service, bookingData.date, bookingData.endDate, bookingData.selectedPets.length]);

  // Get current credit balance
  const currentCredits = useMemo(() => {
    if (!clientData) return 0;
    if (bookingData.service === "boarding") {
      return clientData.boarding_credits;
    } else if (bookingData.service === "daycare") {
      // Return half day credits if half day type is selected, otherwise full day
      if (bookingData.daycareType === "half") {
        return clientData.half_daycare_credits;
      }
      return clientData.daycare_credits;
    }
    return 0;
  }, [clientData, bookingData.service, bookingData.daycareType]);

  const creditsAfterBooking = currentCredits - creditsRequired;
  const hasEnoughCredits = creditsAfterBooking >= 0;
  const creditsNeeded = hasEnoughCredits ? 0 : Math.abs(creditsAfterBooking);

  // Generate time slots based on business hours and selected date
  // For DAYCARE: restricted times (drop-off before noon, pick-up after noon)
  // For BOARDING: full business hours for both drop-off and pick-up
  const getDropOffTimeSlots = useMemo(() => {
    if (!bookingData.date) {
      // Return default weekday slots when no date selected
      return bookingData.service === "boarding"
        ? generateTimeSlots(businessHours.weekday.open, businessHours.weekday.close)
        : generateTimeSlots(businessHours.weekday.open, '12:00 PM');
    }
    const isWeekend = isWeekendDate(bookingData.date);
    const hours = isWeekend ? businessHours.weekend : businessHours.weekday;
    // Boarding: full business hours, Daycare: open to noon
    return bookingData.service === "boarding"
      ? generateTimeSlots(hours.open, hours.close)
      : generateTimeSlots(hours.open, '12:00 PM');
  }, [bookingData.date, businessHours, bookingData.service]);

  const getPickUpTimeSlots = useMemo(() => {
    if (!bookingData.date && !bookingData.endDate) {
      // Return default weekday slots when no date selected
      return bookingData.service === "boarding"
        ? generateTimeSlots(businessHours.weekday.open, businessHours.weekday.close)
        : generateTimeSlots('12:00 PM', businessHours.weekday.close);
    }
    const dateToCheck = bookingData.endDate || bookingData.date;
    const isWeekend = isWeekendDate(dateToCheck);
    const hours = isWeekend ? businessHours.weekend : businessHours.weekday;
    // Boarding: full business hours, Daycare: noon to close
    return bookingData.service === "boarding"
      ? generateTimeSlots(hours.open, hours.close)
      : generateTimeSlots('12:00 PM', hours.close);
  }, [bookingData.date, bookingData.endDate, businessHours, bookingData.service]);

  // Generate time slots for half day daycare
  const getHalfDayDropOffTimeSlots = useMemo(() => {
    const isWeekend = bookingData.date ? isWeekendDate(bookingData.date) : false;
    const hours = isWeekend ? businessHours.weekend : businessHours.weekday;
    // Morning half day: drop-off from open to 11:30 AM
    // Afternoon half day: drop-off from 1:00 PM to 4:00 PM
    return {
      morning: generateTimeSlots(hours.open, '11:30 AM'),
      afternoon: generateTimeSlots('1:00 PM', '4:00 PM'),
    };
  }, [bookingData.date, businessHours]);

  const getHalfDayPickUpTimeSlots = useMemo(() => {
    const isWeekend = bookingData.date ? isWeekendDate(bookingData.date) : false;
    const hours = isWeekend ? businessHours.weekend : businessHours.weekday;
    // Morning half day: pick-up by 12:00 PM
    // Afternoon half day: pick-up from 4:00 PM to close
    return {
      morning: ['12:00 PM'],
      afternoon: generateTimeSlots('4:00 PM', hours.close),
    };
  }, [bookingData.date, businessHours]);

  // Determine if selected drop-off time is morning or afternoon for half day
  const isAfternoonHalfDay = useMemo(() => {
    if (!bookingData.time || bookingData.daycareType !== 'half') return false;
    const timeMatch = bookingData.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) return false;
    const hour = parseInt(timeMatch[1], 10);
    const period = timeMatch[3].toUpperCase();
    // If PM and hour >= 1, it's afternoon
    return period === 'PM' && hour !== 12;
  }, [bookingData.time, bookingData.daycareType]);

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
          selectedGroomingService: null,
        });
        
        // Two-Lane Detection: check if pet has an active groom level
        const hasActiveLevel = pet.groom_level != null 
          && pet.level_expiration_date 
          && new Date(pet.level_expiration_date) > new Date();
        
        if (hasActiveLevel) {
          // Lane B: VIP Fast-Track — proceed to groomer selection
          setShowQuestionnaire(false);
          setQuestionnaireSubmitted(false);
          setStep(3);
        } else {
          // Lane A: Gatekeeper — show questionnaire
          setShowQuestionnaire(true);
          setQuestionnaireSubmitted(false);
        }
      } else {
        setBookingData({
          ...bookingData,
          selectedPets: [...bookingData.selectedPets, pet]
        });
      }
    }
  };

  const handleGroomerSelect = (groomerId: string | null) => {
    if (!groomerId) return; // Must pick a specific groomer
    setBookingData({
      ...bookingData,
      selectedGroomerId: groomerId,
      groomingDate: showNextAvailable && nextAvailableDate ? new Date(nextAvailableDate + 'T12:00:00') : null,
      groomingTime: null,
      groomingEndTime: null,
    });
    // If we already have a next available date, skip calendar and go to service selection
    if (showNextAvailable && nextAvailableDate) {
      setStep(4); // service selection, then skip calendar (date already set)
    } else {
      setStep(4); // service selection, then calendar
    }
  };

  const handleFindNextAvailable = () => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    
    // Find the earliest date any groomer is available
    const futureDates = groomerSchedules
      .filter(s => s.available_date >= todayStr)
      .map(s => s.available_date)
      .sort();
    
    if (futureDates.length === 0) {
      setNextAvailableDate(null);
      setNextAvailableGroomers([]);
      setShowNextAvailable(true);
      return;
    }

    const earliest = futureDates[0];
    const availableGroomerIds = [...new Set(
      groomerSchedules
        .filter(s => s.available_date === earliest)
        .map(s => s.groomer_id)
    )];
    
    setNextAvailableDate(earliest);
    setNextAvailableGroomers(availableGroomerIds);
    setShowNextAvailable(true);
  };

  const handleGroomingDateSelect = (date: Date) => {
    setBookingData({
      ...bookingData,
      groomingDate: date,
      groomingTime: null, // Reset time when date changes
    });
    setStep(6); // Auto-advance to time selection
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
    setStep(7); // Auto-advance to confirmation
  };

  const nextStep = () => {
    if (step < totalSteps) {
      // Skip calendar step (5) for grooming if date was pre-selected via "next available"
      if (step === 4 && isGrooming && bookingData.groomingDate) {
        setStep(6); // Skip to time selection
        return;
      }
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      // When going back to groomer selection, reset next-available state
      if (step === 4 && isGrooming) {
        setShowNextAvailable(false);
        setNextAvailableDate(null);
        setNextAvailableGroomers([]);
      }
      // Skip calendar step (5) when going back if date was pre-selected
      if (step === 6 && isGrooming && showNextAvailable) {
        setStep(4);
        return;
      }
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: 
        return !!bookingData.service;
      case 2: 
        return bookingData.selectedPets.length > 0;
      case 3:
        if (isGrooming) {
          // Groomer selection step - must pick a specific groomer
          return !!bookingData.selectedGroomerId;
        }
        if (isDaycare) {
          // Daycare type selection step
          return !!bookingData.daycareType;
        }
        // Date/Time step for boarding
        if (bookingData.service === "boarding") {
          return !!bookingData.date && !!bookingData.time && !!bookingData.endDate && !!bookingData.endTime;
        }
        // Date/Time step for training
        return !!bookingData.date && !!bookingData.time;
      case 4:
        if (isGrooming) {
          // Grooming service selection step - must select a service AND a variant
          return !!bookingData.selectedGroomingService && !!bookingData.selectedGroomingVariant;
        }
        if (isDaycare) {
          // Date/Time step for daycare (step 4 after day type) - single date
          return !!bookingData.date && !!bookingData.time && !!bookingData.endTime;
        }
        if (bookingData.service === "boarding") {
          // Credits step for boarding
          return hasEnoughCredits || bookingData.payInStore;
        }
        return true;
      case 5:
        if (isGrooming) {
          // Calendar step - date must be selected
          return !!bookingData.groomingDate;
        }
        if (isDaycare) {
          // Credits step for daycare
          return hasEnoughCredits || bookingData.payInStore;
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

  // Check if any selected pets already have reservations on the given date(s)
  const checkExistingBookings = async (
    pets: SelectedPet[],
    dates: string[]
  ): Promise<{ hasConflict: boolean; message: string }> => {
    const petIds = pets.map(p => p.id);
    const { data: existing } = await supabase
      .from('reservations')
      .select('pet_id, start_date, end_date, service_type, status')
      .in('pet_id', petIds)
      .in('status', ['pending', 'confirmed', 'checked_in']);

    if (!existing || existing.length === 0) return { hasConflict: false, message: '' };

    const conflicts: string[] = [];
    for (const pet of pets) {
      for (const date of dates) {
        const dateObj = parseLocalDate(date);
        const match = existing.find(r => {
          if (r.pet_id !== pet.id) return false;
          const rStart = parseLocalDate(r.start_date);
          const rEnd = r.end_date ? parseLocalDate(r.end_date) : rStart;
          return dateObj >= rStart && dateObj <= rEnd;
        });
        if (match) {
          const svcLabel = match.service_type.charAt(0).toUpperCase() + match.service_type.slice(1);
          conflicts.push(`${pet.name} already has a ${svcLabel} booking on ${format(parseLocalDate(date), 'MMM d, yyyy')}`);
        }
      }
    }

    if (conflicts.length === 0) return { hasConflict: false, message: '' };
    // Deduplicate
    const unique = [...new Set(conflicts)];
    return { hasConflict: true, message: unique.join('\n') };
  };

  // Submit grooming reservation
  const handleSubmitGroomingReservation = async () => {
    if (!bookingData.groomingDate || !bookingData.groomingTime || bookingData.selectedPets.length === 0) {
      toast.error("Please complete all booking details");
      return;
    }

    // Check for existing bookings on this date
    const groomDate = format(bookingData.groomingDate, "yyyy-MM-dd");
    const conflict = await checkExistingBookings(bookingData.selectedPets, [groomDate]);
    if (conflict.hasConflict) {
      toast.warning("Scheduling conflict", {
        description: conflict.message,
        duration: 6000,
      });
    }

    setIsSubmitting(true);
    try {
      const pet = bookingData.selectedPets[0];
      const startDate = groomDate;
      
      // Convert time to 24h format for database
      const parsedTime = parse(bookingData.groomingTime, "h:mm a", new Date());
      const startTime = format(parsedTime, "HH:mm:ss");
      
      // Calculate end time based on duration
      const endTimeDate = addMinutes(parsedTime, bookingData.groomingDurationMinutes);
      const endTime = format(endTimeDate, "HH:mm:ss");

      // Build notes with groom type and groomer info
      const notesParts: string[] = [];
      if (bookingData.selectedGroomingVariant) {
        notesParts.push(`Groom Type: ${bookingData.selectedGroomingVariant.title}`);
      }
      if (bookingData.selectedGroomingService) {
        notesParts.push(`Service: ${bookingData.selectedGroomingService.shopify_product_title}`);
      }
      if (bookingData.selectedGroomerId) {
        notesParts.push(`Requested groomer: ${groomers.find(g => g.id === bookingData.selectedGroomerId)?.name}`);
      } else {
        notesParts.push("Any available groomer");
      }

      const { error } = await supabase.from("reservations").insert({
        pet_id: pet.id,
        service_type: "grooming",
        status: "pending",
        start_date: startDate,
        start_time: startTime,
        end_time: endTime,
        groomer_id: bookingData.selectedGroomerId,
        notes: notesParts.join(" | "),
      });

      if (error) throw error;

      toast.success("Appointment requested!", {
        description: "We'll confirm your grooming appointment shortly.",
      });

      // Reset form
      setStep(1);
      setIsRecurringDaycare(false);
      setBookingData({
        service: null,
        selectedPets: [],
        daycareType: null,
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
        payInStore: false,
      });
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast.error("Failed to submit reservation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit non-grooming reservation (daycare, boarding, training)
  const handleSubmitReservation = async () => {
    if (!bookingData.service || bookingData.selectedPets.length === 0) {
      toast.error("Please complete all booking details");
      return;
    }

    // Check for existing bookings on the selected date range
    const datesToCheck = [bookingData.date];
    if (bookingData.endDate && bookingData.endDate !== bookingData.date) {
      // For multi-day bookings (boarding), check all dates in range
      let current = parseLocalDate(bookingData.date);
      const end = parseLocalDate(bookingData.endDate);
      while (current <= end) {
        const ds = format(current, 'yyyy-MM-dd');
        if (!datesToCheck.includes(ds)) datesToCheck.push(ds);
        current = new Date(current.getTime() + 86400000);
      }
    }
    const conflict = await checkExistingBookings(bookingData.selectedPets, datesToCheck);
    if (conflict.hasConflict) {
      toast.warning("Scheduling conflict", {
        description: conflict.message,
        duration: 6000,
      });
    }

    setIsSubmitting(true);
    try {
      // Convert "10:00 AM" display time to "10:00:00" 24h format for DB
      const to24h = (timeStr: string): string | null => {
        if (!timeStr) return null;
        try {
          const parsed = parse(timeStr, 'h:mm a', new Date());
          return format(parsed, 'HH:mm:ss');
        } catch {
          return null;
        }
      };

      // Build notes string
      const buildNotes = () => {
        const parts: string[] = [];
        if (bookingData.service === "daycare" && bookingData.daycareType) {
          parts.push(bookingData.daycareType === "half" ? "Half Day" : "Full Day");
        }
        if (bookingData.time && bookingData.endTime) {
          parts.push(`Drop-off: ${bookingData.time}, Pick-up: ${bookingData.endTime}`);
        }
        return parts.length > 0 ? parts.join(" | ") : null;
      };

      // Create reservations for each pet
      const reservations = bookingData.selectedPets.map((pet) => ({
        pet_id: pet.id,
        service_type: bookingData.service as ServiceType,
        status: "pending" as const,
        start_date: bookingData.date,
        end_date: bookingData.endDate || bookingData.date,
        start_time: to24h(bookingData.time),
        end_time: to24h(bookingData.endTime),
        notes: buildNotes(),
        payment_pending: bookingData.payInStore,
      }));

      // Use edge function to create reservations (bypasses RLS for Shopify-authenticated clients)
      const storedSession = localStorage.getItem("shopify_customer_session");
      const shopifyToken = storedSession ? JSON.parse(storedSession).accessToken : null;
      const { data, error } = await supabase.functions.invoke("shopify-customer-auth", {
        body: {
          action: "createReservations",
          accessToken: shopifyToken,
          reservations,
        },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      toast.success(
        bookingData.payInStore 
          ? "Reservation requested! Payment will be collected at drop-off." 
          : "Reservation requested!",
        {
          description: "We'll confirm your reservation shortly.",
        }
      );

      // Reset form
      setStep(1);
      setBookingData({
        service: null,
        selectedPets: [],
        daycareType: null,
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
        payInStore: false,
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
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              Book Your Visit
            </h1>
          </motion.div>

          {/* Progress Bar - Simple line only */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <div 
                  key={s} 
                  className={`h-2 flex-1 max-w-12 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
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
                {loadingPermissions ? (
                  <div className="bg-card rounded-2xl border border-border p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading available services...</p>
                  </div>
                ) : filteredServiceOptions.length === 0 ? (
                  <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">No services available</h3>
                    <p className="text-muted-foreground">
                      You don't have any services available for booking. Please contact us for assistance.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {filteredServiceOptions.map((service) => (
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
                )}
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
                              size: (pet as any).size || null,
                              groom_level: (pet as any).groom_level || null,
                              level_expiration_date: (pet as any).level_expiration_date || null,
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

                    {/* Lane A: Questionnaire for pets without active groom level */}
                    {isGrooming && showQuestionnaire && bookingData.selectedPets.length > 0 && !questionnaireSubmitted && clientData && (
                      <GroomQuestionnaire
                        petId={bookingData.selectedPets[0].id}
                        petName={bookingData.selectedPets[0].name}
                        clientId={clientData.id}
                        onSubmit={() => {
                          setQuestionnaireSubmitted(true);
                          setShowQuestionnaire(false);
                          toast.success("Questionnaire submitted! Your grooming request is pending admin review. We'll notify you once approved.");
                        }}
                        onCancel={() => {
                          setShowQuestionnaire(false);
                          setBookingData({ ...bookingData, selectedPets: [] });
                        }}
                      />
                    )}

                    {isGrooming && questionnaireSubmitted && (
                      <div className="bg-accent/20 rounded-xl p-6 text-center space-y-2">
                        <Check className="w-8 h-8 text-primary mx-auto" />
                        <h3 className="font-semibold text-foreground">Request Submitted</h3>
                        <p className="text-sm text-muted-foreground">
                          Your grooming questionnaire has been submitted for review. You'll be notified once an admin approves your pet's groom level, and then you can book directly.
                        </p>
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
                  {showNextAvailable 
                    ? "Pick a groomer from those available on the next open date."
                    : "Choose a specific groomer, or find the next available date across all groomers."
                  }
                </p>
                <GroomerSelector
                  groomers={groomers}
                  selectedGroomerId={bookingData.selectedGroomerId}
                  onSelect={handleGroomerSelect}
                  loading={loadingGroomers}
                  schedules={groomerSchedules}
                  showNextAvailable={showNextAvailable}
                  onFindNextAvailable={handleFindNextAvailable}
                  nextAvailableDate={nextAvailableDate}
                  nextAvailableGroomers={nextAvailableGroomers}
                />
                {showNextAvailable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNextAvailable(false);
                      setNextAvailableDate(null);
                      setNextAvailableGroomers([]);
                    }}
                    className="text-muted-foreground"
                  >
                    ← Show all groomers
                  </Button>
                )}
              </motion.div>
            )}

            {/* Step 3: Daycare Type Selection (Daycare only) */}
            {step === 3 && isDaycare && !isRecurringDaycare && (
              <motion.div
                key="step3-daycare-type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Select Day Type
                </h2>
                <p className="text-muted-foreground">
                  Choose whether you'd like to book a full day or half day of daycare.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setBookingData({ ...bookingData, daycareType: "full" });
                      setStep(4); // Auto-advance to next step
                    }}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      bookingData.daycareType === "full"
                        ? "border-primary bg-accent/30"
                        : "border-border hover:border-primary/50 bg-card"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">Full Day</h3>
                    <p className="text-sm text-muted-foreground">A complete day of play, socialization, and care</p>
                  </button>
                  <button
                    onClick={() => {
                      setBookingData({ ...bookingData, daycareType: "half" });
                      setStep(4); // Auto-advance to next step
                    }}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      bookingData.daycareType === "half"
                        ? "border-primary bg-accent/30"
                        : "border-border hover:border-primary/50 bg-card"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-3">
                      <Clock className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">Half Day</h3>
                    <p className="text-sm text-muted-foreground">A shorter session, perfect for quick visits</p>
                  </button>
                </div>

                {/* Recurring Option */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Need regular daycare? Set up a recurring weekly schedule.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setBookingData({ ...bookingData, daycareType: "full" });
                        setIsRecurringDaycare(true);
                      }}
                      className="p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card/50 text-left transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Repeat className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Recurring Full Day</h3>
                          <p className="text-xs text-muted-foreground">Weekly schedule</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setBookingData({ ...bookingData, daycareType: "half" });
                        setIsRecurringDaycare(true);
                      }}
                      className="p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card/50 text-left transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Repeat className="w-5 h-5 text-secondary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Recurring Half Day</h3>
                          <p className="text-xs text-muted-foreground">Weekly schedule</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Recurring Daycare Form (Daycare only) */}
            {step === 3 && isDaycare && isRecurringDaycare && clientData && bookingData.selectedPets[0] && (
              <motion.div
                key="step3-recurring-daycare"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <RecurringDaycareForm
                  clientId={clientData.id}
                  petId={bookingData.selectedPets[0].id}
                  petName={bookingData.selectedPets[0].name}
                  daycareType={bookingData.daycareType || 'full'}
                  onBack={() => setIsRecurringDaycare(false)}
                  onSuccess={() => {
                    setStep(1);
                    setIsRecurringDaycare(false);
                    setBookingData({
                      service: null,
                      selectedPets: [],
                      daycareType: null,
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
                      payInStore: false,
                    });
                  }}
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
                            // If only one variant, auto-select it and advance
                            if (service.variants.length === 1) {
                              setBookingData({ 
                                ...bookingData, 
                                selectedGroomingService: service,
                                selectedGroomingVariant: service.variants[0]
                              });
                              setStep(5); // Auto-advance to date selection
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
                            onClick={() => {
                              setBookingData({ ...bookingData, selectedGroomingVariant: variant });
                              setStep(5); // Auto-advance to date selection
                            }}
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

            {/* Step 3: Date & Time (Boarding and Training only) */}
            {step === 3 && !isGrooming && !isDaycare && (
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
                        <Select
                          value={bookingData.time}
                          onValueChange={(value) => setBookingData({ ...bookingData, time: value })}
                        >
                          <SelectTrigger className="w-full h-14 rounded-xl border border-border bg-card text-foreground text-lg">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {getDropOffTimeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select
                          value={bookingData.endTime}
                          onValueChange={(value) => setBookingData({ ...bookingData, endTime: value })}
                        >
                          <SelectTrigger className="w-full h-14 rounded-xl border border-border bg-card text-foreground text-lg">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {getPickUpTimeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

            {/* Step 4: Date & Time (Daycare only - after day type selection) */}
            {step === 4 && isDaycare && (
              <motion.div
                key="step4-daycare-datetime"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Single Date for Daycare */}
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Select Date
                  </h2>
                  <input
                    type="date"
                    value={bookingData.date}
                    onChange={(e) => {
                      // For daycare, set both date and endDate to the same value
                      setBookingData({ 
                        ...bookingData, 
                        date: e.target.value, 
                        endDate: e.target.value,
                        time: '', // Reset times when date changes
                        endTime: ''
                      });
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-4 rounded-xl border border-border bg-card text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Time Selection */}
                {bookingData.date && (
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Drop-off Time
                      </h2>
                      <Select
                        value={bookingData.time}
                        onValueChange={(value) => setBookingData({ ...bookingData, time: value, endTime: '' })}
                      >
                        <SelectTrigger className="w-full h-14 rounded-xl border border-border bg-card text-foreground text-lg">
                          <SelectValue placeholder="Select drop-off time" />
                        </SelectTrigger>
                        <SelectContent>
                          {bookingData.daycareType === 'full' 
                            ? getDropOffTimeSlots.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))
                            : [...getHalfDayDropOffTimeSlots.morning, ...getHalfDayDropOffTimeSlots.afternoon].map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Pick-up Time
                      </h2>
                      <Select
                        value={bookingData.endTime}
                        onValueChange={(value) => setBookingData({ ...bookingData, endTime: value })}
                        disabled={!bookingData.time}
                      >
                        <SelectTrigger className="w-full h-14 rounded-xl border border-border bg-card text-foreground text-lg">
                          <SelectValue placeholder={bookingData.time ? "Select pick-up time" : "Select drop-off first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {bookingData.daycareType === 'full'
                            ? getPickUpTimeSlots.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))
                            : (isAfternoonHalfDay 
                                ? getHalfDayPickUpTimeSlots.afternoon 
                                : getHalfDayPickUpTimeSlots.morning
                              ).map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Day type reminder */}
                <div className="bg-accent/20 rounded-xl p-4 text-sm text-foreground">
                  Booking: <strong>{bookingData.daycareType === "full" ? "Full Day" : "Half Day"}</strong> Daycare
                  {bookingData.daycareType === "half" && bookingData.time && (
                    <span className="ml-2">({isAfternoonHalfDay ? 'Afternoon' : 'Morning'} session)</span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 4: Credits Check (for boarding only) */}
            {step === 4 && bookingData.service === "boarding" && (
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
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
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

                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <span className="relative bg-destructive/10 px-3 text-sm text-muted-foreground">or</span>
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => {
                          setBookingData({ ...bookingData, payInStore: true });
                          setStep(step + 1);
                        }}
                      >
                        <CreditCard className="w-5 h-5" />
                        Pay In Store
                      </Button>

                      <p className="text-sm text-muted-foreground text-center">
                        Choose "Pay In Store" to book now and pay when you drop off your pet.
                      </p>
                    </div>
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

            {/* Step 5: Credits Check (for daycare only) */}
            {step === 5 && isDaycare && (
              <motion.div
                key="step5-daycare-credits"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {bookingData.daycareType === "half" ? "Half Day" : "Full Day"} Daycare Credits
                </h2>

                {/* Credit Summary Card */}
                <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-muted-foreground">Current Balance</span>
                    <span className="font-semibold text-foreground text-lg">
                      {bookingData.daycareType === "half" ? clientData?.half_daycare_credits || 0 : currentCredits} {bookingData.daycareType === "half" ? "half day" : "day"}{(bookingData.daycareType === "half" ? clientData?.half_daycare_credits || 0 : currentCredits) !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <div>
                      <span className="text-muted-foreground">Required for this booking</span>
                      <p className="text-sm text-muted-foreground">
                        {bookingData.selectedPets.length} pet{bookingData.selectedPets.length > 1 ? 's' : ''} × {' '}
                        {differenceInDays(new Date(bookingData.endDate), new Date(bookingData.date)) + 1} {bookingData.daycareType === "half" ? "half day" : "day"}{differenceInDays(new Date(bookingData.endDate), new Date(bookingData.date)) + 1 !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground text-lg">
                      -{creditsRequired} {bookingData.daycareType === "half" ? "half day" : "day"}{creditsRequired !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold text-foreground">Balance After Booking</span>
                    <span className={`font-bold text-xl ${hasEnoughCredits ? 'text-green-600' : 'text-destructive'}`}>
                      {bookingData.daycareType === "half" 
                        ? (clientData?.half_daycare_credits || 0) - creditsRequired 
                        : creditsAfterBooking
                      } {bookingData.daycareType === "half" ? "half day" : "day"}{(bookingData.daycareType === "half" ? (clientData?.half_daycare_credits || 0) - creditsRequired : creditsAfterBooking) !== 1 ? 's' : ''}
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
                          You need <strong>{creditsNeeded} more {bookingData.daycareType === "half" ? "half day" : "daycare"} credit{creditsNeeded !== 1 ? 's' : ''}</strong> to complete this booking.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
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

                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <span className="relative bg-destructive/10 px-3 text-sm text-muted-foreground">or</span>
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => {
                          setBookingData({ ...bookingData, payInStore: true });
                          setStep(step + 1);
                        }}
                      >
                        <CreditCard className="w-5 h-5" />
                        Pay In Store
                      </Button>

                      <p className="text-sm text-muted-foreground text-center">
                        Choose "Pay In Store" to book now and pay when you drop off your pet.
                      </p>
                    </div>
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
            {/* Daycare: step 6, Boarding: step 5, Training: step 4 */}
            {((step === 4 && bookingData.service === "training") || 
              (step === 5 && bookingData.service === "boarding") || 
              (step === 6 && isDaycare)) && (
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
                          {bookingData.service === "daycare" 
                            ? `${bookingData.daycareType === "half" ? "Half Day" : "Full Day"} Daycare`
                            : serviceOptions.find(s => s.id === bookingData.service)?.name
                          }
                        </span>
                      </div>

                      {(bookingData.service === "daycare" || bookingData.service === "boarding") ? (
                        <>
                          <div className="flex justify-between items-center pb-4 border-b border-border">
                            <span className="text-muted-foreground">Drop-off</span>
                            <span className="font-semibold text-foreground">
                              {bookingData.date ? format(parseLocalDate(bookingData.date), 'EEE, MMM d') : ''} at {bookingData.time}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Pick-up</span>
                            <span className="font-semibold text-foreground">
                              {bookingData.endDate ? format(parseLocalDate(bookingData.endDate), 'EEE, MMM d') : ''} at {bookingData.endTime}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center pb-4 border-b border-border">
                            <span className="text-muted-foreground">Date</span>
                            <span className="font-semibold text-foreground">
                              {bookingData.date ? format(parseLocalDate(bookingData.date), 'EEEE, MMMM d') : ''}
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

                {needsCreditsStep && !bookingData.payInStore && (
                  <div className="bg-accent/20 rounded-2xl p-6 text-center space-y-2">
                    <p className="text-foreground">
                      <strong>{creditsRequired}</strong> {bookingData.service === "boarding" ? "boarding" : "daycare"} credit{creditsRequired !== 1 ? 's' : ''} will be used
                    </p>
                    <p className="text-sm text-muted-foreground">
                      New balance: {creditsAfterBooking} credit{creditsAfterBooking !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {bookingData.payInStore && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-6 h-6 text-amber-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-foreground">Pay In Store</h3>
                        <p className="text-muted-foreground text-sm">
                          Payment of <strong>{creditsNeeded} {bookingData.service === "boarding" ? "boarding" : "daycare"} credit{creditsNeeded !== 1 ? 's' : ''}</strong> will be collected when you drop off your pet.
                        </p>
                      </div>
                    </div>
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
              <Button 
                variant="hero" 
                size="lg"
                onClick={handleSubmitReservation}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Request Reservation
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
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
