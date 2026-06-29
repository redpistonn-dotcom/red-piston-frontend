import "./index.css"; // global reset + @keyframes spin + .rp-spinner classes
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { StoreContext, useStoreProvider } from "./store";
import { CartProvider } from "./context/CartContext";
import App from "./App.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before marking stale
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't hammer the API on every window focus
      refetchOnWindowFocus: false,
      // Retry once on failure, not 3 times (default)
      retry: 1,
    },
  },
});

// eslint-disable-next-line react-refresh/only-export-components
export function Root() {
  const store = useStoreProvider();
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <QueryClientProvider client={queryClient}>
        <StoreContext.Provider value={store}>
          <CartProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </CartProvider>
        </StoreContext.Provider>
        {/* Only shows in dev — zero cost in production build */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
