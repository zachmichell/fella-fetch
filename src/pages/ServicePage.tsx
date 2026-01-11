import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, Clock, Calendar, DollarSign, Users } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

const serviceDetails = {
  daycare: {
    title: "Daycare",
    subtitle: "Supervised play, socialization & exercise",
    description: "Give your pup the perfect day of play, socialization, and enrichment in our safe, supervised environment. Our daycare program is designed to keep dogs active, happy, and tired by the end of the day.",
    hero: "🌞",
    color: "from-golden to-primary",
    bgLight: "bg-golden-light",
    features: [
      "Supervised play groups based on size and temperament",
      "Indoor and outdoor play areas",
      "Scheduled nap times in comfortable rest areas",
      "Fresh water available at all times",
      "Daily report cards with photos",
      "Flexible drop-off and pick-up times",
    ],
    pricing: [
      { name: "Single Day", price: "$45", description: "Perfect for occasional needs" },
      { name: "5-Day Package", price: "$200", description: "Save $25 on weekly care" },
      { name: "10-Day Package", price: "$380", description: "Best value for regulars" },
      { name: "Monthly Unlimited", price: "$750", description: "Unlimited daycare access" },
    ],
    schedule: {
      dropOff: "7:00 AM - 10:00 AM",
      pickUp: "4:00 PM - 7:00 PM",
      earlyDrop: "6:00 AM (+$10)",
      latePickup: "7:00 PM - 8:00 PM (+$15)",
    },
  },
  boarding: {
    title: "Boarding",
    subtitle: "Home-away-from-home overnight care",
    description: "When you're away, your pet deserves more than just a place to stay. Our boarding suites provide 24/7 care, comfortable accommodations, and plenty of love and attention.",
    hero: "🌙",
    color: "from-navy to-navy-light",
    bgLight: "bg-sage-light",
    features: [
      "Private suites with comfortable bedding",
      "24/7 staff supervision and care",
      "Multiple outdoor potty breaks daily",
      "Optional webcam access to check in",
      "Playtime included with other friendly dogs",
      "Medication administration available",
    ],
    pricing: [
      { name: "Standard Suite", price: "$55/night", description: "Cozy space for small-medium dogs" },
      { name: "Deluxe Suite", price: "$75/night", description: "Extra space for larger dogs" },
      { name: "Luxury Suite", price: "$95/night", description: "Premium room with TV & bed" },
      { name: "Multi-Pet", price: "+$35/pet", description: "Additional pet in same suite" },
    ],
    schedule: {
      checkIn: "12:00 PM - 6:00 PM",
      checkOut: "8:00 AM - 12:00 PM",
      earlyCheckIn: "8:00 AM (+$15)",
      lateCheckOut: "After 12:00 PM (+$20)",
    },
  },
  grooming: {
    title: "Grooming",
    subtitle: "Professional spa treatments",
    description: "Our certified groomers provide everything from quick nail trims to full spa packages. Every pup leaves looking and feeling their best with our gentle, professional care.",
    hero: "✂️",
    color: "from-primary to-coral-dark",
    bgLight: "bg-coral-light",
    features: [
      "Breed-specific grooming expertise",
      "All-natural, gentle shampoos and products",
      "Nail trimming, ear cleaning, and teeth brushing",
      "De-shedding and de-matting treatments",
      "Creative styling and coloring available",
      "Calm, patient handling for anxious pets",
    ],
    pricing: [
      { name: "Bath & Brush", price: "From $35", description: "Shampoo, dry, brush, and cologne" },
      { name: "Full Groom", price: "From $65", description: "Bath plus haircut and styling" },
      { name: "Spa Package", price: "From $95", description: "Full groom + teeth, paw, facial" },
      { name: "Nail Trim", price: "$15", description: "Quick walk-in service" },
    ],
    schedule: {
      hours: "Tuesday - Saturday: 9:00 AM - 5:00 PM",
      lastAppointment: "Last appointment at 3:00 PM",
      walkIns: "Walk-ins accepted for nail trims only",
      booking: "Book online 24/7",
    },
  },
  training: {
    title: "Training",
    subtitle: "Expert behavior & obedience programs",
    description: "Build a stronger bond with your dog through our positive reinforcement training programs. From puppy basics to advanced obedience, our certified trainers will help your dog become their best self.",
    hero: "🎓",
    color: "from-sage to-sage-dark",
    bgLight: "bg-sage-light",
    features: [
      "Positive reinforcement methods only",
      "Certified professional dog trainers",
      "Group classes and private sessions",
      "Puppy, basic, intermediate, and advanced levels",
      "Behavior modification for specific issues",
      "Training while boarding available",
    ],
    pricing: [
      { name: "Private Session", price: "$95/hour", description: "One-on-one focused training" },
      { name: "6-Week Group Class", price: "$225", description: "Weekly group sessions" },
      { name: "Puppy Basics Package", price: "$350", description: "4 private sessions for puppies" },
      { name: "Board & Train", price: "$1,200/week", description: "Intensive training program" },
    ],
    schedule: {
      privateHours: "Mon-Sat: 9:00 AM - 6:00 PM",
      groupClasses: "Saturdays: 10:00 AM, 11:30 AM, 1:00 PM",
      puppyClasses: "Sundays: 10:00 AM",
      booking: "Book consultation online",
    },
  },
};

type ServiceType = keyof typeof serviceDetails;

const ServicePage = () => {
  const { serviceType } = useParams<{ serviceType: string }>();
  const service = serviceDetails[serviceType as ServiceType] || serviceDetails.daycare;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className={`relative py-20 lg:py-32 bg-gradient-to-br ${service.color} overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          
          <div className="container-app relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl"
            >
              <span className="text-6xl mb-6 block">{service.hero}</span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4">
                {service.title}
              </h1>
              <p className="text-xl text-primary-foreground/80 mb-8">
                {service.subtitle}
              </p>
              <p className="text-lg text-primary-foreground/70 mb-8 max-w-2xl">
                {service.description}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/book">
                  <Button variant="hero-outline" size="xl">
                    Book {service.title}
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="hero-outline" size="lg">
                    Ask a Question
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section-padding">
          <div className="container-app">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-8"
                >
                  What's Included
                </motion.h2>
                <div className="space-y-4">
                  {service.features.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <div className={`w-6 h-6 rounded-full ${service.bgLight} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Schedule Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`${service.bgLight} rounded-3xl p-8`}
              >
                <h3 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                  <Clock className="w-6 h-6 text-primary" />
                  Schedule & Hours
                </h3>
                <div className="space-y-4">
                  {Object.entries(service.schedule).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center border-b border-border/50 pb-3">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="section-padding bg-muted/30">
          <div className="container-app">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4"
              >
                Pricing
              </motion.h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Transparent pricing with no hidden fees. Packages available for extra savings.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {service.pricing.map((tier, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl p-6 border border-border/50 hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-semibold text-foreground mb-2">{tier.name}</h3>
                  <div className="font-display text-3xl font-bold text-gradient mb-2">
                    {tier.price}
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link to="/book">
                <Button variant="hero" size="xl">
                  <Calendar className="w-5 h-5" />
                  Book Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ServicePage;
