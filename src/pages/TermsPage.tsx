import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const TermsPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-app py-20 max-w-3xl">
        <h1 className="font-display text-3xl font-semibold mb-6">Terms of Service</h1>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            By accessing or using the Fella & Fetch Canine Care website and booking platform, you agree to the following terms and conditions.
          </p>
          <p>
            <strong className="text-foreground">Services.</strong> Our platform allows you to book daycare, boarding, grooming, and training services for your pet. All bookings are subject to availability and confirmation by our staff.
          </p>
          <p>
            <strong className="text-foreground">Account Responsibility.</strong> You are responsible for maintaining the accuracy of your account information, including pet details, vaccination records, and contact information. Providing false or outdated information may result in service refusal.
          </p>
          <p>
            <strong className="text-foreground">Cancellations.</strong> We reserve the right to cancel or modify reservations at our discretion. Clients are encouraged to contact us as early as possible if plans change.
          </p>
          <p>
            <strong className="text-foreground">Liability.</strong> While we take every precaution to ensure the safety and well-being of your pet, Fella & Fetch Canine Care is not liable for illness, injury, or loss that may occur during normal care activities.
          </p>
          <p>
            <strong className="text-foreground">Changes to Terms.</strong> We may update these terms from time to time. Continued use of our services constitutes acceptance of any changes.
          </p>
          <p>
            For questions about these terms, please contact us at{" "}
            <a href="mailto:hello@fellaandfetch.ca" className="text-primary hover:underline">
              hello@fellaandfetch.ca
            </a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;
