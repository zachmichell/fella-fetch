import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sun, Moon, Scissors, GraduationCap, ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

const services = [
  {
    id: "daycare",
    title: "Daycare",
    description: "Supervised play, socialization, and exercise in a safe, fun environment. Your dog will come home happy and tired.",
    icon: Sun,
    color: "from-golden to-primary",
    bgColor: "bg-golden-light",
    features: ["Play groups by size", "Indoor/outdoor areas", "Daily report cards"],
    price: "From $45/day",
  },
  {
    id: "boarding",
    title: "Boarding",
    description: "Home-away-from-home overnight stays with 24/7 care, comfortable suites, and plenty of love.",
    icon: Moon,
    color: "from-navy to-navy-light",
    bgColor: "bg-sage-light",
    features: ["Private suites", "24/7 supervision", "Webcam access"],
    price: "From $55/night",
  },
  {
    id: "grooming",
    title: "Grooming",
    description: "Professional spa treatments from bath & brush to full grooms. Your pup will look and feel amazing.",
    icon: Scissors,
    color: "from-primary to-coral-dark",
    bgColor: "bg-coral-light",
    features: ["Certified groomers", "All-natural products", "Breed-specific cuts"],
    price: "From $35",
  },
  {
    id: "training",
    title: "Training",
    description: "Expert-led classes and private sessions to build skills, confidence, and strengthen your bond.",
    icon: GraduationCap,
    color: "from-sage to-sage-dark",
    bgColor: "bg-sage-light",
    features: ["Positive methods", "Group & private", "Puppy to advanced"],
    price: "From $95/session",
  },
];

const ServicesOverview = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 bg-gradient-to-br from-primary to-golden overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="container-app relative text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6"
            >
              Our Services
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-primary-foreground/80 max-w-2xl mx-auto"
            >
              Comprehensive care for your furry family member. From daily adventures to 
              overnight stays, we've got everything covered.
            </motion.p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="section-padding">
          <div className="container-app">
            <div className="grid md:grid-cols-2 gap-8">
              {services.map((service, i) => {
                const Icon = service.icon;
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link to={`/services/${service.id}`}>
                      <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${service.color} p-8 lg:p-10 group hover:shadow-2xl transition-shadow`}>
                        <div className="relative z-10">
                          <div className={`w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6`}>
                            <Icon className="w-8 h-8 text-primary-foreground" />
                          </div>
                          <h2 className="font-display text-3xl font-bold text-primary-foreground mb-3">
                            {service.title}
                          </h2>
                          <p className="text-primary-foreground/80 mb-6">
                            {service.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-6">
                            {service.features.map((f, j) => (
                              <span key={j} className="px-3 py-1 bg-white/20 text-primary-foreground text-sm rounded-full">
                                {f}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-primary-foreground">{service.price}</span>
                            <span className="flex items-center gap-2 text-primary-foreground font-medium group-hover:gap-3 transition-all">
                              Learn More <ArrowRight className="w-5 h-5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding bg-muted/30">
          <div className="container-app text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Book your first visit online in minutes. New customers get 20% off their first service!
            </p>
            <Link to="/book">
              <Button variant="hero" size="xl">
                Book a Service
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ServicesOverview;
