import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

// Import icons
import iconStay from "@/assets/icons/icon-stay.png";
import iconGroom from "@/assets/icons/icon-groom.png";
import iconTrain from "@/assets/icons/icon-train.png";
import iconShop from "@/assets/icons/icon-shop.png";

const pricingData = {
  daycare: {
    title: "Play",
    subtitle: "Daycare",
    icon: iconStay,
    plans: [
      { name: "Full Day", price: "$35", period: "", features: ["7 AM – 6 PM (Mon-Fri)", "9 AM – 5 PM (Sat-Sun)", "All-day supervised play"] },
      { name: "Half Day", price: "$25", period: "", features: ["5 hours maximum", "Supervised play", "Water & rest included"], popular: true },
      { name: "Monthly Unlimited Full", price: "~$650", period: "/mo", features: ["Unlimited full days", "Best value for regulars", "Credits last 365 days"] },
      { name: "Assessment", price: "$35", period: "", features: ["Required for new dogs", "Temperament evaluation", "One-time fee"] },
    ],
    extras: [
      { name: "Early Drop Off (6 AM)", price: "+$10" },
      { name: "Late Pick Up (until 8 PM)", price: "+$10" },
    ],
  },
  boarding: {
    title: "Stay",
    subtitle: "Overnight Boarding",
    icon: iconStay,
    plans: [
      { name: "Nightly Fee", price: "$25", period: "/night", features: ["Individual suite", "Kuranda bed", "24-hour supervision"], popular: true },
      { name: "Check-In Day", price: "Full Day", period: "", features: ["Full daycare rate applies", "Required for acclimation", "Includes play time"] },
      { name: "Check-Out Before Noon", price: "Half Day", period: "", features: ["Half-day rate applies", "Morning play included"] },
      { name: "Check-Out After Noon", price: "Full Day", period: "", features: ["Full-day rate applies", "All-day play included"] },
    ],
    note: "Boarding nightly fee is charged on top of daycare fees each day.",
  },
  grooming: {
    title: "Groom",
    subtitle: "Professional Grooming",
    icon: iconGroom,
    plans: [
      { name: "Bath & Brush", price: "From $60", period: "", features: ["Bath & conditioning", "Hand dry & brush-out", "Nail trim & minor trims"] },
      { name: "Full Groom", price: "From $75", period: "", features: ["Everything in Bath & Brush", "Full haircut", "Breed-specific styling"], popular: true },
      { name: "Nail Trim", price: "$15", period: "", features: ["Quick service", "Professional care", "+$5 for grinding"] },
      { name: "Tidy Up", price: "From $20", period: "", features: ["Flexible service", "Choose your treatments", "Quick touch-up"] },
    ],
    extras: [
      { name: "Fancy Fella (add-on)", price: "$30" },
      { name: "Blueberry Facial", price: "$5" },
      { name: "Teeth Cleaning", price: "$15" },
      { name: "Seasonal Scent", price: "$5" },
      { name: "Nail Grinding", price: "$5" },
      { name: "Paw Butter", price: "$5" },
    ],
  },
  training: {
    title: "Train",
    subtitle: "Training Academy",
    icon: iconTrain,
    plans: [
      { name: "Puppy Playtime", price: "$25", period: "/drop-in", features: ["Ages 10-24 weeks", "Sunday mornings", "Owner must be present"] },
      { name: "6-Week Class", price: "$150", period: "", features: ["Weekly sessions", "Various levels available", "Homework provided"], popular: true },
      { name: "4-Week Class", price: "$100", period: "", features: ["Shorter program", "All skill levels", "Positive methods"] },
      { name: "Private Training", price: "Contact", period: "", features: ["One-on-one focus", "Customized plan", "Flexible scheduling"] },
    ],
    classes: ["Puppy Class (12 wks – 6 mo)", "Preschool (6+ months)", "Grade 1 & 2", "Tricks for Treats"],
  },
};

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 lg:py-24 bg-cream-warm">
          <div className="container-app text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-uppercase-spaced text-muted-foreground mb-4"
            >
              Pricing
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-foreground mb-6"
            >
              Simple, Transparent Rates
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              No hidden fees. No surprises. All packages are non-refundable and credits expire in 365 days.
            </motion.p>
          </div>
        </section>

        {/* Pricing Sections */}
        {Object.entries(pricingData).map(([key, category], categoryIndex) => (
          <section
            key={key}
            className={`section-padding ${categoryIndex % 2 === 1 ? 'bg-cream-warm' : 'bg-background'}`}
          >
            <div className="container-app">
              <div className="flex items-center gap-6 mb-12">
                <div className="w-12 h-12">
                  <img src={category.icon} alt={category.title} className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-uppercase-spaced text-muted-foreground text-xs">{category.subtitle}</p>
                  <h2 className="font-display text-3xl font-medium text-foreground">
                    {category.title}
                  </h2>
                </div>
              </div>

              {'note' in category && category.note && (
                <p className="text-muted-foreground mb-8 text-sm italic">
                  * {category.note}
                </p>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {category.plans.map((plan, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative border p-6 ${
                      plan.popular
                        ? 'border-foreground bg-cream-warm'
                        : 'border-border bg-background'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-4">
                        <span className="bg-foreground text-primary-foreground text-xs tracking-wider px-3 py-1">
                          POPULAR
                        </span>
                      </div>
                    )}
                    <h3 className="font-medium text-foreground text-lg mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="font-display text-2xl font-medium text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link to="/book">
                      <Button
                        variant={plan.popular ? "default" : "outline"}
                        className="w-full tracking-[0.1em] text-xs"
                      >
                        BOOK NOW
                      </Button>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {'extras' in category && category.extras && (
                <div className="mt-8 pt-8 border-t border-border">
                  <h4 className="font-medium text-foreground mb-4">Add-Ons & Extras</h4>
                  <div className="flex flex-wrap gap-4">
                    {category.extras.map((extra, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{extra.name}</span>
                        <span className="font-medium text-foreground">{extra.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {'classes' in category && category.classes && (
                <div className="mt-8 pt-8 border-t border-border">
                  <h4 className="font-medium text-foreground mb-4">Available Classes</h4>
                  <div className="flex flex-wrap gap-3">
                    {category.classes.map((cls, i) => (
                      <span key={i} className="px-3 py-1.5 bg-muted text-muted-foreground text-sm">
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        ))}

        {/* Requirements Section */}
        <section className="section-padding bg-foreground text-primary-foreground">
          <div className="container-app">
            <div className="max-w-3xl mx-auto text-center">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-uppercase-spaced text-primary-foreground/60 mb-4"
              >
                Requirements
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-display text-3xl font-medium mb-8"
              >
                Before You Book
              </motion.h2>
              <div className="grid sm:grid-cols-2 gap-6 text-left">
                {[
                  { title: "Vaccinations Required", desc: "Rabies, Parvo, Distemper. Bordetella highly recommended." },
                  { title: "Spay/Neuter", desc: "All dogs over 8 months must be altered." },
                  { title: "30-Day Rule", desc: "New dogs must be in your home 30 days before first visit." },
                  { title: "Assessment", desc: "$35 temperament test required for daycare/boarding." },
                ].map((req, i) => (
                  <div key={i} className="border border-primary-foreground/20 p-6">
                    <h3 className="font-medium mb-2">{req.title}</h3>
                    <p className="text-primary-foreground/70 text-sm">{req.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding">
          <div className="container-app text-center">
            <h2 className="font-display text-2xl font-medium text-foreground mb-4">
              Have Questions About Pricing?
            </h2>
            <p className="text-muted-foreground mb-8">
              Check out our FAQs or reach out to our friendly team.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/contact">
                <Button variant="outline" size="lg" className="tracking-[0.1em] text-sm">
                  VIEW FAQS
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="default" size="lg" className="tracking-[0.1em] text-sm">
                  CONTACT US
                  <ArrowRight className="w-4 h-4 ml-2" />
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

export default PricingPage;
