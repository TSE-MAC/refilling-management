import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import { getToken } from './lib/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import NewJob from './pages/NewJob';
import JobDetail from './pages/JobDetail';
import History from './pages/History';
import Parties from './pages/Parties';
import Stock from './pages/Stock';

function RequireAuth() {
  if (!getToken()) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/jobs" element={<PageTransition><Jobs /></PageTransition>} />
          <Route path="/jobs/new" element={<PageTransition><NewJob /></PageTransition>} />
          <Route path="/jobs/:id" element={<PageTransition><JobDetail /></PageTransition>} />
          <Route path="/history" element={<PageTransition><History /></PageTransition>} />
          <Route path="/parties" element={<PageTransition><Parties /></PageTransition>} />
          <Route path="/stock" element={<PageTransition><Stock /></PageTransition>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollReset />
      <Toaster position="top-center" richColors closeButton expand={false} />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;
