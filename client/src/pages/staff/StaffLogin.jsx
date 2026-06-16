import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function StaffLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { admin } = useAuth();
  
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleKeyPress = (num) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    if (!pin) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.post('/staff/login', { slug, pin });
      
      // Save token
      sessionStorage.setItem('staffToken', res.token);
      
      // Navigate to scanner
      navigate(`/staff/${slug}/scan`);
    } catch (err) {
      setError(err.message || 'Invalid PIN');
      setPin(''); // Reset on failure
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminBypass = () => {
    // Copy admin token to staffToken so scanner/onsite guards pass
    const adminToken = sessionStorage.getItem('token');
    if (adminToken) {
      sessionStorage.setItem('staffToken', adminToken);
    }
    navigate(`/staff/${slug}/scan`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950 relative overflow-hidden transition-colors duration-200">
      <div className="fixed top-4 right-4 z-20"><ThemeToggle /></div>
      
      <div className="w-full max-w-sm space-y-10 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-primary-500 border-2 border-neutral-900 shadow-brutal-dark mb-2">
            <span className="text-white font-black text-3xl">M</span>
          </div>
          <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight uppercase">Staff Portal</h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-bold tracking-wide uppercase text-sm">Enter your 6-digit PIN</p>
        </div>

        <div className="space-y-8">
          {/* PIN Display */}
          <div className="flex justify-center gap-3">
            {[...Array(6)].map((_, i) => {
              const isActive = pin.length === i;
              const isFilled = pin.length > i;
              return (
                <div 
                  key={i} 
                  className={`w-12 h-14 rounded-md flex items-center justify-center text-3xl font-black transition-all duration-300 border-2
                    ${isFilled 
                      ? 'bg-primary-500 text-white border-neutral-900 shadow-brutal dark:shadow-brutal-dark' 
                      : isActive 
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border-primary-500 shadow-brutal-hover dark:shadow-brutal-dark-hover' 
                        : 'bg-white dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600 border-neutral-200 dark:border-neutral-700'}
                    ${error ? 'bg-danger-500 text-white border-neutral-900 shadow-brutal dark:shadow-brutal-dark' : ''}
                  `}
                >
                  {isFilled ? '•' : ''}
                </div>
              );
            })}
          </div>

          {error && <p className="text-danger-500 text-center font-medium text-sm">{error}</p>}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-4 px-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                className="h-16 rounded-md bg-white dark:bg-neutral-800 border-2 border-neutral-900 shadow-brutal dark:shadow-brutal-dark hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover active:translate-y-0 active:translate-x-0 active:shadow-none text-2xl font-black text-neutral-900 dark:text-white transition-all"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleDelete}
              className="h-16 rounded-md bg-neutral-200 dark:bg-neutral-700 border-2 border-neutral-900 shadow-brutal dark:shadow-brutal-dark hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover active:translate-y-0 active:translate-x-0 active:shadow-none text-sm font-black text-neutral-900 dark:text-white transition-all"
            >
              DEL
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-16 rounded-md bg-white dark:bg-neutral-800 border-2 border-neutral-900 shadow-brutal dark:shadow-brutal-dark hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover active:translate-y-0 active:translate-x-0 active:shadow-none text-2xl font-black text-neutral-900 dark:text-white transition-all"
            >
              0
            </button>
            <button
              onClick={handleLogin}
              disabled={isLoading || pin.length < 6}
              className="h-16 rounded-md bg-primary-500 border-2 border-neutral-900 shadow-brutal dark:shadow-brutal-dark hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover active:translate-y-0 active:translate-x-0 active:shadow-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:translate-x-0 disabled:shadow-brutal dark:disabled:shadow-brutal-dark disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-500 text-lg font-black text-white transition-all"
            >
              {isLoading ? '...' : 'OK'}
            </button>
          </div>
          
          {admin && (
            <button
              onClick={handleAdminBypass}
              className="mt-6 w-full h-14 rounded-md border-2 border-neutral-900 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-black shadow-brutal dark:shadow-brutal-dark hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutal-hover dark:hover:shadow-brutal-dark-hover active:translate-y-0 active:translate-x-0 active:shadow-none transition-all uppercase tracking-wide"
            >
              Bypass Login (Admin)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
