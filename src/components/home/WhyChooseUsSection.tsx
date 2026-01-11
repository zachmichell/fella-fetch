import { motion } from "framer-motion";
import { Shield, Heart, Clock, Award } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Fully Insured",
    description: "Complete peace of mind with comprehensive insurance coverage for all pets in our care.",
  },
  {
    icon: Heart,
    title: "Certified Staff",
    description: "Our team is trained in pet first aid and animal behavior for the highest standard of care.",
  },
  {
    icon: Clock,
    title: "Flexible Hours",
    description: "Extended drop-off and pick-up times to fit your schedule. We're here when you need us.",
  },
  {
    icon: Award,
    title: "Premium Facilities",
    description: "Modern, clean, and comfortable spaces designed specifically for your pet's wellbeing.",
  },
];

const WhyChooseUsSection = () => {
  return (
    <section className="section-padding bg-cream-warm">
      <div className="container-app">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-uppercase-spaced text-muted-foreground mb-4"
          >
            Why Choose Us
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-foreground max-w-2xl mx-auto"
          >
            Your Pet's Happiness Is Our Priority
          </motion.h2>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-6 border border-border flex items-center justify-center">
                  <Icon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-medium text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
