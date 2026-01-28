import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Dog, ArrowRight, ArrowLeft, Check } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

import iconStay from "@/assets/icons/icon-stay.png";
import iconGroom from "@/assets/icons/icon-groom.png";
import iconTrain from "@/assets/icons/icon-train.png";
import iconShop from "@/assets/icons/icon-shop.png";

type ServiceType = "daycare" | "boarding" | "grooming" | "training";

interface BookingData {
  service: ServiceType | null;
  date: string;
  time: string;
  pet: string;
  addons: string[];
}

const serviceOptions = [
  { id: "daycare" as const, name: "Daycare", icon: iconStay, description: "Supervised play & socialization for your pup", price: "From $40/day" },
  { id: "boarding" as const, name: "Boarding", icon: iconStay, description: "Comfortable overnight stays with 24/7 care", price: "From $65/night" },
  { id: "grooming" as const, name: "Grooming", icon: iconGroom, description: "Professional baths, haircuts & spa treatments", price: "From $40" },
  { id: "training" as const, name: "Training", icon: iconTrain, description: "Group classes & private sessions", price: "From $275" },
];

const timeSlots = [
  "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"
];

const BookingPage = () => {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<BookingData>({
    service: null,
    date: "",
    time: "",
    pet: "",
    addons: [],
  });

  const totalSteps = 4;

  const handleServiceSelect = (service: ServiceType) => {
    setBookingData({ ...bookingData, service });
    // Immediately proceed to next step when service is selected
    setStep(2);
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
      case 2: return !!bookingData.date && !!bookingData.time;
      case 3: return !!bookingData.pet;
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
              <span>Date & Time</span>
              <span>Pet Info</span>
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

            {/* Step 2: Date & Time */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
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
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setBookingData({ ...bookingData, time })}
                        className={`py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                          bookingData.time === time
                            ? "border-primary bg-coral-light text-primary"
                            : "border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Pet Info */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Dog className="w-5 h-5 text-primary" />
                  Tell us about your pet
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Pet's Name</label>
                  <input
                    type="text"
                    value={bookingData.pet}
                    onChange={(e) => setBookingData({ ...bookingData, pet: e.target.value })}
                    placeholder="e.g., Max, Bella, Charlie"
                    className="w-full p-4 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-xl space-y-2">
                  <p>
                    💡 <strong>New here?</strong> Don't worry! You'll be able to add complete pet profiles, 
                    vaccination records, and more after signing up.
                  </p>
                  <p className="text-xs">
                    <strong>Requirements:</strong> All dogs must be spayed/neutered (6+ months), up-to-date on Rabies, 
                    Distemper, Bordetella & Canine Influenza vaccinations.
                  </p>
                </div>
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
                  Review Your Booking
                </h2>

                <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-semibold text-foreground capitalize">
                      {serviceOptions.find(s => s.id === bookingData.service)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-semibold text-foreground">
                      {bookingData.date ? new Date(bookingData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-semibold text-foreground">{bookingData.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pet</span>
                    <span className="font-semibold text-foreground">{bookingData.pet}</span>
                  </div>
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
            
            {step < totalSteps ? (
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
