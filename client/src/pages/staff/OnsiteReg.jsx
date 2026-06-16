import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw, User, Briefcase, Mail } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

export default function OnsiteReg() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { admin, loading } = useAuth();

  const [formData, setFormData] = useState({ name: '', email: '', company: '', jobTitle: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'error', data: {}, message: '' }
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (loading) return;
    const token = sessionStorage.getItem('staffToken');
    const adminToken = sessionStorage.getItem('token');
    if (!token && !admin && !adminToken) {
      navigate(`/staff/${slug}`);
    } else {
      fetchStats();
    }
  }, [slug, navigate, admin, loading]);

  const fetchStats = async () => {
    try {
      const tokenToUse = sessionStorage.getItem('staffToken') || sessionStorage.getItem('token');
      const res = await api.get(`/staff/stats/${slug}`, {
        headers: { 'Authorization': `Bearer ${tokenToUse}` }
      });
      setStats({ capacity: res.capacity, checkedIn: res.checkedIn });
    } catch (e) {
      console.log('Failed to fetch stats');
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      const tokenToUse = sessionStorage.getItem('staffToken') || sessionStorage.getItem('token');
      
      const res = await api.post('/staff/onsite', { ...formData, slug }, {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`
        }
      });
      
      setResult({
        type: 'success',
        data: res.data,
        message: res.message
      });
      
      fetchStats();
      
      // Play success beep
      const audio = new Audio('/success-beep.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));

    } catch (err) {
      setResult({
        type: 'error',
        message: err.message || 'Registration failed'
      });
      
      // Play error beep
      const audio = new Audio('/error-beep.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', company: '', jobTitle: '' });
    setResult(null);
  };

  const isFull = stats && stats.capacity > 0 && stats.checkedIn >= stats.capacity;

  return (
    <div className="flex-1 flex flex-col relative bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200 pt-4 px-4 pb-24 sm:px-8 sm:py-8 overflow-y-auto">
      
      {!result ? (
        <div className="w-full max-w-md mx-auto mt-4 sm:mt-6 bg-white dark:bg-neutral-800 border-4 border-neutral-900 dark:border-neutral-700 p-6 sm:p-8 rounded-md shadow-brutal dark:shadow-brutal-dark">
          <div className="mb-6 flex flex-col items-center sm:items-start text-center sm:text-left">
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight uppercase">Walk-in Registration</h1>
            
            {stats && stats.capacity > 0 && (
              <div className={`mt-3 px-3 py-1.5 rounded-md inline-flex items-center gap-2 text-sm font-black tracking-wide border-2 ${isFull ? 'bg-danger-500 text-white border-neutral-900 shadow-brutal-sm' : 'bg-primary-500 text-white border-neutral-900 shadow-brutal-sm'}`}>
                <span>{stats.checkedIn} / {stats.capacity} Checked In</span>
                {isFull && <span className="bg-neutral-900 text-white text-[10px] uppercase px-1.5 py-0.5 rounded-md">Full</span>}
              </div>
            )}
            
            <p className="text-neutral-600 dark:text-neutral-400 font-bold mt-2 text-sm">Fast-track check-in for attendees without a ticket.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider ml-1">Full Name *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-neutral-500" />
                </div>
                <input 
                  type="text" name="name" required value={formData.name} onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 focus:border-primary-500 rounded-md text-neutral-900 dark:text-white font-bold placeholder-neutral-400 dark:placeholder-neutral-600 shadow-brutal-sm focus:shadow-brutal-hover focus:-translate-y-[1px] focus:-translate-x-[1px] focus:outline-none transition-transform"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider ml-1">Email Address *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-neutral-500" />
                </div>
                <input 
                  type="email" name="email" required value={formData.email} onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 focus:border-primary-500 rounded-md text-neutral-900 dark:text-white font-bold placeholder-neutral-400 dark:placeholder-neutral-600 shadow-brutal-sm focus:shadow-brutal-hover focus:-translate-y-[1px] focus:-translate-x-[1px] focus:outline-none transition-transform"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider ml-1">Company (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase className="w-5 h-5 text-neutral-500" />
                </div>
                <input 
                  type="text" name="company" value={formData.company} onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 focus:border-primary-500 rounded-md text-neutral-900 dark:text-white font-bold placeholder-neutral-400 dark:placeholder-neutral-600 shadow-brutal-sm focus:shadow-brutal-hover focus:-translate-y-[1px] focus:-translate-x-[1px] focus:outline-none transition-transform"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider ml-1">Job Title (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-neutral-500" />
                </div>
                <input 
                  type="text" name="jobTitle" value={formData.jobTitle} onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 focus:border-primary-500 rounded-md text-neutral-900 dark:text-white font-bold placeholder-neutral-400 dark:placeholder-neutral-600 shadow-brutal-sm focus:shadow-brutal-hover focus:-translate-y-[1px] focus:-translate-x-[1px] focus:outline-none transition-transform"
                  placeholder="CEO"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full h-14 mt-4 bg-primary-500 border-2 border-neutral-900 text-white font-black rounded-md shadow-brutal hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutal-hover active:translate-y-0 active:translate-x-0 active:shadow-none transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:translate-x-0 disabled:shadow-brutal flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin text-white" /> : 'Check In Attendee'}
            </button>
          </form>
        </div>
      ) : (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center p-6 transition-all duration-300 ${
          result.type === 'success' ? 'bg-success-400' : 'bg-danger-500'
        }`}>
          <div className="bg-white dark:bg-neutral-800 p-5 rounded-md mb-6 border-4 border-neutral-900 shadow-brutal-dark animate-in zoom-in duration-300">
            {result.type === 'success' ? (
              <CheckCircle className="w-24 h-24 text-success-500" />
            ) : (
              <XCircle className="w-24 h-24 text-danger-600" />
            )}
          </div>

          <h2 className="text-4xl font-black text-neutral-900 text-center mb-2 tracking-tight uppercase border-black text-shadow-sm">
            {result.type === 'success' ? 'Checked In!' : 'Error'}
          </h2>
          
          <p className="text-neutral-900 text-lg text-center font-black uppercase max-w-sm mb-6">
            {result.message}
          </p>

          {result.type === 'success' && result.data && (
            <div className="bg-white dark:bg-neutral-800 border-4 border-neutral-900 p-8 rounded-md w-full max-w-sm shadow-brutal-dark mb-10 text-center relative overflow-hidden">
              <p className="text-neutral-900 dark:text-white font-black text-3xl relative z-10">{result.data.name}</p>
              {result.data.company && (
                <p className="text-neutral-700 text-lg mt-2 font-bold relative z-10">{result.data.company}</p>
              )}
            </div>
          )}

          <button 
            onClick={handleReset}
            className="flex items-center justify-center gap-3 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border-4 border-neutral-900 shadow-brutal-dark w-full max-w-sm h-16 rounded-md font-black text-xl hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutal-dark-hover active:translate-y-0 active:translate-x-0 active:shadow-none transition-all uppercase tracking-wider"
          >
            <RefreshCw className="w-6 h-6" />
            Register Another
          </button>
        </div>
      )}
    </div>
  );
}
