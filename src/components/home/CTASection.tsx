import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="section-padding">
      <div className="container-app">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-golden p-8 lg:p-16"
        >
          {/* Background Decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          
          {/* Decorative Paw */}
          <div className="absolute top-8 right-8 opacity-10">
            <svg width="120" height="120" viewBox="0 0 60 60" fill="white">
              <ellipse cx="30" cy="38" rx="14" ry="18" />
              <circle cx="15" cy="18" r="8" />
              <circle cx="45" cy="18" r="8" />
              <circle cx="10" cy="32" r="6" />
              <circle cx="50" cy="32" r="6" />
            </svg>
          </div>

          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                Ready to Give Your Pet the Best Care?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-lg">
                Book your first visit today and see why thousands of pet parents 
                trust PawsHub for their furry family members.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/book">
                  <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                    <Calendar className="w-5 h-5" />
                    Book Online
                  </Button>
                </Link>
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                  <Phone className="w-5 h-5" />
                  (555) 123-PAWS
                </Button>
              </div>
            </div>

            {/* Right Content - Features */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Easy Online Booking", sublabel: "24/7 availability" },
                { label: "First Visit Discount", sublabel: "20% off services" },
                { label: "Free Consultation", sublabel: "Meet our team" },
                { label: "Flexible Packages", sublabel: "Save on bundles" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center"
                >
                  <p className="font-semibold text-primary-foreground">{item.label}</p>
                  <p className="text-sm text-primary-foreground/70">{item.sublabel}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
