import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

// Import icons
import iconStay from "@/assets/icons/icon-stay.png";
import iconGroom from "@/assets/icons/icon-groom.png";
import iconTrain from "@/assets/icons/icon-train.png";
import iconShop from "@/assets/icons/icon-shop.png";

const services = [
  {
    id: "daycare",
    title: "Play",
    subtitle: "Daily Daycare",
    description: "Supervised play, socialization, and exercise in a safe, fun environment. Your dog will come home happy and tired.",
    icon: iconStay,
    features: ["Play groups by size", "Indoor/outdoor areas", "Daily report cards"],
    price: "From $25/half day",
  },
  {
    id: "boarding",
    title: "Stay",
    subtitle: "Overnight Boarding",
    description: "Home-away-from-home overnight stays with 24/7 care, individual suites with Kuranda beds, and plenty of love.",
    icon: iconStay,
    features: ["Individual suites", "24/7 supervision", "Group play included"],
    price: "$25/night + daycare",
  },
  {
    id: "grooming",
    title: "Groom",
    subtitle: "Professional Grooming",
    description: "Professional spa treatments from bath & brush to full grooms. Your pup will look and feel amazing.",
    icon: iconGroom,
    features: ["Bath & brush from $60", "Full groom from $75", "Nail trim $15"],
    price: "From $15",
  },
  {
    id: "training",
    title: "Train",
    subtitle: "Training Academy",
    description: "Expert-led classes and private sessions using positive reinforcement to build skills and strengthen your bond.",
    icon: iconTrain,
    features: ["Puppy to advanced", "Group & private", "Positive methods"],
    price: "From $25/class",
  },
];

const ServicesOverview = () => {
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
              What We Offer
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-foreground mb-6"
            >
              Our Services
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Regina's premier 24-hour supervised canine care facility. 
              Comprehensive care for your furry family member.
            </motion.p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="section-padding">
          <div className="container-app">
            <div className="grid md:grid-cols-2 gap-px bg-border">
              {services.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link to={`/services/${service.id}`} className="group block">
                    <div className="bg-background p-8 lg:p-12 h-full hover:bg-cream-warm transition-colors duration-300">
                      {/* Icon */}
                      <div className="w-14 h-14 mb-6 group-hover:scale-110 transition-transform duration-300">
                        <img 
                          src={service.icon} 
                          alt={service.title}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Title */}
                      <p className="text-uppercase-spaced text-muted-foreground mb-2">
                        {service.subtitle}
                      </p>
                      <h2 className="font-display text-3xl lg:text-4xl font-medium text-foreground mb-4">
                        {service.title}
                      </h2>

                      {/* Description */}
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {service.description}
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {service.features.map((f, j) => (
                          <span key={j} className="px-3 py-1.5 bg-muted text-muted-foreground text-xs tracking-wide">
                            {f}
                          </span>
                        ))}
                      </div>

                      {/* Price and Link */}
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{service.price}</span>
                        <span className="flex items-center gap-2 text-foreground text-sm tracking-wide group-hover:gap-4 transition-all duration-300">
                          LEARN MORE <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Shop CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-px"
            >
              <Link to="/shop" className="group block">
                <div className="bg-foreground text-primary-foreground p-8 lg:p-12 hover:bg-charcoal-light transition-colors duration-300">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 invert opacity-90">
                        <img src={iconShop} alt="Shop" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-center lg:text-left">
                        <p className="text-uppercase-spaced text-primary-foreground/60 mb-1">Retail</p>
                        <h3 className="font-display text-2xl lg:text-3xl font-medium">Shop</h3>
                      </div>
                    </div>
                    <p className="text-primary-foreground/70 max-w-md text-center lg:text-left">
                      Premium food, treats, toys, and accessories your pet will love.
                    </p>
                    <div className="flex items-center gap-2 font-medium text-sm tracking-wide group-hover:gap-4 transition-all duration-300">
                      VISIT SHOP <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding bg-cream-warm">
          <div className="container-app text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-uppercase-spaced text-muted-foreground mb-4"
            >
              Get Started
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl font-medium text-foreground mb-4"
            >
              Ready to Book?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-muted-foreground mb-8 max-w-xl mx-auto"
            >
              New dogs require a $35 assessment. Book online or give us a call to schedule your first visit.
            </motion.p>
            <Link to="/book">
              <Button variant="default" size="lg" className="tracking-[0.1em] text-sm">
                BOOK A SERVICE
                <ArrowRight className="w-4 h-4 ml-2" />
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
