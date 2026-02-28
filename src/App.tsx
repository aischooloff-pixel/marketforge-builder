import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";

import { TelegramProvider, useTelegram } from "@/contexts/TelegramContext";
import { BannedScreen } from "@/components/BannedScreen";
import { FloatingZiplock } from "@/components/FloatingZiplock";
import { PoliceRaidGlitch } from "@/components/PoliceRaidGlitch";
import { TelegramSubscribePopup } from "@/components/TelegramSubscribePopup";
import { CrtBootScreen } from "@/components/CrtBootScreen";
import { AgeGate } from "@/components/AgeGate";
import { useEffect } from "react";
import Index from "./pages/Index";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import InfoPage from "./pages/InfoPage";
import DisclaimerPage from "./pages/DisclaimerPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const StartAppRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const startParam = window.Telegram?.WebApp?.initDataUnsafe &&
      (window.Telegram.WebApp as any).initDataUnsafe?.start_param;
    if (startParam === 'numbers' || startParam === 'review') {
      navigate('/profile', { replace: true });
    }
  }, [navigate]);
  return null;
};

const AppContent = () => {
  const { user, isLoading } = useTelegram();

  if (!isLoading && user?.is_banned) {
    return <BannedScreen />;
  }

  return (
    <CartProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <CrtBootScreen />
          <AgeGate />
          <FloatingZiplock />
          <PoliceRaidGlitch />
          <TelegramSubscribePopup />
          <div className="crt-overlay" />
          <BrowserRouter>
            <StartAppRedirect />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/info" element={<InfoPage />} />
              <Route path="/disclaimer" element={<DisclaimerPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </CartProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TelegramProvider>
        <AppContent />
      </TelegramProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
