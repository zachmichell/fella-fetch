import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sun, Moon, Scissors, GraduationCap, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    id: "daycare",
    title: "Daycare",
    description: "Supervised play, socialization, and exercise in a safe, fun environment. Perfect for busy pet parents.",
    icon: Sun,
    color: "from-golden to-primary",
    bgColor: "bg-golden-light",
    textColor: "text-golden",
    path: "/services/daycare",
    features: ["Supervised play groups", "Indoor & outdoor areas", "Nap time included", "Daily report cards"],
  },
  {
    id: "boarding",
    title: "Boarding",
    description: "Home-away-from-home overnight stays with 24/7 care, comfortable suites, and plenty of love.",
    icon: Moon,
    color: "from-navy to-navy-light",
    bgColor: "bg-sage-light",
    textColor: "text-navy",
    path: "/services/boarding",
    features: ["Private suites", "24/7 supervision", "Webcam access", "Bedtime treats"],
  },
  {
    id: "grooming",
    title: "Grooming",
    description: "Professional spa treatments from bath & brush to full grooms. Your pup will look and feel amazing.",
    icon: Scissors,
    color: "from-primary to-coral-dark",
    bgColor: "bg-coral-light",
    textColor: "text-primary",
    path: "/services/grooming",
    features: ["Bath & dry", "Breed-specific cuts", "Nail trimming", "Spa packages"],
  },
  {
    id: "training",
    title: "Training",
    description: "Expert-led classes and private sessions to build skills, confidence, and strengthen your bond.",
    icon: GraduationCap,
    color: "from-sage to-sage-dark",
    bgColor: "bg-sage-light",
    textColor: "text-sage-dark",
    path: "/services/training",
    features: ["Puppy basics", "Obedience training", "Behavior modification", "Private lessons"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ServicesSection = () => {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container-app">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 bg-coral-light text-primary font-medium text-sm rounded-full mb-4"
          >
            Our Services
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
          >
            Everything Your Pet Needs
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            From daily care to special treatments, we offer comprehensive services 
            designed to keep your furry friend happy and healthy.
          </motion.p>
        </div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-6 lg:gap-8"
        >
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.id}
                variants={cardVariants}
                className="group"
              >
                <Link to={service.path}>
                  <div className="bg-card rounded-2xl p-6 lg:p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-border/50 h-full">
                    <div className="flex flex-col sm:flex-row gap-6">
                      {/* Icon */}
                      <div className={`w-16 h-16 rounded-2xl ${service.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-8 h-8 ${service.textColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="font-display text-xl lg:text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {service.title}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {service.description}
                        </p>

                        {/* Features */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {service.features.map((feature, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>

                        {/* Learn More Link */}
                        <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                          <span>Learn More</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Shop CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 bg-gradient-to-r from-primary to-golden rounded-2xl p-8 lg:p-12 text-center"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="text-left">
                <h3 className="font-display text-2xl font-bold text-primary-foreground">
                  Shop Premium Pet Products
                </h3>
                <p className="text-primary-foreground/80">
                  Food, treats, toys, and accessories your pet will love
                </p>
              </div>
            </div>
            <Link to="/shop">
              <Button variant="hero-outline" size="lg">
                Visit Shop
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;
