import { Suspense, useEffect, lazy } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Loader2 } from 'lucide-react';

// Lazy Load Pages to save bandwidth on initial load
const Home = lazy(() => import('./pages/Home'));
const Register = lazy(() => import('./pages/Register'));
// Lazy load the Admin Login page
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
// Lazy load the new Admin Dashboard page
const AdminDashboard = lazy(() => import('./pages/AdminDashboard')); 

// Component to force scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant" // Instant jump to top prevents seeing the bottom of the new page
    });
  }, [pathname]);

  return null;
};

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f8fdf8]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
      <p className="text-brand-dark font-medium animate-pulse">Loading content...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen bg-[#f8fdf8] font-sans text-gray-800">
        <Navbar />
        <main className="flex-grow pt-20">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              
              {/* 🛑 NEW URL: Admin Login Route */}
              <Route path="/secure-auth-2025-a5B8" element={<AdminLogin />} />
              
              {/* 🛑 NEW URL: Admin Dashboard Route */}
              <Route path="/console-access-81cW-ctrl" element={<AdminDashboard />} />
              
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
};

export default App;