import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCatalog } from '@/components/ProductCatalog';

const CatalogPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <ProductCatalog />
      </main>
      <Footer />
    </div>
  );
};

export default CatalogPage;
