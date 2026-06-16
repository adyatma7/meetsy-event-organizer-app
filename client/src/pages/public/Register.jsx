import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import api from '../../lib/api';
import Skeleton from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function Register() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchEvent();
  }, [slug]);

  const fetchEvent = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/public/events/${slug}`);
      setEvent(res);
      
      // Initialize form state
      const initial = {};
      if (res.formSchema) {
        res.formSchema.forEach(field => {
          initial[field.id] = '';
        });
      }
      setFormData(initial);
    } catch (err) {
      setError(err.message || 'Event not found or registration is closed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await api.post(`/public/events/${slug}/register`, formData);
      navigate(`/register/${slug}/done`, { state: { event, isWaitlisted: res.isWaitlisted } });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-800 p-8 rounded-md shadow-brutal dark:shadow-brutal-dark border-2 border-neutral-900 dark:border-neutral-700 w-full max-w-md">
          <Skeleton className="h-16 w-16 mx-auto mb-6 rounded-md" />
          <Skeleton className="h-8 w-3/4 mx-auto mb-4 rounded-md" />
          <Skeleton className="h-4 w-1/2 mx-auto rounded-md" />
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-800 p-8 rounded-md shadow-brutal dark:shadow-brutal-dark border-2 border-neutral-900 dark:border-neutral-700 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-danger-500 border-2 border-neutral-900 text-white rounded-md flex items-center justify-center mx-auto mb-6 shadow-brutal-sm">
            <span className="text-3xl font-black">!</span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Unavailable</h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-bold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Event Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 bg-primary-500 border-2 border-neutral-900 dark:border-neutral-500 rounded-md flex items-center justify-center shadow-brutal-sm dark:shadow-brutal-dark mb-6">
            <span className="text-white font-black text-3xl">Y</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white sm:text-4xl uppercase">
            {event.title}
          </h1>
          <p className="text-lg font-bold text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
            {event.description}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-4 text-neutral-900 dark:text-neutral-300 font-black">
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 px-4 py-2 border-2 border-neutral-900 dark:border-neutral-500 rounded-md shadow-brutal-sm dark:shadow-brutal-dark">
              <CalendarDays className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span>{new Date(event.date).toLocaleDateString()} • {event.timeStart}</span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 px-4 py-2 border-2 border-neutral-900 dark:border-neutral-500 rounded-md shadow-brutal-sm dark:shadow-brutal-dark">
              <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span>{event.venue}, {event.city}</span>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white dark:bg-neutral-800 py-8 px-4 shadow-brutal dark:shadow-brutal-dark sm:rounded-md border-2 border-neutral-900 dark:border-neutral-700 sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-4 bg-danger-50 text-danger-700 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            {event.formSchema && event.formSchema.map((field) => (
              <div key={field.id} className="space-y-1">
                {field.type === 'text' && (
                  <Input 
                    label={field.label}
                    required={field.required}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  />
                )}
                
                {field.type === 'email' && (
                  <Input 
                    type="email"
                    label={field.label}
                    required={field.required}
                    value={formData[field.id] || ''}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  />
                )}
                
                {field.type === 'select' && (
                  <div>
                    <label className="block text-sm font-black text-neutral-900 dark:text-white mb-2 uppercase tracking-wide">
                      {field.label} {field.required && '*'}
                    </label>
                    <select
                      required={field.required}
                      className="block w-full rounded-md border-2 border-neutral-900 dark:border-neutral-500 py-2.5 pl-3 pr-10 text-neutral-900 dark:text-white shadow-brutal-sm dark:shadow-brutal-dark focus:border-primary-500 focus:outline-none focus:-translate-y-[1px] focus:-translate-x-[1px] transition-transform sm:text-sm sm:leading-6 bg-white dark:bg-neutral-800 font-bold appearance-none cursor-pointer"
                      value={formData[field.id] || ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                    >
                      <option value="" disabled>Select an option</option>
                      {(field.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {field.type === 'radio' && (
                  <div>
                    <label className="block text-sm font-black text-neutral-900 dark:text-white mb-2 uppercase tracking-wide">
                      {field.label} {field.required && '*'}
                    </label>
                    <div className="space-y-3">
                      {(field.options || []).map(opt => (
                        <label key={opt} className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="radio" 
                            name={field.id}
                            required={field.required}
                            value={opt}
                            checked={formData[field.id] === opt}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className="w-5 h-5 text-primary-600 bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-500 focus:ring-0 focus:ring-offset-0 transition-transform hover:scale-110"
                          />
                          <span className="text-sm font-bold text-neutral-900 dark:text-white">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4">
              <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
                Submit Registration
              </Button>
            </div>
            
            <p className="text-center text-xs text-neutral-400 mt-4">
              Powered by Meetsy
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
