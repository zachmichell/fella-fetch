import { motion } from "framer-motion";
import { Heart, Award, Users, Shield } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const team = [
  { name: "Sarah Johnson", role: "Founder & Lead Trainer", emoji: "👩‍🦰" },
  { name: "Mike Chen", role: "Head Groomer", emoji: "👨" },
  { name: "Emily Davis", role: "Daycare Manager", emoji: "👩" },
  { name: "James Wilson", role: "Boarding Supervisor", emoji: "👨‍🦱" },
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-20 lg:py-32 bg-gradient-to-br from-sage to-sage-dark overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="container-app relative text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6"
            >
              Our Story
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-primary-foreground/80 max-w-2xl mx-auto"
            >
              Built by pet lovers, for pet lovers. We're on a mission to provide 
              the best care experience for your furry family.
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
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6">
                  Where It All Began
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    PawsHub started in 2014 when our founder, Sarah Johnson, couldn't find 
                    a pet care facility that met her standards for her own dogs. She dreamed 
                    of a place that felt like home—where pets were treated like family, not 
                    just guests.
                  </p>
                  <p>
                    What began as a small daycare operation has grown into a full-service 
                    pet care campus offering daycare, boarding, grooming, and training. But 
                    no matter how much we've grown, our core mission remains the same: 
                    provide exceptional care with genuine love.
                  </p>
                  <p>
                    Today, we're proud to serve over 2,000 pets and their families, 
                    maintaining a 4.9-star rating and countless wagging tails.
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
                  { icon: Heart, label: "10+ Years", sublabel: "Of loving care" },
                  { icon: Users, label: "2,000+", sublabel: "Happy pets" },
                  { icon: Award, label: "4.9 Stars", sublabel: "Average rating" },
                  { icon: Shield, label: "Certified", sublabel: "Pet first aid" },
                ].map((stat, i) => (
                  <div key={i} className="bg-card rounded-2xl p-6 text-center border border-border/50">
                    <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                    <div className="font-display text-2xl font-bold text-foreground">{stat.label}</div>
                    <div className="text-sm text-muted-foreground">{stat.sublabel}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="section-padding bg-muted/30">
          <div className="container-app">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Meet Our Team
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Passionate pet lovers who treat every animal like their own.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl p-6 text-center border border-border/50"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-golden flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">{member.emoji}</span>
                  </div>
                  <h3 className="font-semibold text-foreground">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="section-padding">
          <div className="container-app text-center">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-12">
              Our Values
            </h2>
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { title: "Safety First", description: "Your pet's wellbeing is our top priority. We maintain strict safety protocols and trained staff at all times." },
                { title: "Genuine Love", description: "We're not just pet care providers—we're pet lovers. Every animal receives the affection they deserve." },
                { title: "Transparency", description: "From pricing to policies, we believe in honest communication. No surprises, just trust." },
              ].map((value, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
