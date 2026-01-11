import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 lg:pt-0">
      {/* Simple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-cream-warm to-background" />
      
      <div className="container-app relative text-center py-20 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-uppercase-spaced text-muted-foreground mb-8"
          >
            Premium Canine Care
          </motion.p>

          {/* Main Headline */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-medium text-foreground leading-[1.1] mb-8 tracking-tight">
            Where Every Tail
            <br />
            <span className="text-charcoal-muted">Wags With Joy</span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Daycare, boarding, grooming, and training services. 
            Your pets deserve exceptional care.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/book">
              <Button variant="default" size="lg" className="w-full sm:w-auto tracking-[0.1em] text-sm">
                BOOK A SERVICE
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/services">
              <Button variant="outline" size="lg" className="w-full sm:w-auto tracking-[0.1em] text-sm">
                EXPLORE SERVICES
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Service Icons Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-24 lg:mt-32"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 max-w-3xl mx-auto">
            {[
              { name: "STAY", icon: "🏠", path: "/services/boarding" },
              { name: "GROOM", icon: "✂️", path: "/services/grooming" },
              { name: "TRAIN", icon: "🎓", path: "/services/training" },
              { name: "PLAY", icon: "☀️", path: "/services/daycare" },
            ].map((service, index) => (
              <Link
                key={service.name}
                to={service.path}
                className="group flex flex-col items-center"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1, duration: 0.4 }}
                >
                  <div className="text-4xl lg:text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </div>
                  <span className="text-xs tracking-[0.2em] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {service.name}
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
