import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Dog, ArrowRight, ArrowLeft, Check, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientAuth } from "@/contexts/ClientAuthContext";

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

const BookingPage = () => {
  const { isAuthenticated, pets, loading } = useClientAuth();
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({
    service: null,
    selectedPets: [],
    date: "",
    time: "",
    endDate: "",
    endTime: "",
  });

  const totalSteps = 4;

  const handleServiceSelect = (service: ServiceType) => {
    setBookingData({ ...bookingData, service });
    // Immediately proceed to pet selection
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
      default: return true;
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
              {[1, 2, 3, 4].map((s) => (
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
                  {s < 4 && (
                    <div className={`hidden sm:block w-16 lg:w-24 h-1 mx-2 rounded ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Service</span>
              <span>Select Pets</span>
              <span>Date & Time</span>
              <span>Confirm</span>
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

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <motion.div
                key="step4"
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

                <div className="bg-accent/20 rounded-2xl p-6 text-center">
                  <p className="text-foreground mb-2">
                    You'll be redirected to complete payment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your slot will be held for 15 minutes during checkout
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
                Proceed to Checkout
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
