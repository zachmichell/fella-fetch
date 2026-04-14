import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Instagram } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    services: [
      { name: "Stay", path: "/services/boarding" },
      { name: "Groom", path: "/services/grooming" },
      { name: "Train", path: "/services/training" },
      { name: "Play", path: "/services/daycare" },
      { name: "Shop", path: "/shop" },
    ],
    company: [
      { name: "About", path: "/about" },
      { name: "Pricing", path: "/pricing" },
      { name: "FAQs", path: "/faqs" },
      { name: "Contact", path: "/contact" },
    ],
    legal: [
      { name: "Policies", path: "/policies" },
      { name: "Privacy", path: "/privacy" },
      { name: "Terms", path: "/terms" },
    ],
  };

  return (
    <footer className="bg-background border-t border-border">
      {/* Main Footer */}
      <div className="container-app py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-6">
              <div className="flex flex-col">
                <span className="font-display text-xl font-semibold tracking-[0.15em] text-foreground uppercase">
                  Fella & Fetch
                </span>
                <span className="text-xs text-muted-foreground tracking-[0.25em] uppercase">
                  Canine Care
                </span>
              </div>
            </Link>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Where tails wag and happiness happens. Premium care for your furry family members.
            </p>
            
            {/* Social */}
            <a
              href="#"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="w-5 h-5" />
              <span className="text-sm tracking-wide">@fellaandfetch</span>
            </a>
          </div>

          {/* Services Links */}
          <div>
            <h4 className="text-uppercase-spaced text-foreground mb-6">Services</h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-uppercase-spaced text-foreground mb-6">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-uppercase-spaced text-foreground mb-6">Contact</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Regina, Saskatchewan</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-5 h-5" />
                <span>(306) 500-3100</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-5 h-5" />
                <span>hello@fellaandfetch.ca</span>
              </div>
              <div className="flex items-start gap-3 text-muted-foreground">
                <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Mon–Sat: 7AM – 7PM<br />Sun: 9AM – 5PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container-app py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            © {currentYear} Fella & Fetch. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
