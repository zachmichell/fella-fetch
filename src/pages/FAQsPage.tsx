import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const FAQsPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-app py-20">
        <h1 className="font-display text-3xl font-semibold mb-4">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">
          Our FAQ is coming soon. For questions, contact us at{" "}
          <a href="mailto:hello@fellaandfetch.ca" className="text-primary hover:underline">
            hello@fellaandfetch.ca
          </a>
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default FAQsPage;
