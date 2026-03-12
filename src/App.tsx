import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import SatelliteDetail from "./pages/SatelliteDetail.tsx";
import AnomalyEngine from "./pages/AnomalyEngine.tsx";
import RULForecaster from "./pages/RULForecaster.tsx";
import AlertConfig from "./pages/AlertConfig.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/satellite/:id" element={<SatelliteDetail />} />
          <Route path="/anomalies" element={<AnomalyEngine />} />
          <Route path="/rul" element={<RULForecaster />} />
          <Route path="/alerts" element={<AlertConfig />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
