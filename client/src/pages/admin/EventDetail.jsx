import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Settings, Users, CheckSquare, BarChart2, FormInput, FileText, Mail, CheckCircle, Eye, EyeOff, QrCode } from 'lucide-react';
import api from '../../lib/api';
import useAppStore from '../../stores/useAppStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useAppStore(state => state.addToast);
  
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/admin/events/${id}`);
      setEvent(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load event' });
      navigate('/events');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const quickLinks = [
    { name: 'Form Builder', path: `/events/${id}/form`, icon: FormInput, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Email Templates', path: `/events/${id}/emails`, icon: Mail, color: 'text-pink-600', bg: 'bg-pink-50' },
    { name: 'Invitations', path: `/events/${id}/invite`, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Approvals', path: `/events/${id}/approve`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Reports', path: `/reports/${id}`, icon: BarChart2, color: 'text-rose-600', bg: 'bg-rose-50' },
    { name: 'Staff Scanner', path: `/staff/${event.slug}`, icon: QrCode, color: 'text-violet-600', bg: 'bg-violet-50' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/events')}
            className="p-2 border-2 border-neutral-900 dark:border-white bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-md shadow-brutal hover:shadow-brutal-hover dark:shadow-brutal-dark dark:hover:shadow-brutal-dark-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{event.title}</h1>
              <Badge variant={event.status === 'OPEN' ? 'success' : 'neutral'}>{event.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {new Date(event.date).toLocaleDateString()} • {event.timeStart} to {event.timeEnd} • {event.city}
            </p>
          </div>
        </div>
        <Button variant="secondary" icon={Edit} onClick={() => navigate(`/events/${id}/edit`)}>Edit Details</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link 
                  key={link.name} 
                  to={link.path}
                  className="flex items-center p-4 bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md hover:-translate-y-[2px] hover:-translate-x-[2px] hover:shadow-brutal dark:hover:shadow-brutal-dark active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all group"
                >
                  <div className={`p-3 rounded-md ${link.bg} dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 mr-4 shadow-brutal-sm dark:shadow-brutal-dark group-hover:-translate-y-[1px] transition-transform`}>
                    <Icon className={`w-6 h-6 ${link.color}`} />
                  </div>
                  <div>
                    <h3 className="font-black text-neutral-900 dark:text-white leading-tight">{link.name}</h3>
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-0.5">Manage</p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark">
            <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-4">Event Links</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Public Registration URL</label>
                <div className="mt-2 flex rounded-md shadow-brutal-sm dark:shadow-brutal-dark">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/register/${event.slug}`}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md text-sm border-y-2 border-l-2 border-r-0 border-neutral-900 dark:border-neutral-500 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-0 focus:outline-none font-mono"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register/${event.slug}`);
                      addToast({ type: 'success', title: 'Copied', message: 'URL copied to clipboard' });
                    }}
                    className="inline-flex items-center px-4 py-2 border-2 border-neutral-900 dark:border-neutral-500 rounded-r-md bg-white dark:bg-neutral-800 text-sm font-black text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark">
            <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-4">Registration Stats</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-neutral-500 dark:text-neutral-400">Capacity Filled</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {event._count?.registrations || 0} / {event.capacity === 0 ? 'Unlimited' : event.capacity}
                  </span>
                </div>
                {event.capacity > 0 && (
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-md border-2 border-neutral-900 dark:border-neutral-500 h-4 mt-2 overflow-hidden">
                    <div 
                      className="bg-primary-500 h-full border-r-2 border-neutral-900 dark:border-neutral-500" 
                      style={{ width: `${Math.min(((event._count?.registrations || 0) / event.capacity) * 100, 100)}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark">
            <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-4">Configuration</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400 font-bold">Venue</dt>
                <dd className="font-black text-neutral-900 dark:text-white">{event.venue}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400 font-bold">Questions in Form</dt>
                <dd className="font-black text-neutral-900 dark:text-white">{event.formSchema?.length || 0}</dd>
              </div>
              <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-neutral-900 dark:border-neutral-700">
                <dt className="text-neutral-500 dark:text-neutral-400 font-bold flex items-center"><Settings className="w-4 h-4 mr-1.5"/> Staff PIN</dt>
                <dd className="font-mono text-xs bg-neutral-100 dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-500 px-2 py-1 rounded-md text-neutral-900 dark:text-white flex items-center gap-2 font-bold shadow-brutal-sm">
                  {showPin ? (event.staffPinRaw || 'Encrypted') : '••••••'}
                  <button onClick={() => setShowPin(!showPin)} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white" title="Toggle PIN visibility">
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
