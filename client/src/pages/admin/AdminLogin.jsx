import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import useAppStore from '../../stores/useAppStore';
import ThemeToggle from '../../components/ui/ThemeToggle';
import { Mail, Lock } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useAppStore(state => state.addToast);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      addToast({
        type: 'success',
        title: 'Welcome back',
        message: 'Successfully logged in to Meetsy Admin.',
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-neutral-50 dark:bg-neutral-900 py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Theme Toggle - top right */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 bg-primary-500 border-2 border-neutral-900 dark:border-white rounded-md flex items-center justify-center shadow-brutal dark:shadow-brutal-dark">
              <span className="text-white font-black text-2xl">M</span>
            </div>
          </div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white text-center tracking-tight uppercase">
            Meetsy HQ
          </h2>
          <p className="mt-2 text-sm font-bold text-neutral-500 dark:text-neutral-400">
            Sign in to manage your events
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-neutral-800 py-8 px-4 shadow-brutal dark:shadow-brutal-dark sm:rounded-md border-2 border-neutral-900 dark:border-neutral-700 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="Email address"
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              placeholder="email"
            />

            <Input
              label="Password"
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              placeholder="••••••••"
              error={error}
            />

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              isLoading={isSubmitting}
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
