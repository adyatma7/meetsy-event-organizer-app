import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../lib/api';
import useAppStore from '../../stores/useAppStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function EventNew() {
  const navigate = useNavigate();
  const { id } = useParams();
  const addToast = useAppStore(state => state.addToast);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    date: '',
    timeStart: '',
    timeEnd: '',
    city: '',
    venue: '',
    capacity: '',
    staffPin: '',
    theme: '',
    status: 'DRAFT'
  });

  React.useEffect(() => {
    if (id) {
      api.get(`/admin/events/${id}`).then(res => {
        const d = res;
        setFormData({
          title: d.title || '',
          slug: d.slug || '',
          date: d.date ? d.date.split('T')[0] : '',
          timeStart: d.timeStart || '',
          timeEnd: d.timeEnd || '',
          city: d.city || '',
          venue: d.venue || '',
          capacity: d.capacity === 0 ? '0' : (d.capacity || ''),
          staffPin: '', 
          theme: d.theme || '',
          status: d.status || 'DRAFT'
        });
        setIsLoading(false);
      }).catch(err => {
        addToast({ type: 'error', title: 'Error', message: 'Failed to load event for editing' });
        navigate('/events');
      });
    }
  }, [id, navigate, addToast]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const payload = { ...formData };
      if (id && !payload.staffPin) {
        delete payload.staffPin;
      }
      
      if (id) {
        await api.put(`/admin/events/${id}`, payload);
        addToast({ type: 'success', title: 'Event Updated', message: 'Successfully updated the event.' });
        navigate(`/events/${id}`);
      } else {
        const res = await api.post('/admin/events', payload);
        addToast({ type: 'success', title: 'Event Created', message: 'Successfully created the new event.' });
        navigate(`/events/${res.id}`);
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/events')}
          className="p-2 -ml-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          aria-label="Back to events"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white uppercase">{id ? 'Edit Event' : 'Create New Event'}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {id ? 'Update the core details of this event.' : 'Set up the core details. You can configure the registration form later.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark rounded-md overflow-hidden">
        <div className="p-6 space-y-6 sm:p-8">
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input 
              id="title" label="Event Title" required 
              placeholder="e.g. Annual Tech Summit" 
              value={formData.title} onChange={handleChange} 
              className="sm:col-span-2"
            />
            
            <Input 
              id="slug" label="URL Slug (Optional)" 
              placeholder="annual-tech-summit" 
              helperText="Leave blank to auto-generate from title"
              value={formData.slug} onChange={handleChange} 
              className="sm:col-span-2"
            />
            
            <Input 
              id="date" label="Date" type="date" required 
              value={formData.date} onChange={handleChange} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                id="timeStart" label="Start Time" type="time" required 
                value={formData.timeStart} onChange={handleChange} 
              />
              <Input 
                id="timeEnd" label="End Time" type="time" required 
                value={formData.timeEnd} onChange={handleChange} 
              />
            </div>

            <Input 
              id="city" label="City" required 
              placeholder="e.g. Jakarta"
              value={formData.city} onChange={handleChange} 
            />
            
            <Input 
              id="venue" label="Venue" required 
              placeholder="e.g. Ritz Carlton"
              value={formData.venue} onChange={handleChange} 
            />

            <Input 
              id="capacity" label="Capacity" type="number" min="0" required 
              placeholder="e.g. 500 (use 0 for unlimited)"
              helperText="Set to 0 if there is no attendance limit"
              value={formData.capacity} onChange={handleChange} 
            />
            
            <Input 
              id="staffPin" label="Staff PIN" type="password" required={!id} 
              placeholder="6-digit pin for staff"
              helperText="Staff use this PIN to log into the scanner interface"
              minLength="6" maxLength="6" pattern="\d{6}"
              value={formData.staffPin} onChange={handleChange} 
            />

            {id && (
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-sm font-bold text-neutral-900 dark:text-white">Event Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full rounded-md border-2 border-neutral-900 dark:border-neutral-500 py-2.5 px-3 text-neutral-900 dark:text-white bg-white dark:bg-neutral-900 font-bold focus:border-primary-600 dark:focus:border-primary-500 sm:text-sm sm:leading-6"
                >
                  <option value="DRAFT">Draft (Not public)</option>
                  <option value="OPEN">Open (Accepting registrations)</option>
                  <option value="CLOSED">Closed (Registration ended)</option>
                  <option value="DONE">Done (Event finished)</option>
                </select>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Change to 'Open' to allow people to register through the public URL.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-t-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate('/events')} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} icon={Save} disabled={isLoading}>
            {id ? 'Save Changes' : 'Create Event'}
          </Button>
        </div>
      </form>
    </div>
  );
}
