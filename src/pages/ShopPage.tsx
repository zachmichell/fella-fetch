import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const ShopPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <section className="section-padding">
          <div className="container-app text-center py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-lg mx-auto space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">
                Shop Coming Soon
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                We're working on bringing you premium food, treats, toys, and accessories your pet will love. Stay tuned!
              </p>
              <p className="text-sm text-muted-foreground">
                Questions? Contact us at{" "}
                <a href="mailto:hello@fellaandfetch.ca" className="text-foreground underline">
                  hello@fellaandfetch.ca
                </a>
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ShopPage;
