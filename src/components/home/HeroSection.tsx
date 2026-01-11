import { motion } from "framer-motion";
import { ArrowRight, Star, Heart, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-coral-light via-background to-sage-light opacity-50" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/10 to-golden/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-sage/10 to-sage-light/20 blur-3xl" />
      
      {/* Decorative Paw Prints */}
      <div className="absolute top-32 left-[10%] opacity-10">
        <svg width="60" height="60" viewBox="0 0 60 60" fill="currentColor" className="text-primary animate-paw">
          <ellipse cx="30" cy="38" rx="14" ry="18" />
          <circle cx="15" cy="18" r="8" />
          <circle cx="45" cy="18" r="8" />
          <circle cx="10" cy="32" r="6" />
          <circle cx="50" cy="32" r="6" />
        </svg>
      </div>
      <div className="absolute bottom-40 right-[15%] opacity-10 rotate-12">
        <svg width="40" height="40" viewBox="0 0 60 60" fill="currentColor" className="text-sage animate-paw" style={{ animationDelay: '0.5s' }}>
          <ellipse cx="30" cy="38" rx="14" ry="18" />
          <circle cx="15" cy="18" r="8" />
          <circle cx="45" cy="18" r="8" />
          <circle cx="10" cy="32" r="6" />
          <circle cx="50" cy="32" r="6" />
        </svg>
      </div>

      <div className="container-app relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-md border border-border/50 mb-6"
            >
              <div className="flex -space-x-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-coral-light to-sage-light border-2 border-card"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-golden text-golden" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                2,000+ Happy Pets
              </span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-[1.1] mb-6">
              Where Every
              <span className="block text-gradient">Tail Wags</span>
              With Joy
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Premium daycare, boarding, grooming, and training services. 
              Your pets deserve the best care while you're away.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <Link to="/book">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Book a Service
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  Explore Services
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center">
                  <Shield className="w-5 h-5 text-sage" />
                </div>
                <span className="text-sm font-medium text-foreground">Fully Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-coral-light flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Pet First Aid Certified</span>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Image Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Main Image */}
              <div className="absolute top-0 right-0 w-[75%] h-[75%] rounded-3xl overflow-hidden shadow-2xl">
                <div className="w-full h-full bg-gradient-to-br from-coral-light via-sage-light to-golden-light flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-golden flex items-center justify-center">
                      <svg width="80" height="80" viewBox="0 0 60 60" fill="white">
                        <ellipse cx="30" cy="38" rx="14" ry="18" />
                        <circle cx="15" cy="18" r="8" />
                        <circle cx="45" cy="18" r="8" />
                        <circle cx="10" cy="32" r="6" />
                        <circle cx="50" cy="32" r="6" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-foreground">Happy Pups Welcome!</p>
                  </div>
                </div>
              </div>

              {/* Secondary Image */}
              <div className="absolute bottom-0 left-0 w-[55%] h-[55%] rounded-3xl overflow-hidden shadow-xl border-4 border-card">
                <div className="w-full h-full bg-gradient-to-br from-sage-light to-cream flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-sage flex items-center justify-center">
                      <Heart className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Loved & Cared For</p>
                  </div>
                </div>
              </div>

              {/* Floating Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="absolute top-1/2 -left-8 bg-card rounded-2xl shadow-xl p-4 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-golden-light flex items-center justify-center">
                    <Star className="w-6 h-6 text-golden" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">5-Star Rating</p>
                    <p className="text-sm text-muted-foreground">500+ Reviews</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
