import { motion } from "framer-motion";
import { Shield, Heart, Clock, Users, Award, Camera } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Fully Insured & Bonded",
    description: "Complete peace of mind with comprehensive insurance coverage for your pet's safety.",
    color: "text-sage",
    bgColor: "bg-sage-light",
  },
  {
    icon: Heart,
    title: "Passionate Pet Lovers",
    description: "Our team genuinely loves animals. Your pet will receive the same care we give our own.",
    color: "text-primary",
    bgColor: "bg-coral-light",
  },
  {
    icon: Clock,
    title: "Flexible Scheduling",
    description: "Book online 24/7 with easy rescheduling. We work around your busy life.",
    color: "text-golden",
    bgColor: "bg-golden-light",
  },
  {
    icon: Users,
    title: "Expert Staff",
    description: "Pet First Aid certified professionals trained in behavior and care best practices.",
    color: "text-navy",
    bgColor: "bg-sage-light",
  },
  {
    icon: Camera,
    title: "Photo Updates",
    description: "Receive daily photos and report cards so you never miss a moment.",
    color: "text-primary",
    bgColor: "bg-coral-light",
  },
  {
    icon: Award,
    title: "Award-Winning Care",
    description: "Voted #1 pet care facility in the region for 3 consecutive years.",
    color: "text-golden",
    bgColor: "bg-golden-light",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const WhyChooseUsSection = () => {
  return (
    <section className="section-padding">
      <div className="container-app">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-1.5 bg-sage-light text-sage font-medium text-sm rounded-full mb-4"
            >
              Why PawsHub
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6"
            >
              The PawsHub
              <span className="text-gradient"> Difference</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground mb-8"
            >
              We're not just another pet care facility. We're a community of passionate 
              pet lovers dedicated to providing exceptional experiences for both pets and their parents.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-3 gap-6"
            >
              <div>
                <div className="font-display text-4xl font-bold text-gradient">10+</div>
                <p className="text-sm text-muted-foreground">Years Experience</p>
              </div>
              <div>
                <div className="font-display text-4xl font-bold text-gradient">2K+</div>
                <p className="text-sm text-muted-foreground">Happy Pets</p>
              </div>
              <div>
                <div className="font-display text-4xl font-bold text-gradient">4.9</div>
                <p className="text-sm text-muted-foreground">Star Rating</p>
              </div>
            </motion.div>
          </div>

          {/* Right Content - Features Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 gap-6"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="group"
                >
                  <div className="p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-all duration-300 h-full">
                    <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
