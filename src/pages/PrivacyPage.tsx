import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-app py-20 max-w-3xl">
        <h1 className="font-display text-3xl font-semibold mb-6">Privacy Policy</h1>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Fella & Fetch Canine Care collects personal information such as your name, email address, phone number, and pet details in order to provide booking, account, and care services.
          </p>
          <p>
            We use this information solely to manage your appointments, communicate updates about your pets, and improve our services. Your data is stored securely and is never sold, rented, or shared with third parties for marketing purposes.
          </p>
          <p>
            We may share limited information with service providers who assist in operating our platform, but only as necessary to deliver our services to you.
          </p>
          <p>
            If you have any questions about your personal data, wish to request access to the information we hold, or would like to request its deletion, please contact us at{" "}
            <a href="mailto:hello@fellaandfetch.ca" className="text-primary hover:underline">
              hello@fellaandfetch.ca
            </a>.
          </p>
          <p className="text-sm text-muted-foreground/70">
            This policy may be updated from time to time. Please check back periodically for changes.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
