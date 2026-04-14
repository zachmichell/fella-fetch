import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, Clock, Calendar } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

// Import icons
import iconStay from "@/assets/icons/icon-stay.png";
import iconGroom from "@/assets/icons/icon-groom.png";
import iconTrain from "@/assets/icons/icon-train.png";

const serviceDetails = {
  daycare: {
    title: "Play",
    subtitle: "Daycare - Supervised play, socialization & exercise",
    description: "Give your pup the perfect day of play, socialization, and enrichment in our safe, supervised environment. Our daycare program is designed to keep dogs active, happy, and tired by the end of the day. Regina's premier 24-hour supervised canine care facility.",
    icon: iconStay,
    features: [
      "Supervised play groups based on size and temperament",
      "Indoor and outdoor play areas",
      "Scheduled nap times in comfortable rest areas",
      "Fresh water available at all times",
      "Daily report cards with updates (launching soon)",
      "24-hour supervision by trained staff",
    ],
    pricing: [
      { name: "Full Day", price: "$35", description: "7 AM – 6 PM (Mon-Fri) or 9 AM – 5 PM (Sat-Sun)" },
      { name: "Half Day", price: "$25", description: "5 hours maximum" },
      { name: "Monthly Unlimited Full Days", price: "~$650", description: "Unlimited full-day daycare for the month" },
      { name: "Monthly Unlimited Half Days", price: "Contact", description: "Unlimited half-day daycare for the month" },
    ],
    extras: [
      { name: "Early Drop Off", price: "$10", description: "Drop off as early as 6 AM" },
      { name: "Late Pick Up", price: "$10", description: "Pick up as late as 8 PM (Mon-Thu only)" },
      { name: "Assessment", price: "$35", description: "Required temperament test for new dogs" },
    ],
    schedule: {
      "Mon–Fri": "7:00 AM – 6:00 PM",
      "Sat–Sun": "9:00 AM – 5:00 PM",
      "Early Drop Off": "6:00 AM (+$10)",
      "Late Pick Up": "Until 8:00 PM (+$10, Mon-Thu)",
    },
    policies: [
      "All dogs over 8 months must be spayed/neutered",
      "Required vaccinations: Rabies, Parvo, Distemper",
      "Highly recommended: Bordetella",
      "New dogs must be in your home 30 days before attending",
      "24-hour cancellation notice required",
      "All packages non-refundable, credits expire in 365 days",
    ],
  },
  boarding: {
    title: "Stay",
    subtitle: "Overnight Boarding - Home-away-from-home care",
    description: "When you're away, your pet deserves more than just a place to stay. Our boarding includes individual suites with Kuranda beds, 24-hour supervision, and full participation in group play during the day.",
    icon: iconStay,
    features: [
      "Individual suite with comfortable Kuranda bed",
      "24/7 staff supervision and care",
      "Full participation in daycare activities",
      "Multiple outdoor potty breaks daily",
      "Group play with compatible dogs",
      "Medication administration available",
    ],
    pricing: [
      { name: "Nightly Fee", price: "$25", description: "Per night (in addition to daycare fees)" },
      { name: "Check-In Day", price: "Full Day Rate", description: "Full daycare charge required on check-in" },
      { name: "Check-Out Before Noon", price: "Half Day", description: "Half-day daycare charge applies" },
      { name: "Check-Out After Noon", price: "Full Day", description: "Full-day daycare charge applies" },
    ],
    extras: [
      { name: "Grooming During Stay", price: "See Grooming", description: "Add a groom during their boarding stay" },
      { name: "Extra Playtime", price: "Contact", description: "Additional one-on-one attention" },
    ],
    schedule: {
      "Check-In": "During regular daycare hours",
      "Check-Out": "During regular daycare hours",
      "Supervision": "24 hours, 7 days a week",
    },
    policies: [
      "Mandatory full-day daycare charge on check-in day for pet acclimation",
      "48 business hours cancellation notice required",
      "Full nightly charge if cancelled late",
      "All dogs must pass temperament assessment",
      "Current vaccination records required",
    ],
  },
  grooming: {
    title: "Groom",
    subtitle: "Professional Grooming - Spa treatments for your pup",
    description: "Our professional groomers provide everything from quick nail trims to full spa packages. Every pup leaves looking and feeling their best with our gentle, expert care.",
    icon: iconGroom,
    features: [
      "Experienced, gentle groomers",
      "Quality shampoos and conditioning",
      "Hand dry and brush-out",
      "Nail trimming included in packages",
      "Face, paw pad, and sanitary trimming",
      "Calm, patient handling for all temperaments",
    ],
    pricing: [
      { name: "Bath & Brush", price: "From $60", description: "Bath, shampoo, conditioning, hand dry, brush-out, nail trim, minor trimmings" },
      { name: "Full Groom", price: "From $75", description: "Everything in Bath & Brush plus full haircut" },
      { name: "Nail Trim", price: "$15", description: "Quick nail trimming service" },
      { name: "Tidy Up", price: "From $20", description: "Flexible service: nail trim, paw pads, sanitary, face trim, or bath" },
    ],
    extras: [
      { name: "Fancy Fella", price: "$30", description: "Pawdicure, facial, toothbrush, premium seasonal scent shampoo & cologne" },
      { name: "Blueberry Facial", price: "$5", description: "Refreshing facial treatment" },
      { name: "Teeth Cleaning", price: "$15", description: "Dental hygiene treatment" },
      { name: "Nail Grinding", price: "$5", description: "Smooth nail finish with dremel" },
      { name: "Seasonal Scent", price: "$5", description: "Premium seasonal shampoo upgrade" },
      { name: "Paw Butter", price: "$5", description: "Moisturizing paw treatment" },
    ],
    schedule: {
      "Hours": "By appointment",
      "Booking": "Book online or call",
      "Cancellation": "48-hour notice required",
    },
    policies: [
      "48-hour cancellation notice required",
      "Full charge if cancelled late or no-show",
      "Prices may vary based on breed, size, and coat condition",
      "Dogs should have nails trimmed every 4-6 weeks",
    ],
  },
  training: {
    title: "Train",
    subtitle: "Training Academy - Build skills & strengthen your bond",
    description: "Build a stronger bond with your dog through our positive reinforcement training programs. From puppy socialization to advanced obedience, our certified trainers will help your dog become their best self.",
    icon: iconTrain,
    features: [
      "Positive reinforcement methods only",
      "Certified professional dog trainers",
      "Group classes and private sessions",
      "Puppy socialization programs",
      "Behavior modification support",
      "Homework and guidance provided",
    ],
    pricing: [
      { name: "Puppy Playtime", price: "$25", description: "Drop-in socialization for puppies 10-24 weeks" },
      { name: "6-Week Class", price: "$150", description: "Puppy, Preschool, Grade 1 & 2, or Tricks for Treats" },
      { name: "4-Week Class", price: "$100", description: "Shorter class sessions" },
      { name: "Private Training", price: "Contact", description: "One-on-one tailored training programs" },
    ],
    extras: [],
    schedule: {
      "Puppy Playtime": "Sundays 9:00 AM – 10:00 AM (drop-in)",
      "Puppy Class": "Mondays 6:30 PM or Sundays 11:00 AM",
      "Preschool": "Sundays 12:00 PM or Tuesdays 6:30 PM",
      "Private Sessions": "By appointment",
    },
    policies: [
      "New dogs must be in your home 30 days minimum",
      "Puppies must have 2 rounds of vaccinations for Puppy Playtime",
      "Puppies 12 weeks to 6 months for Puppy Class",
      "Current vaccination records required for all classes",
      "Must have an active account to attend",
    ],
    classes: [
      { name: "Puppy Playtime", age: "10-24 weeks", description: "Safe socialization with monitored play. Owners must be present." },
      { name: "Puppy Class", age: "12 weeks – 6 months", description: "Basic obedience: sit, down, stay, focus, leash and kennel training." },
      { name: "Preschool", age: "6+ months", description: "Refine basic commands, socialization, and build a strong bond." },
      { name: "Grade 1 & 2", age: "Graduates", description: "Advanced commands and behavior refinement." },
      { name: "Tricks for Treats", age: "All ages", description: "Fun tricks to impress and engage your pup." },
    ],
  },
};

type ServiceType = keyof typeof serviceDetails;

const ServicePage = () => {
  const { serviceType } = useParams<{ serviceType: string }>();
  const service = serviceDetails[serviceType as ServiceType] || serviceDetails.daycare;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-16 lg:py-24 bg-cream-warm">
          <div className="container-app">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto text-center"
            >
              <div className="w-20 h-20 mx-auto mb-8">
                <img src={service.icon} alt={service.title} className="w-full h-full object-contain" />
              </div>
              <p className="text-uppercase-spaced text-muted-foreground mb-4">
                {service.subtitle.split(' - ')[0]}
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-foreground mb-6">
                {service.title}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {service.description}
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/book">
                  <Button variant="default" size="lg" className="tracking-[0.1em] text-sm">
                    BOOK {service.title.toUpperCase()}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="lg" className="tracking-[0.1em] text-sm">
                    ASK A QUESTION
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section-padding">
          <div className="container-app">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-uppercase-spaced text-muted-foreground mb-4"
                >
                  What's Included
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="font-display text-3xl sm:text-4xl font-medium text-foreground mb-8"
                >
                  Service Features
                </motion.h2>
                <div className="space-y-4">
                  {service.features.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-4"
                    >
                      <div className="w-5 h-5 border border-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-foreground" />
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
                className="border border-border p-8"
              >
                <h3 className="font-display text-xl font-medium text-foreground mb-6 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  Schedule & Hours
                </h3>
                <div className="space-y-4">
                  {Object.entries(service.schedule).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center border-b border-border/50 pb-3">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="section-padding bg-cream-warm">
          <div className="container-app">
            <div className="text-center mb-12">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-uppercase-spaced text-muted-foreground mb-4"
              >
                Pricing
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-display text-3xl sm:text-4xl font-medium text-foreground mb-4"
              >
                Transparent Rates
              </motion.h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Simple pricing with no hidden fees. All packages are non-refundable and credits expire in 365 days.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {service.pricing.map((tier, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-background border border-border p-6 hover:border-foreground transition-colors"
                >
                  <h3 className="font-medium text-foreground mb-2">{tier.name}</h3>
                  <div className="font-display text-2xl font-medium text-foreground mb-3">
                    {tier.price}
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </motion.div>
              ))}
            </div>

            {service.extras && service.extras.length > 0 && (
              <div>
                <h3 className="font-display text-xl font-medium text-foreground mb-6 text-center">
                  Add-Ons & Extras
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {service.extras.map((extra, i) => (
                    <div key={i} className="flex justify-between items-center bg-background border border-border p-4">
                      <div>
                        <span className="font-medium text-foreground">{extra.name}</span>
                        <p className="text-xs text-muted-foreground">{extra.description}</p>
                      </div>
                      <span className="font-medium text-foreground">{extra.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center mt-12">
              <Link to="/book">
                <Button variant="default" size="lg" className="tracking-[0.1em] text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  BOOK NOW
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Policies Section */}
        <section className="section-padding">
          <div className="container-app max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-uppercase-spaced text-muted-foreground mb-4 text-center"
            >
              Policies & Requirements
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-2xl font-medium text-foreground mb-8 text-center"
            >
              What You Need to Know
            </motion.h2>
            <div className="space-y-3">
              {service.policies.map((policy, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-4 py-3 border-b border-border/50"
                >
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{policy}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Training Classes (only for training page) */}
        {serviceType === 'training' && 'classes' in service && service.classes && (
          <section className="section-padding bg-cream-warm">
            <div className="container-app">
              <div className="text-center mb-12">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-uppercase-spaced text-muted-foreground mb-4"
                >
                  Training Academy
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="font-display text-3xl font-medium text-foreground"
                >
                  Our Classes
                </motion.h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {('classes' in service ? service.classes : []).map((cls, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-background border border-border p-6"
                  >
                    <h3 className="font-medium text-foreground mb-2">{cls.name}</h3>
                    <p className="text-xs text-uppercase-spaced text-muted-foreground mb-3">{cls.age}</p>
                    <p className="text-sm text-muted-foreground">{cls.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ServicePage;
