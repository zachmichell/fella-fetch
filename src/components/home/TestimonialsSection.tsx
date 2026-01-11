import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    id: 1,
    name: "Sarah M.",
    pet: "Max - Golden Retriever",
    rating: 5,
    text: "PawsHub has been a lifesaver! Max absolutely loves daycare and comes home tired and happy. The staff really knows how to handle him, and the daily report cards make me feel connected even when I'm at work.",
    image: null,
  },
  {
    id: 2,
    name: "James & Lisa T.",
    pet: "Bella & Duke - Labs",
    rating: 5,
    text: "We were nervous about boarding our two dogs for the first time, but PawsHub made it so easy. The webcam access was amazing - we checked in on them every day during our vacation!",
    image: null,
  },
  {
    id: 3,
    name: "Michelle K.",
    pet: "Coco - Standard Poodle",
    rating: 5,
    text: "The grooming team is incredible! Coco always looks absolutely stunning after her appointments. The online booking is super easy, and they remember exactly how I like her cut.",
    image: null,
  },
  {
    id: 4,
    name: "David R.",
    pet: "Zeus - German Shepherd",
    rating: 5,
    text: "Zeus completed the obedience training program and the transformation is unbelievable. The trainers were patient and professional. I finally have a well-behaved dog!",
    image: null,
  },
];

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="section-padding bg-gradient-to-br from-navy to-navy-light overflow-hidden">
      <div className="container-app">
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 bg-primary/20 text-primary font-medium text-sm rounded-full mb-4"
          >
            Testimonials
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4"
          >
            What Pet Parents Say
          </motion.h2>
        </div>

        {/* Testimonial Carousel */}
        <div className="relative max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-card rounded-3xl p-8 lg:p-12 shadow-2xl"
            >
              {/* Quote Icon */}
              <div className="w-12 h-12 rounded-full bg-coral-light flex items-center justify-center mb-6">
                <Quote className="w-6 h-6 text-primary" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-golden text-golden" />
                ))}
              </div>

              {/* Testimonial Text */}
              <blockquote className="text-lg lg:text-xl text-foreground leading-relaxed mb-8">
                "{testimonials[currentIndex].text}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-golden flex items-center justify-center">
                  <span className="text-xl font-bold text-primary-foreground">
                    {testimonials[currentIndex].name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {testimonials[currentIndex].name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonials[currentIndex].pet}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              className="w-12 h-12 rounded-full bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === currentIndex
                      ? "bg-primary w-8"
                      : "bg-primary-foreground/30 hover:bg-primary-foreground/50"
                  }`}
                />
              ))}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="w-12 h-12 rounded-full bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
