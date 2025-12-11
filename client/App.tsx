
import React from 'react';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/AuthPage';
import { MessageSquare } from 'lucide-react';

/**
 * Hud-Hud Web Application
 * Part 3: Browser Persistence & Optimization
 * 
 * Tech Stack: React, Firebase Auth/Firestore, Tailwind.
 */

const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-denim-900 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-denim-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2 animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-cream-100 rounded-full mix-blend-multiply filter blur-3xl opacity-10 translate-x-1/2 translate-y-1/2 animate-blob animation-delay-2000"></div>

        {/* Logo Animation */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-cream-50 rounded-2xl flex items-center justify-center shadow-2xl mb-6 animate-bounce">
            <MessageSquare size={40} className="text-denim-700" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-widest mb-2 animate-pulse">HUD-HUD</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cream-200 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-cream-200 rounded-full animate-bounce delay-150"></div>
            <div className="w-2 h-2 bg-cream-200 rounded-full animate-bounce delay-300"></div>
          </div>
          <p className="text-denim-300 text-xs mt-4 font-medium tracking-wide opacity-80">Memuat riwayat masuk...</p>
        </div>
      </div>
    );
  }

  return currentUser ? <Layout /> : <AuthPage />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
