import React from 'react';
import { Outlet, useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { LogOut, QrCode, UserPlus } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';

export default function StaffLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const { admin } = useAuth();
  
  const handleLogout = () => {
    sessionStorage.removeItem('staffToken');
    if (admin) {
      navigate('/events');
    } else {
      navigate(`/staff/${slug}`);
    }
  };

  const isScanner = location.pathname.endsWith('/scan');
  const isOnsite = location.pathname.endsWith('/onsite');

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col transition-colors duration-200">
      {/* Top Navbar */}
      <header className="bg-white dark:bg-neutral-950 border-b-2 border-neutral-900 dark:border-neutral-700 shrink-0 relative z-20 transition-colors duration-200">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary-500 border-2 border-neutral-900 dark:border-white rounded-md flex items-center justify-center shadow-brutal dark:shadow-brutal-dark">
              <span className="text-white font-black">M</span>
            </div>
            <span className="text-neutral-900 dark:text-white font-black tracking-tight text-lg">Staff Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-neutral-900 dark:text-white border-2 border-neutral-900 dark:border-neutral-700 rounded-md shadow-brutal hover:shadow-brutal-hover dark:shadow-brutal-dark dark:hover:shadow-brutal-dark-hover active:translate-x-[2px] active:translate-y-[2px] transition-all bg-white dark:bg-neutral-800"
            >
              <span>Exit</span>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-neutral-50 dark:bg-neutral-900 pb-16 sm:pb-0 transition-colors duration-200">
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile & Desktop Floating) */}
      <nav className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:rounded-md bg-white dark:bg-neutral-950 border-t-2 sm:border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark z-50">
        <div className="flex items-center justify-center p-2 gap-2 sm:gap-4">
          <Link 
            to={`/staff/${slug}/scan`}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-6 sm:px-8 py-3 rounded-md transition-all duration-150 border-2 ${
              isScanner ? 'bg-primary-500 text-white border-neutral-900 dark:border-white shadow-brutal dark:shadow-brutal-dark active:translate-x-[2px] active:translate-y-[2px]' : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-900 dark:hover:border-neutral-700 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-6 h-6 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-sm font-black tracking-wide">SCANNER</span>
          </Link>
          
          <Link 
            to={`/staff/${slug}/onsite`}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-6 sm:px-8 py-3 rounded-md transition-all duration-150 border-2 ${
              isOnsite ? 'bg-primary-500 text-white border-neutral-900 dark:border-white shadow-brutal dark:shadow-brutal-dark active:translate-x-[2px] active:translate-y-[2px]' : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-900 dark:hover:border-neutral-700 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-6 h-6 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-sm font-black tracking-wide">WALK-IN</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
