import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const FAQsPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-app py-20">
        <h1 className="font-display text-3xl font-semibold mb-4">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">This page is coming soon. Check back later for answers to common questions about our services.</p>
      </main>
      <Footer />
    </div>
  );
};

export default FAQsPage;
