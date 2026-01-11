import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const AboutPage = () => {
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
              About Us
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-foreground mb-6"
            >
              Our Story
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Regina's premier 24-hour supervised canine care facility. 
              A true home away from home for your furry family member.
            </motion.p>
          </div>
        </section>

        {/* Story Section */}
        <section className="section-padding">
          <div className="container-app">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <p className="text-uppercase-spaced text-muted-foreground mb-4">
                  Who We Are
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-medium text-foreground mb-6">
                  Where Every Tail Wags With Joy
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Fella & Fetch is Regina's premier canine care facility, offering comprehensive 
                    services including daycare, overnight boarding, professional grooming, and 
                    expert training—all under one roof.
                  </p>
                  <p>
                    What sets us apart is our commitment to providing a true "home away from home" 
                    experience. With 24-hour supervision, comfortable individual suites with Kuranda 
                    beds, and carefully supervised group play, your dog receives the attention and 
                    care they deserve.
                  </p>
                  <p>
                    Our team is passionate about dogs and dedicated to creating a safe, enriching 
                    environment where every pup can thrive. From puppy socialization to advanced 
                    training, from a quick nail trim to a full spa day—we're here for every stage 
                    of your dog's life.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="grid grid-cols-2 gap-6"
              >
                {[
                  { label: "24-Hour", sublabel: "Supervision" },
                  { label: "Expert", sublabel: "Training" },
                  { label: "Professional", sublabel: "Grooming" },
                  { label: "Loving", sublabel: "Care" },
                ].map((stat, i) => (
                  <div key={i} className="border border-border p-6 text-center">
                    <div className="font-display text-2xl font-medium text-foreground">{stat.label}</div>
                    <div className="text-sm text-muted-foreground">{stat.sublabel}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Services Overview */}
        <section className="section-padding bg-cream-warm">
          <div className="container-app">
            <div className="text-center mb-16">
              <p className="text-uppercase-spaced text-muted-foreground mb-4">
                What We Offer
              </p>
              <h2 className="font-display text-3xl font-medium text-foreground">
                Comprehensive Canine Care
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { 
                  title: "Play", 
                  subtitle: "Daycare",
                  description: "Full and half-day supervised play with indoor/outdoor areas and rest periods." 
                },
                { 
                  title: "Stay", 
                  subtitle: "Boarding",
                  description: "Overnight stays in individual suites with 24-hour supervision and group play." 
                },
                { 
                  title: "Groom", 
                  subtitle: "Grooming",
                  description: "Professional bath & brush, full grooms, nail care, and spa treatments." 
                },
                { 
                  title: "Train", 
                  subtitle: "Training",
                  description: "Puppy socialization, obedience classes, and private training sessions." 
                },
              ].map((service, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-uppercase-spaced text-muted-foreground text-xs mb-2">{service.subtitle}</p>
                  <h3 className="font-display text-xl font-medium text-foreground mb-3">{service.title}</h3>
                  <p className="text-muted-foreground text-sm">{service.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="section-padding">
          <div className="container-app max-w-3xl">
            <div className="text-center mb-12">
              <p className="text-uppercase-spaced text-muted-foreground mb-4">
                Requirements
              </p>
              <h2 className="font-display text-3xl font-medium text-foreground">
                What We Require
              </h2>
            </div>

            <div className="space-y-6">
              {[
                { 
                  title: "Vaccinations", 
                  content: "Required: Rabies, Parvo, Distemper. Highly Recommended: Bordetella." 
                },
                { 
                  title: "Spay/Neuter Policy", 
                  content: "All dogs over 8 months must be altered. No ovarian spays or vasectomies accepted." 
                },
                { 
                  title: "30-Day Rule", 
                  content: "New dogs must be in the owner's home for 30 days before attending any service." 
                },
                { 
                  title: "Assessment", 
                  content: "All new dogs require a temperament assessment ($35) before daycare or boarding." 
                },
                { 
                  title: "Cancellation Policy", 
                  content: "24 hours notice for Daycare. 48 business hours for Grooming and Boarding." 
                },
              ].map((req, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-border pb-6"
                >
                  <h3 className="font-medium text-foreground mb-2">{req.title}</h3>
                  <p className="text-muted-foreground">{req.content}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="section-padding bg-foreground text-primary-foreground">
          <div className="container-app">
            <div className="text-center mb-12">
              <p className="text-uppercase-spaced text-primary-foreground/60 mb-4">
                Visit Us
              </p>
              <h2 className="font-display text-3xl font-medium">
                Get in Touch
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <MapPin className="w-6 h-6 mx-auto mb-4 text-primary-foreground/60" strokeWidth={1.5} />
                <p className="font-medium mb-1">Address</p>
                <p className="text-primary-foreground/70 text-sm">
                  1600 Osler St<br />Regina, SK
                </p>
              </div>
              <div className="text-center">
                <Phone className="w-6 h-6 mx-auto mb-4 text-primary-foreground/60" strokeWidth={1.5} />
                <p className="font-medium mb-1">Phone</p>
                <p className="text-primary-foreground/70 text-sm">(306) 540-4451</p>
              </div>
              <div className="text-center">
                <Mail className="w-6 h-6 mx-auto mb-4 text-primary-foreground/60" strokeWidth={1.5} />
                <p className="font-medium mb-1">Email</p>
                <p className="text-primary-foreground/70 text-sm">hello@fellaandfetch.ca</p>
              </div>
              <div className="text-center">
                <Clock className="w-6 h-6 mx-auto mb-4 text-primary-foreground/60" strokeWidth={1.5} />
                <p className="font-medium mb-1">Hours</p>
                <p className="text-primary-foreground/70 text-sm">
                  Mon–Fri: 7AM–6PM<br />Sat–Sun: 9AM–5PM
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
