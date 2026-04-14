import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const PoliciesPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-app py-20">
        <h1 className="font-display text-3xl font-semibold mb-4">Policies</h1>
        <p className="text-muted-foreground">
          Our policies document is coming soon. For inquiries, contact{" "}
          <a href="mailto:hello@fellaandfetch.ca" className="text-primary hover:underline">
            hello@fellaandfetch.ca
          </a>
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default PoliciesPage;
