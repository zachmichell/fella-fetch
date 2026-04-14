import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();

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
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/staff/login">
              <span className="text-xs tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors">
                Staff
              </span>
            </Link>
            <div className="w-px h-4 bg-border/50" />
            {user ? (
              <Link to="/portal">
                <Button variant="outline" size="default" className="tracking-[0.1em] text-sm gap-2">
                  <User className="h-4 w-4" />
                  MY PORTAL
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="default" className="tracking-[0.1em] text-sm gap-2">
                  <User className="h-4 w-4" />
                  SIGN IN
                </Button>
              </Link>
            )}
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
                  {user ? (
                    <Link to="/portal" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full tracking-[0.1em] text-sm gap-2">
                        <User className="h-4 w-4" />
                        MY PORTAL
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full tracking-[0.1em] text-sm gap-2">
                        <User className="h-4 w-4" />
                        SIGN IN
                      </Button>
                    </Link>
                  )}
                  <Link to="/book" onClick={() => setIsOpen(false)}>
                    <Button variant="default" className="w-full tracking-[0.1em] text-sm">
                      BOOK NOW
                    </Button>
                  </Link>
                  <Link to="/staff/login" onClick={() => setIsOpen(false)}>
                    <p className="text-center text-xs text-muted-foreground hover:text-foreground pt-2">
                      Staff Login
                    </p>
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
