import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import { ThemeProvider } from "next-themes";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <TooltipProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </TooltipProvider>
  </ThemeProvider>,
);
