import { Suspense, useEffect, lazy } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Loader2 } from 'lucide-react';

// Lazy Load Pages to save bandwidth on initial load
const Home = lazy(() => import('./pages/Home'));
const Register = lazy(() => import('./pages/Register'));
// ✅ 1. ADD THIS LINE: Lazy load the new Admin Login page
const AdminLogin = lazy(() => import('./pages/AdminLogin'));

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
        <main className="flex-grow">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register />} />
              
              {/* ✅ 2. ADD THIS LINE: The hidden "Secret" Route */}
              <Route path="/secret-admin-login" element={<AdminLogin />} />
              
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
};

export default App;