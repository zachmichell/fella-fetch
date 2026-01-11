import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const services = [
  {
    id: "boarding",
    title: "Stay",
    subtitle: "Overnight Boarding",
    description: "Home-away-from-home overnight stays with 24/7 care, comfortable suites, and plenty of love.",
    path: "/services/boarding",
    features: ["Private suites", "24/7 supervision", "Webcam access", "Bedtime routines"],
  },
  {
    id: "grooming",
    title: "Groom",
    subtitle: "Professional Grooming",
    description: "Professional spa treatments from bath & brush to full grooms. Your pup will look and feel amazing.",
    path: "/services/grooming",
    features: ["Bath & dry", "Breed-specific cuts", "Nail care", "Spa treatments"],
  },
  {
    id: "training",
    title: "Train",
    subtitle: "Expert Training",
    description: "Expert-led classes and private sessions to build skills, confidence, and strengthen your bond.",
    path: "/services/training",
    features: ["Puppy basics", "Obedience", "Behavior work", "Private lessons"],
  },
  {
    id: "daycare",
    title: "Play",
    subtitle: "Daily Daycare",
    description: "Supervised play, socialization, and exercise in a safe, fun environment for your pup.",
    path: "/services/daycare",
    features: ["Supervised play", "Indoor & outdoor", "Nap time", "Report cards"],
  },
];

const ServicesSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container-app">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-uppercase-spaced text-muted-foreground mb-4"
          >
            Our Services
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-foreground"
          >
            Everything Your Pet Needs
          </motion.h2>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-px bg-border">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Link to={service.path} className="group block">
                <div className="bg-background p-8 lg:p-12 h-full hover:bg-cream-warm transition-colors duration-300">
                  {/* Title */}
                  <div className="mb-6">
                    <span className="text-uppercase-spaced text-muted-foreground block mb-2">
                      {service.subtitle}
                    </span>
                    <h3 className="font-display text-3xl lg:text-4xl font-medium text-foreground">
                      {service.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground mb-8 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-3 mb-8">
                    {service.features.map((feature, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-muted text-muted-foreground text-xs tracking-wide"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Link */}
                  <div className="flex items-center gap-2 text-foreground font-medium text-sm tracking-wide group-hover:gap-4 transition-all duration-300">
                    <span>LEARN MORE</span>
                    <ArrowRight className="w-4 h-4" />
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
            <div className="bg-foreground text-primary-foreground p-8 lg:p-12 text-center hover:bg-charcoal-light transition-colors duration-300">
              <p className="text-uppercase-spaced text-primary-foreground/60 mb-2">
                Retail
              </p>
              <h3 className="font-display text-2xl lg:text-3xl font-medium mb-4">
                Shop
              </h3>
              <p className="text-primary-foreground/70 max-w-md mx-auto mb-6">
                Premium food, treats, toys, and accessories your pet will love.
              </p>
              <div className="flex items-center justify-center gap-2 font-medium text-sm tracking-wide group-hover:gap-4 transition-all duration-300">
                <span>VISIT SHOP</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;
