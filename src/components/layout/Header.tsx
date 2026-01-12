import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "STAY", path: "/services/boarding" },
  { name: "GROOM", path: "/services/grooming" },
  { name: "TRAIN", path: "/services/training" },
  { name: "PLAY", path: "/services/daycare" },
  { name: "SHOP", path: "/shop" },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/30">
      <nav className="container-app">
        <div className="flex items-center justify-between h-20 lg:h-24">
          {/* Logo */}
          <Link to="/" className="flex flex-col items-center group">
            <span className="font-display text-xl lg:text-2xl font-semibold tracking-[0.15em] text-foreground uppercase">
              Fella & Fetch
            </span>
            <span className="text-[10px] lg:text-xs text-muted-foreground tracking-[0.25em] uppercase">
              Canine Care
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`text-sm tracking-[0.15em] font-medium transition-colors link-underline ${
                  isActive(item.path)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-6">
            <Link to="/staff/login">
              <span className="text-sm tracking-[0.1em] font-medium text-muted-foreground hover:text-foreground transition-colors link-underline">
                STAFF
              </span>
            </Link>
            <Link to="/login">
              <span className="text-sm tracking-[0.1em] font-medium text-muted-foreground hover:text-foreground transition-colors link-underline">
                SIGN IN
              </span>
            </Link>
            <Link to="/book">
              <Button variant="default" size="default" className="tracking-[0.1em] text-sm">
                BOOK NOW
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="py-8 space-y-1 border-t border-border/30">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`block py-4 text-center text-sm tracking-[0.2em] font-medium transition-colors ${
                      isActive(item.path)
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="pt-6 px-4 space-y-3 border-t border-border/30 mt-6">
                  <Link to="/staff/login" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full tracking-[0.1em] text-sm">
                      STAFF LOGIN
                    </Button>
                  </Link>
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full tracking-[0.1em] text-sm">
                      SIGN IN
                    </Button>
                  </Link>
                  <Link to="/book" onClick={() => setIsOpen(false)}>
                    <Button variant="default" className="w-full tracking-[0.1em] text-sm">
                      BOOK NOW
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Header;
