import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EventDetails from './pages/EventDetails';
import MyBookings from './pages/MyBookings';
import CreateEvent from './pages/CreateEvent';
import Payment from './pages/Payment';
import Success from './pages/Success';
import AdminAnalytics from './pages/admin/Analytics';
import AdminDashboard from './pages/AdminDashboard';
import { AnimatePresence } from 'framer-motion';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAppSelector(state => state.auth);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="premium-loader"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" />;

  return children;
};

function App() {
  const theme = useAppSelector(state => state.ui.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Router>
      <ScrollToTop />
      <div className="relative min-h-screen bg-black text-white selection:bg-primary/30 selection:text-white overflow-x-hidden">
        <Navbar />

        <main className="relative z-10">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/event/:id" element={<EventDetails />} />

              <Route
                path="/payment/:eventId"
                element={
                  <PrivateRoute>
                    <Payment />
                  </PrivateRoute>
                }
              />
              <Route
                path="/success/:bookingId"
                element={
                  <PrivateRoute>
                    <Success />
                  </PrivateRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <PrivateRoute>
                    <MyBookings />
                  </PrivateRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <PrivateRoute adminOnly>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <PrivateRoute adminOnly>
                    <AdminAnalytics />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/create"
                element={
                  <PrivateRoute adminOnly>
                    <CreateEvent />
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-event"
                element={
                  <PrivateRoute adminOnly>
                    <CreateEvent />
                  </PrivateRoute>
                }
              />
            </Routes>
          </AnimatePresence>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
