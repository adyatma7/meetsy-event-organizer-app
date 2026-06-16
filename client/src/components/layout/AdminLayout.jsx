import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import useAppStore from '../../stores/useAppStore';
import { ToastContainer } from '../ui/Toast';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  LogOut, 
  Menu,
  Loader2,
  Settings
} from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import Skeleton from '../ui/Skeleton';

export default function AdminLayout() {
  const { isAuthenticated, loading, logout, admin } = useAuth();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-900 transition-colors duration-200">
        <div className="w-64 border-r-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800 hidden md:block p-4">
           <Skeleton className="h-10 w-32 mb-8" />
           <Skeleton className="h-10 w-full mb-2" />
           <Skeleton className="h-10 w-full mb-2" />
           <Skeleton className="h-10 w-full mb-2" />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center px-4">
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div className="flex-1 p-8">
            <Skeleton className="h-10 w-48 mb-8" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Events', path: '/events', icon: CalendarDays },
    { name: 'Data Manager', path: '/data/manager', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings }
  ];

  return (
    <div className="h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-900 flex print:bg-white print:block print:h-auto print:overflow-visible transition-colors duration-200">
      {/* Sidebar */}
      <aside 
        className={`bg-white dark:bg-neutral-950 border-r-2 border-neutral-900 dark:border-neutral-700 fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 print:hidden`}
      >
        <div className="flex-shrink-0 h-16 flex items-center px-6 border-b-2 border-neutral-900 dark:border-neutral-700">
          <div className="w-8 h-8 bg-primary-500 border-2 border-neutral-900 dark:border-white rounded-md flex items-center justify-center mr-3 shadow-brutal dark:shadow-brutal-dark">
            <span className="text-white font-black text-lg">M</span>
          </div>
          <span className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">Meetsy</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || 
              (link.path !== '/' && location.pathname.startsWith(link.path));
            
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center px-3 py-2.5 text-sm font-bold rounded-md transition-colors border-2 ${
                  isActive 
                    ? 'bg-primary-50 dark:bg-primary-900 border-neutral-900 dark:border-primary-500 text-neutral-900 dark:text-white shadow-brutal dark:shadow-brutal-dark' 
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-900 dark:hover:border-neutral-700 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 dark:text-neutral-500'}`} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout area at the bottom of sidebar */}
        <div className="flex-shrink-0 w-full p-4 border-t-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-950 relative">
          <div className="flex items-center justify-between px-3 py-2 text-sm">
            <div className="flex flex-col truncate pr-2">
              <span className="font-bold text-neutral-900 dark:text-white truncate">{admin?.email}</span>
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mt-0.5">Admin</span>
            </div>

            {/* Logout button with inline confirmation */}
            <div className="relative">
              {!showLogoutConfirm ? (
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/30 rounded-md transition-all duration-150 active:scale-95"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                /* Inline confirmation popover */
                <div className="absolute bottom-8 right-0 w-52 bg-white dark:bg-neutral-800 rounded-md border-2 border-neutral-900 dark:border-neutral-600 shadow-brutal dark:shadow-brutal-dark p-3 animate-in zoom-in-95 fade-in duration-150 origin-bottom-right z-50">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center shrink-0">
                      <LogOut className="w-3.5 h-3.5 text-danger-600 dark:text-danger-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">Sign out?</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 px-2.5 py-1.5 text-xs font-bold text-neutral-900 dark:text-white border-2 border-neutral-900 dark:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 active:translate-y-[2px] active:translate-x-[2px] rounded-md transition-transform"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { setShowLogoutConfirm(false); logout(); }}
                      className="flex-1 px-2.5 py-1.5 text-xs font-bold text-white bg-danger-500 border-2 border-neutral-900 hover:bg-danger-600 active:translate-y-[2px] active:translate-x-[2px] rounded-md transition-transform"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:block bg-neutral-50 dark:bg-neutral-900 transition-colors duration-200">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-neutral-950 border-b-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-between px-4 sm:px-6 z-30 flex-shrink-0 print:hidden transition-colors duration-200">
          <div className="flex items-center lg:hidden">
            <button 
              onClick={toggleSidebar}
              className="p-2 -ml-2 mr-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-neutral-900 dark:text-white">Meetsy</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto print:overflow-visible p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full animate-in fade-in duration-300">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Dismiss logout confirm if clicking outside sidebar */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowLogoutConfirm(false)}
        />
      )}

      {/* Global Toasts */}
      <ToastContainer />
    </div>
  );
}
