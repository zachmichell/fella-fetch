import { motion } from "framer-motion";
import { Check, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

const pricingData = {
  daycare: {
    title: "Daycare",
    icon: "🌞",
    plans: [
      { name: "Single Day", price: "$45", period: "", features: ["Full day of supervised play", "Outdoor time included", "Report card & photos"] },
      { name: "5-Day Pack", price: "$200", period: "", features: ["Save $25 total", "Use anytime", "Never expires"], popular: true },
      { name: "10-Day Pack", price: "$380", period: "", features: ["Save $70 total", "Best for regulars", "Priority booking"] },
      { name: "Unlimited", price: "$750", period: "/mo", features: ["Unlimited daycare", "Early drop-off included", "10% off grooming"] },
    ],
  },
  boarding: {
    title: "Boarding",
    icon: "🌙",
    plans: [
      { name: "Standard", price: "$55", period: "/night", features: ["Comfortable suite", "3 potty breaks daily", "Playtime included"] },
      { name: "Deluxe", price: "$75", period: "/night", features: ["Larger suite", "Extra playtime", "Bedtime treat"], popular: true },
      { name: "Luxury", price: "$95", period: "/night", features: ["Premium suite with TV", "One-on-one attention", "Webcam access"] },
      { name: "Long Stay", price: "$50", period: "/night", features: ["7+ nights only", "All deluxe perks", "Free bath on checkout"] },
    ],
  },
  grooming: {
    title: "Grooming",
    icon: "✂️",
    plans: [
      { name: "Bath & Brush", price: "From $35", period: "", features: ["Shampoo & conditioner", "Blow dry & brush", "Ear cleaning"] },
      { name: "Full Groom", price: "From $65", period: "", features: ["Everything in Bath", "Haircut & styling", "Nail trim"], popular: true },
      { name: "Spa Package", price: "From $95", period: "", features: ["Full groom included", "Teeth brushing", "Paw treatment"] },
      { name: "Nail Trim", price: "$15", period: "", features: ["Quick service", "Walk-ins welcome", "Dremel optional"] },
    ],
  },
  training: {
    title: "Training",
    icon: "🎓",
    plans: [
      { name: "Private", price: "$95", period: "/hour", features: ["One-on-one focus", "Customized plan", "Homework provided"] },
      { name: "Group Class", price: "$225", period: "/6 weeks", features: ["Weekly sessions", "Socialization", "Graduation cert"], popular: true },
      { name: "Puppy Package", price: "$350", period: "", features: ["4 private sessions", "Puppy-specific", "Potty training tips"] },
      { name: "Board & Train", price: "$1,200", period: "/week", features: ["Intensive program", "Daily training", "Video updates"] },
    ],
  },
};

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-20 lg:py-24 bg-gradient-to-br from-sage to-sage-dark overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="container-app relative text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6"
            >
              Simple, Transparent Pricing
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-primary-foreground/80 max-w-2xl mx-auto"
            >
              No hidden fees. No surprises. Just great care at fair prices.
            </motion.p>
          </div>
        </section>

        {/* Pricing Sections */}
        {Object.entries(pricingData).map(([key, category], categoryIndex) => (
          <section
            key={key}
            className={`section-padding ${categoryIndex % 2 === 1 ? 'bg-muted/30' : ''}`}
          >
            <div className="container-app">
              <div className="flex items-center gap-4 mb-12">
                <span className="text-4xl">{category.icon}</span>
                <h2 className="font-display text-3xl font-bold text-foreground">
                  {category.title}
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {category.plans.map((plan, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative rounded-2xl p-6 border-2 ${
                      plan.popular
                        ? 'border-primary bg-coral-light'
                        : 'border-border bg-card'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" /> Popular
                        </span>
                      </div>
                    )}
                    <h3 className="font-semibold text-foreground text-lg mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="font-display text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-sage mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link to="/book">
                      <Button
                        variant={plan.popular ? "default" : "outline"}
                        className="w-full"
                      >
                        Book Now
                      </Button>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* FAQ CTA */}
        <section className="section-padding">
          <div className="container-app text-center">
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">
              Have Questions About Pricing?
            </h2>
            <p className="text-muted-foreground mb-6">
              Check out our FAQs or reach out to our friendly team.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/faqs">
                <Button variant="outline" size="lg">View FAQs</Button>
              </Link>
              <Link to="/contact">
                <Button variant="default" size="lg">
                  Contact Us
                  <ArrowRight className="w-5 h-5" />
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
