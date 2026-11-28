import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";

import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query"

import {
    BrowserRouter
} from "react-router-dom";

import './index.css'
import App from './App.jsx'
import "./i18n";
import { initTheme } from "./theme";

// Light/dark before the first render, so the page never flashes the wrong theme
initTheme();

// Tab title from VITE_APP_NAME; index.html has a fallback
if (import.meta.env.VITE_APP_NAME) document.title = import.meta.env.VITE_APP_NAME;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { 
      staleTime: 60_000, 
      refetchOnWindowFocus: false,
      retry: (count, err) => !err?.sessionExpired && count < 3, 
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
