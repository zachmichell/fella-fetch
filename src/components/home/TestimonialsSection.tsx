import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "The team truly cares about every dog that walks through their doors. Our Bailey has never been happier.",
    author: "Sarah M.",
    pet: "Bailey, Golden Retriever",
  },
  {
    quote: "Professional, clean, and so attentive. The grooming results are always perfect. Highly recommend!",
    author: "Michael R.",
    pet: "Cooper, Doodle",
  },
  {
    quote: "The training program transformed our pup. Patient instructors who really know what they're doing.",
    author: "Emily T.",
    pet: "Luna, German Shepherd",
  },
];

const TestimonialsSection = () => {
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
            Testimonials
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-foreground"
          >
            What Pet Parents Say
          </motion.h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="text-center"
            >
              {/* Quote Mark */}
              <div className="text-6xl text-border mb-6 font-serif">"</div>
              
              {/* Quote */}
              <p className="text-lg text-foreground mb-8 leading-relaxed italic">
                {testimonial.quote}
              </p>
              
              {/* Author */}
              <div>
                <p className="font-medium text-foreground">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.pet}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
