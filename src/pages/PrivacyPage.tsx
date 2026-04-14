import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container-app py-20">
        <h1 className="font-display text-3xl font-semibold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground">This page is coming soon. Our privacy policy will be published here shortly.</p>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
