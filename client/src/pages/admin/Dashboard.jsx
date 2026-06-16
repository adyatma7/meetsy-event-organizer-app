import React, { useEffect, useState, useRef } from 'react';
import { CalendarDays, Users, CheckCircle, Percent, BarChart2, Plus, AlertTriangle, Trophy, ArrowRight, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Skeleton from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';

export default function Dashboard() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef(null);
  const [selectedEventId, setSelectedEventId] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // api.js intercepts and returns res.data directly, so res is our metrics object!
      const res = await api.get('/admin/dashboard/metrics');
      setMetrics(res);
    } catch (error) {
      console.error('Failed to load dashboard metrics', error);
    } finally {
      setIsLoading(false);
    }
  };

  const timeline = metrics?.performanceTimeline || [];

  const handleJumpToEvent = (e) => {
    const eventId = e.target.value;
    setSelectedEventId(eventId);
    if (!eventId || !scrollContainerRef.current) return;

    const eventIndex = timeline.findIndex(evt => evt.id === eventId);
    if (eventIndex !== -1) {
      // Approximate bar width + margins
      const itemWidth = 100; 
      const scrollPosition = (eventIndex * itemWidth) - (scrollContainerRef.current.clientWidth / 2) + (itemWidth / 2);
      
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  // Find interesting anomalies for the Action Center
  const topPerformer = [...timeline].filter(e => e.attended > 0).sort((a,b) => b.checkInRate - a.checkInRate)[0];
  const needsAttention = [...timeline].filter(e => e.status === 'CLOSED' && e.checkInRate < 50)[0] || 
                         [...timeline].filter(e => e.status === 'OPEN' && e.registrations < 5)[0];

  return (
    <div className="space-y-8 pb-20 transition-colors duration-200">
      
      {/* Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Global Dashboard</h1>
          <p className="mt-1 text-sm font-bold text-neutral-500 dark:text-neutral-400">
            Welcome back, {admin?.email}. Here is your strategic organization overview.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/admin/events/new')} icon={Plus} className="bg-primary-600 hover:bg-primary-700 text-white">
            Create Event
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
          <Skeleton className="h-24 w-full border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
          <Skeleton className="h-24 w-full border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
          <Skeleton className="h-24 w-full border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
        </div>
      ) : (
        <>
          {/* Top KPI Row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white dark:bg-neutral-800 p-5 shadow-brutal dark:shadow-brutal-dark rounded-md border-2 border-neutral-900 dark:border-neutral-700 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:-translate-x-1">
              <div className="p-3 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 border-2 border-neutral-900 dark:border-neutral-700 rounded-md shadow-brutal-sm dark:shadow-brutal-dark-hover"><CalendarDays className="w-6 h-6"/></div>
              <div>
                <p className="text-sm font-black text-neutral-500 dark:text-neutral-400">Active Events</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">{metrics?.activeEvents || 0} <span className="text-sm font-bold text-neutral-400 dark:text-neutral-500">/ {metrics?.totalEvents} total</span></p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-neutral-800 p-5 shadow-brutal dark:shadow-brutal-dark rounded-md border-2 border-neutral-900 dark:border-neutral-700 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:-translate-x-1">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border-2 border-neutral-900 dark:border-neutral-700 rounded-md shadow-brutal-sm dark:shadow-brutal-dark-hover"><Users className="w-6 h-6"/></div>
              <div>
                <p className="text-sm font-black text-neutral-500 dark:text-neutral-400">Total Registrations</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">{metrics?.totalRegistrations || 0}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 p-5 shadow-brutal dark:shadow-brutal-dark rounded-md border-2 border-neutral-900 dark:border-neutral-700 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:-translate-x-1">
              <div className="p-3 bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 border-2 border-neutral-900 dark:border-neutral-700 rounded-md shadow-brutal-sm dark:shadow-brutal-dark-hover"><CheckCircle className="w-6 h-6"/></div>
              <div>
                <p className="text-sm font-black text-neutral-500 dark:text-neutral-400">Pending Approvals</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">{metrics?.pendingApprovals || 0}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 p-5 shadow-brutal dark:shadow-brutal-dark rounded-md border-2 border-neutral-900 dark:border-neutral-700 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:-translate-x-1">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-2 border-neutral-900 dark:border-neutral-700 rounded-md shadow-brutal-sm dark:shadow-brutal-dark-hover"><Percent className="w-6 h-6"/></div>
              <div>
                <p className="text-sm font-black text-neutral-500 dark:text-neutral-400">Global Check-in Rate</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">{metrics?.globalCheckinRate || 0}%</p>
              </div>
            </div>
          </div>

          {/* YouTube Studio Style: Event-to-Event Performance Chart */}
          {timeline.length > 0 && (
            <div className="bg-white dark:bg-neutral-800 p-6 shadow-brutal dark:shadow-brutal-dark rounded-md border-2 border-neutral-900 dark:border-neutral-700">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                    <BarChart2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    Event-to-Event Performance
                  </h2>
                  <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mt-1">
                    Chronological comparison of all {timeline.length} events in your history.
                  </p>
                </div>
                {timeline.length > 0 && (
                  <select
                    value={selectedEventId}
                    onChange={handleJumpToEvent}
                    className="max-w-xs px-3 py-2 text-sm font-bold border-2 border-neutral-900 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 focus:outline-none focus:ring-0 shadow-brutal-sm dark:shadow-brutal-dark cursor-pointer text-neutral-900 dark:text-white"
                  >
                    <option value="">Jump to event...</option>
                    {timeline.map(evt => (
                      <option key={evt.id} value={evt.id}>{evt.name}</option>
                    ))}
                  </select>
                )}
              </div>
              
              <div 
                ref={scrollContainerRef}
                className="h-96 overflow-x-auto overflow-y-hidden rounded-md custom-scrollbar mt-4"
              >
                <div style={{ width: `${Math.max(100, timeline.length * 5)}%`, minWidth: `${timeline.length * 80}px`, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timeline} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#525252" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      tick={{fontSize: 12, fontWeight: 'bold'}} 
                      interval={0} 
                      angle={-35} 
                      textAnchor="end" 
                      height={80}
                      stroke="#888"
                    />
                    <YAxis 
                      yAxisId="left" 
                      tick={{fontSize: 12, fontWeight: 'bold'}} 
                      stroke="#888" 
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{fontSize: 12, fontWeight: 'bold'}} 
                      stroke="#10b981" 
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6', opacity: 0.1}} 
                      contentStyle={{ borderRadius: '0px', border: '2px solid black', boxShadow: '4px 4px 0px black', fontWeight: 'bold', backgroundColor: '#fff', color: '#000' }} 
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontWeight: 'bold' }}/>
                    
                    <Bar yAxisId="left" dataKey="registrations" name="Total Registered" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                    <Bar yAxisId="left" dataKey="attended" name="Total Attended" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="checkInRate" name="Check-in Rate (%)" stroke="#10b981" strokeWidth={4} dot={{ r: 6, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                  </ComposedChart>
                </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Strategic Action Center */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
            
            {/* Hall of Fame */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-md border-2 border-emerald-500 shadow-brutal dark:shadow-brutal-dark mb-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500 text-white rounded-md border-2 border-neutral-900 shadow-brutal-sm"><Trophy className="w-5 h-5"/></div>
                <h3 className="text-lg font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Hall of Fame</h3>
              </div>
              
              {topPerformer ? (
                <div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-500 mb-2">Highest Check-in Conversion Rate</p>
                  <p className="text-xl font-black text-neutral-900 dark:text-white mb-4">{topPerformer.fullTitle || topPerformer.name}</p>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{topPerformer.checkInRate}%</span>
                    <span className="text-sm font-bold text-neutral-500">converted</span>
                  </div>
                  <Link to={`/reports/${topPerformer.id}`} className="inline-flex items-center gap-2 text-sm font-black text-neutral-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    View Post-Mortem Report <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <p className="text-sm font-bold text-neutral-500">Run an event and track attendance to see your top performers here!</p>
              )}
            </div>

            {/* Needs Attention */}
            <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-md border-2 border-rose-500 shadow-brutal dark:shadow-brutal-dark mb-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-500 text-white rounded-md border-2 border-neutral-900 shadow-brutal-sm"><AlertTriangle className="w-5 h-5"/></div>
                <h3 className="text-lg font-black text-rose-800 dark:text-rose-400 uppercase tracking-wide">Needs Attention</h3>
              </div>
              
              {needsAttention ? (
                <div>
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-500 mb-2">
                    {needsAttention.status === 'OPEN' ? 'Struggling to get registrations' : 'Unusually high drop-off rate'}
                  </p>
                  <p className="text-xl font-black text-neutral-900 dark:text-white mb-4">{needsAttention.fullTitle || needsAttention.name}</p>
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="bg-white dark:bg-neutral-800 px-3 py-2 border-2 border-neutral-900 rounded-md shadow-brutal-sm">
                      <span className="text-sm font-black text-neutral-500 block">Registered</span>
                      <span className="text-xl font-black text-neutral-900 dark:text-white">{needsAttention.registrations}</span>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 px-3 py-2 border-2 border-neutral-900 rounded-md shadow-brutal-sm">
                      <span className="text-sm font-black text-neutral-500 block">{needsAttention.status === 'OPEN' ? 'Capacity' : 'Attended'}</span>
                      <span className="text-xl font-black text-neutral-900 dark:text-white">{needsAttention.status === 'OPEN' ? (needsAttention.capacity || '∞') : needsAttention.attended}</span>
                    </div>
                  </div>
                  <Link to={`/reports/${needsAttention.id}`} className="inline-flex items-center gap-2 text-sm font-black text-neutral-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                    Analyze Drop-off <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <p className="text-sm font-bold text-neutral-500">All your events are performing optimally! Great job.</p>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
