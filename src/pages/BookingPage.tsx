import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Dog, ArrowRight, ArrowLeft, Check, LogIn, CreditCard, AlertTriangle, ShoppingCart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInDays } from "date-fns";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { storefrontApiRequest } from "@/lib/shopify";
import { toast } from "sonner";

import iconStay from "@/assets/icons/icon-stay.png";
import iconGroom from "@/assets/icons/icon-groom.png";
import iconTrain from "@/assets/icons/icon-train.png";

type ServiceType = "daycare" | "boarding" | "grooming" | "training";

interface SelectedPet {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
}

interface BookingData {
  service: ServiceType | null;
  selectedPets: SelectedPet[];
  date: string;
  time: string;
  endDate: string;
  endTime: string;
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
  const [bookingData, setBookingData] = useState<BookingData>({
    service: null,
    selectedPets: [],
    date: "",
    time: "",
    endDate: "",
    endTime: "",
  });

  // Calculate total steps based on service type
  const needsCreditsStep = bookingData.service === "daycare" || bookingData.service === "boarding";
  const totalSteps = needsCreditsStep ? 5 : 4;

  // Calculate required credits
  const creditsRequired = useMemo(() => {
    if (!bookingData.service || !bookingData.date || !bookingData.endDate || bookingData.selectedPets.length === 0) {
      return 0;
    }

    const startDate = new Date(bookingData.date);
    const endDate = new Date(bookingData.endDate);

    if (bookingData.service === "boarding") {
      // Boarding: 1 credit per night per pet
      const nights = Math.max(1, differenceInDays(endDate, startDate));
      return nights * bookingData.selectedPets.length;
    } else if (bookingData.service === "daycare") {
      // Daycare: 1 credit per day per pet (each day they're there)
      const days = differenceInDays(endDate, startDate) + 1; // Include both start and end day
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
    setBookingData({ ...bookingData, service });
    setStep(2);
  };

  const handlePetToggle = (pet: SelectedPet) => {
    const isSelected = bookingData.selectedPets.some(p => p.id === pet.id);
    if (isSelected) {
      setBookingData({
        ...bookingData,
        selectedPets: bookingData.selectedPets.filter(p => p.id !== pet.id)
      });
    } else {
      setBookingData({
        ...bookingData,
        selectedPets: [...bookingData.selectedPets, pet]
      });
    }
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!bookingData.service;
      case 2: return bookingData.selectedPets.length > 0;
      case 3: 
        if (bookingData.service === "daycare" || bookingData.service === "boarding") {
          return !!bookingData.date && !!bookingData.time && !!bookingData.endDate && !!bookingData.endTime;
        }
        return !!bookingData.date && !!bookingData.time;
      case 4:
        if (needsCreditsStep) {
          return hasEnoughCredits;
        }
        return true;
      default: return true;
    }
  };

  // Create Shopify cart for credit purchase
  const handlePurchaseCredits = async () => {
    setIsCreatingCart(true);
    try {
      // TODO: This should use the actual credit package product from Shopify
      // For now, we'll show a message to direct them to the store
      toast.info("Credit packages", {
        description: "Please visit our store to purchase credit packages, then return to complete your booking."
      });
    } catch (error) {
      console.error("Error creating cart:", error);
      toast.error("Failed to create checkout");
    } finally {
      setIsCreatingCart(false);
    }
  };

  // Get the current step label for progress bar
  const getStepLabels = () => {
    if (needsCreditsStep) {
      return ["Service", "Select Pets", "Date & Time", "Credits", "Confirm"];
    }
    return ["Service", "Select Pets", "Date & Time", "Confirm"];
  };

  const stepLabels = getStepLabels();

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
                    <div className={`hidden sm:block w-12 lg:w-20 h-1 mx-2 rounded ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              {stepLabels.map((label, i) => (
                <span key={i}>{label}</span>
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
                  Select Your Pets
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
                      <Link to="/client/login">Sign In</Link>
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
                      <Link to="/client/pets">Add a Pet</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      Select one or more pets for this booking. Each pet will have their own reservation.
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
                              photo_url: pet.photo_url
                            })}
                            className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all text-left ${
                              isSelected
                                ? "border-primary bg-accent/30"
                                : "border-border hover:border-primary/50 bg-card"
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox
                                checked={isSelected}
                                className="pointer-events-none"
                              />
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
                              <div>
                                <h3 className="font-semibold text-foreground">{pet.name}</h3>
                                {pet.breed && (
                                  <p className="text-sm text-muted-foreground">{pet.breed}</p>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {bookingData.selectedPets.length > 0 && (
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

            {/* Step 3: Date & Time */}
            {step === 3 && (
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

            {/* Final Step: Confirmation */}
            {((step === 4 && !needsCreditsStep) || (step === 5 && needsCreditsStep)) && (
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
