import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Users, CheckCircle, Clock, Percent, Sparkles, Loader2, Bot, Filter, X, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import api from '../../lib/api';
import useAppStore from '../../stores/useAppStore';
import { Button } from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';

const PrintableChart = ({ children, height = 256, printWidth = 500 }) => (
  <>
    <div className="print:hidden w-full h-full">
      <ResponsiveContainer width="99%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
    <div className="hidden print:flex print:justify-center print:items-center print:w-full overflow-hidden" style={{ height: `${height}px` }}>
      {React.cloneElement(children, { width: printWidth, height })}
    </div>
  </>
);

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useAppStore(state => state.addToast);

  const [event, setEvent] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState('all'); // 'all' | 'attended'

  // AI Strategist State
  const [aiProvider, setAiProvider] = useState('phi4');
  const [insights, setInsights] = useState([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Drill-down Modal State
  const [selectedSegment, setSelectedSegment] = useState(null); // { title: string, participants: [] }

  useEffect(() => {
    fetchData();
  }, [id, filterType]); // Refetch when filter changes

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [eventRes, metricsRes] = await Promise.all([
        api.get(`/admin/events/${id}`),
        api.get(`/admin/events/${id}/reports/metrics?filter=${filterType}`)
      ]);
      setEvent(eventRes.data);
      setMetrics(metricsRes);
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Error', message: 'Failed to load report data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      const res = await api.get(`/admin/events/${id}/reports/export`);
      
      const csv = Papa.unparse(res);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `${event?.slug || 'event'}-full-report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      addToast({ type: 'error', title: 'Export failed', message: 'Could not export data.' });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = () => {
    // We rely on native browser print for high-quality vector output,
    // perfect CSS page-breaks (break-inside-avoid), and automatically hiding the sidebar.
    window.print();
  };

  const handleGenerateInsights = async () => {
    try {
      setIsGeneratingInsights(true);
      const res = await api.post(`/admin/events/${id}/reports/insights`, { provider: aiProvider });
      setInsights(res.insights || []);
    } catch (err) {
      addToast({ type: 'error', title: 'AI Error', message: 'Failed to generate insights.' });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleChartClick = (data, titlePrefix) => {
    if (data && data.participants) {
      setSelectedSegment({
        title: `${titlePrefix}: ${data.name || data.text}`,
        participants: data.participants
      });
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark">
          <Skeleton className="h-12 w-64 border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
          <Skeleton className="h-10 w-48 border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
          <Skeleton className="h-24 w-full border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
          <Skeleton className="h-24 w-full border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
          <Skeleton className="h-24 w-full border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
        </div>
        <Skeleton className="h-[400px] w-full border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark" />
      </div>
    );
  }

  const COLORS = ['#f59e0b', '#10b981', '#ef4444']; // Amber (Pending), Emerald (Approved), Red (Rejected)

  return (
    <div className="space-y-6 pb-20 print:pb-0 transition-colors duration-200">
      {/* Action Header - Excluded from PDF */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark print:hidden transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/events/${id}`)}
            className="p-2 border-2 border-neutral-900 dark:border-white bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-md shadow-brutal hover:shadow-brutal-hover dark:shadow-brutal-dark dark:hover:shadow-brutal-dark-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Analytics Report</h1>
            <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">{event?.title}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter Toggle */}
          <div className="flex items-center bg-white dark:bg-neutral-800 rounded-md p-1 border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal-sm dark:shadow-brutal-dark">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-sm font-black rounded-md transition-all border-2 ${filterType === 'all' ? 'bg-primary-500 text-white border-neutral-900 dark:border-white shadow-brutal-hover dark:shadow-brutal-dark-hover translate-x-[1px] translate-y-[1px]' : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:text-neutral-900 dark:hover:text-white'}`}
            >
              All Registrants
            </button>
            <button
              onClick={() => setFilterType('attended')}
              className={`px-3 py-1.5 text-sm font-black rounded-md transition-all border-2 ${filterType === 'attended' ? 'bg-primary-500 text-white border-neutral-900 dark:border-white shadow-brutal-hover dark:shadow-brutal-dark-hover translate-x-[1px] translate-y-[1px]' : 'bg-transparent text-neutral-600 dark:text-neutral-400 border-transparent hover:text-neutral-900 dark:hover:text-white'}`}
            >
              Attended Only
            </button>
          </div>

          <Button 
            variant="secondary" 
            icon={FileText} 
            onClick={handleExportPdf}
            isLoading={isExportingPdf}
          >
            Export PDF
          </Button>

          <Button 
            variant="primary" 
            icon={Download} 
            onClick={handleExportCsv}
            isLoading={isExportingCsv}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* --- START OF PDF EXPORT CONTAINER --- */}
      <div id="report-container" className="space-y-6 print:space-y-8">
        
        {/* PDF-Only Professional Cover Header */}
        <div className="hidden print:block mb-8 pb-6 border-b-2 border-neutral-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Meetsy Analytics Report</h1>
              <h2 className="text-xl font-medium text-primary-600 mt-2">{event?.title}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">Generated On</p>
              <p className="text-md font-bold text-neutral-900">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-sm font-medium text-neutral-400 mt-1">Data Scope: {filterType === 'all' ? 'All Registrants' : 'Attended Only'}</p>
            </div>
          </div>
        </div>

      {/* AI Strategist / Executive Summary Panel */}
      <div className="bg-primary-50 dark:bg-primary-900 p-6 rounded-md border-2 border-neutral-900 dark:border-primary-500 shadow-brutal dark:shadow-brutal-dark print:break-inside-avoid transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Executive Summary (AI Generated)
            </h2>
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mt-1">
              {event?.status === 'CLOSED' 
                ? "Generate a post-mortem analysis with actionable takeaways for your next event."
                : "Analyze current registration velocity and demographics to boost attendance."}
            </p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <div className="relative">
              <Bot className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="!pl-9 pr-8 py-2 text-sm font-bold border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-0 shadow-brutal-sm dark:shadow-brutal-dark cursor-pointer appearance-none"
              >
                <option value="phi4">Phi-4 Mini (Local)</option>
                <option value="gemini">Gemini Pro (Cloud)</option>
                <option value="openai">OpenAI (Cloud)</option>
              </select>
            </div>
            <Button onClick={handleGenerateInsights} isLoading={isGeneratingInsights} icon={Sparkles}>
              {insights.length > 0 ? "Regenerate" : "Generate Strategy"}
            </Button>
          </div>
        </div>

        {insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-white dark:bg-neutral-800 p-4 rounded-md shadow-brutal-sm dark:shadow-brutal-dark border-2 border-neutral-900 dark:border-neutral-600 print:break-inside-avoid">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-black shadow-brutal-sm">{idx + 1}</span>
                  <h3 className="font-black text-neutral-900 dark:text-white leading-tight">{insight.title}</h3>
                </div>
                <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400 leading-relaxed">{insight.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hero & Secondary Metrics Layout (Always shows overall regardless of filter) */}
      <div className="flex flex-col lg:flex-row gap-6 print:flex-row">
        {/* Hero Metrics */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
           {/* Total Registered - Hero Size */}
           <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark flex flex-col justify-center transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
             <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white border-2 border-neutral-900 dark:border-neutral-500 rounded-md shadow-brutal-sm dark:shadow-brutal-dark"><Users className="w-5 h-5"/></div>
               <p className="font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-widest text-xs">Total Registered</p>
             </div>
             <p className="text-6xl font-black text-neutral-900 dark:text-white">{metrics.totals.all}</p>
           </div>
           
           {/* Check-in Rate - Hero Size */}
           <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark flex flex-col justify-center transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
             <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 border-2 border-neutral-900 dark:border-emerald-700 rounded-md shadow-brutal-sm dark:shadow-brutal-dark"><Percent className="w-5 h-5"/></div>
               <p className="font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-widest text-xs">Check-in Rate</p>
             </div>
             <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
               <p className="text-5xl lg:text-6xl font-black text-neutral-900 dark:text-white leading-none">{metrics.conversionRate}%</p>
               <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 pb-1 border-b-2 border-neutral-200 dark:border-neutral-700">({metrics.totals.attended} attended)</p>
             </div>
           </div>
        </div>

        {/* Secondary Metrics */}
        <div className="lg:w-1/3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
           {/* Approved */}
           <div className="bg-white dark:bg-neutral-800 p-5 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark flex items-center justify-between transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
             <div>
               <p className="text-sm font-black text-neutral-500 dark:text-neutral-400">Approved</p>
               <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1">{metrics.totals.approved}</p>
             </div>
             <div className="p-3 bg-neutral-50 dark:bg-neutral-700 text-neutral-400 border-2 border-neutral-200 dark:border-neutral-600 rounded-md"><CheckCircle className="w-6 h-6"/></div>
           </div>
           {/* Pending */}
           <div className="bg-white dark:bg-neutral-800 p-5 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark flex items-center justify-between transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
             <div>
               <p className="text-sm font-black text-neutral-500 dark:text-neutral-400">Pending</p>
               <p className="text-3xl font-black text-neutral-900 dark:text-white mt-1">{metrics.totals.pending}</p>
             </div>
             <div className="p-3 bg-warning-50 dark:bg-warning-900/30 text-warning-500 border-2 border-warning-200 dark:border-warning-800 rounded-md"><Clock className="w-6 h-6"/></div>
           </div>
        </div>
      </div>

      {/* Registration Timeline Area Chart */}
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark print:break-inside-avoid transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
        <h2 className="text-xl font-black text-neutral-900 dark:text-white mb-6 uppercase tracking-wide">Registration Velocity</h2>
        <div className="h-72">
          <PrintableChart height={288} printWidth={700}>
            <AreaChart data={metrics.charts.registrationTimeline} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d4d4d8" />
              <XAxis dataKey="date" tick={{fontSize: 12, fontWeight: 'bold'}} stroke="#000" tickMargin={10} />
              <YAxis tick={{fontSize: 12, fontWeight: 'bold'}} stroke="#000" tickMargin={10} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '0px', border: '2px solid #000', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', backgroundColor: '#fff', fontWeight: 'bold', color: '#000' }} 
                cursor={{ stroke: '#000', strokeWidth: 2, strokeDasharray: '4 4' }} 
              />
              <Area 
                isAnimationActive={false}
                type="monotone" 
                dataKey="count" 
                stroke="#e11d48" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorCount)"
                activeDot={{ r: 8, strokeWidth: 2, stroke: '#000' }}
              />
            </AreaChart>
          </PrintableChart>
        </div>
        <p className="text-xs font-bold text-neutral-400 mt-4 text-center print:hidden">Click on a data point to view participants.</p>
      </div>

      {/* Demographics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark print:break-inside-avoid transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
          <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-6 uppercase tracking-wide">Registration Status</h2>
          <div className="h-64">
            <PrintableChart height={256} printWidth={350}>
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={metrics.charts.statusData.map(d => ({
                    ...d,
                    fill: { 'Pending': '#f59e0b', 'Approved': '#10b981', 'Rejected': '#ef4444' }[d.name] || '#000'
                  }))}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="#000"
                  strokeWidth={2}
                />
                <Tooltip contentStyle={{ borderRadius: '0px', border: '2px solid #000', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', backgroundColor: '#fff', fontWeight: 'bold', color: '#000' }} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontWeight: 'bold' }}/>
              </PieChart>
            </PrintableChart>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark print:break-inside-avoid transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
          <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-6 uppercase tracking-wide">Top Industries</h2>
          <div className="h-64">
            <PrintableChart height={256} printWidth={350}>
              <BarChart data={metrics.charts.topIndustries} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d4d4d8" />
                <XAxis type="number" tick={{fontSize: 12, fontWeight: 'bold'}} stroke="#000" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fontWeight: 'bold'}} stroke="#000" />
                <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{ borderRadius: '0px', border: '2px solid #000', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', backgroundColor: '#fff', fontWeight: 'bold', color: '#000' }} />
                <Bar 
                  isAnimationActive={false}
                  dataKey="count" 
                  fill="#8b5cf6" 
                  stroke="#000"
                  strokeWidth={2}
                  radius={[0, 4, 4, 0]} 
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(data) => handleChartClick(data, 'Industry')}
                />
              </BarChart>
            </PrintableChart>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark print:break-inside-avoid transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
          <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-6 uppercase tracking-wide">Top Locations</h2>
          <div className="h-64">
            <PrintableChart height={256} printWidth={350}>
              <BarChart data={metrics.charts.topCities} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d4d4d8" />
                <XAxis type="number" tick={{fontSize: 12, fontWeight: 'bold'}} stroke="#000" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fontWeight: 'bold'}} stroke="#000" />
                <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{ borderRadius: '0px', border: '2px solid #000', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', backgroundColor: '#fff', fontWeight: 'bold', color: '#000' }} />
                <Bar 
                  isAnimationActive={false}
                  dataKey="count" 
                  fill="#0ea5e9" 
                  stroke="#000"
                  strokeWidth={2}
                  radius={[0, 4, 4, 0]} 
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(data) => handleChartClick(data, 'Location')}
                />
              </BarChart>
            </PrintableChart>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark print:break-inside-avoid transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
          <h2 className="text-lg font-black text-neutral-900 dark:text-white mb-6 uppercase tracking-wide">Top Job Titles</h2>
          <div className="h-64">
            <PrintableChart height={256} printWidth={350}>
              <BarChart data={metrics.charts.topJobTitles} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d4d4d8" />
                <XAxis type="number" tick={{fontSize: 12, fontWeight: 'bold'}} stroke="#000" />
                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12, fontWeight: 'bold'}} stroke="#000" />
                <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{ borderRadius: '0px', border: '2px solid #000', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)', backgroundColor: '#fff', fontWeight: 'bold', color: '#000' }} />
                <Bar 
                  isAnimationActive={false}
                  dataKey="count" 
                  fill="#10b981" 
                  stroke="#000"
                  strokeWidth={2}
                  radius={[0, 4, 4, 0]} 
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(data) => handleChartClick(data, 'Job Title')}
                />
              </BarChart>
            </PrintableChart>
          </div>
        </div>
      </div>

      {/* Custom Survey Analytics */}
      {metrics.charts.customSurveys && metrics.charts.customSurveys.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-black text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
            <Filter className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            Custom Survey Analytics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-6">
            {metrics.charts.customSurveys.map((survey, idx) => (
              <div key={idx} className="bg-white dark:bg-neutral-800 p-6 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark print:break-inside-avoid transition-transform hover:-translate-y-[2px] hover:-translate-x-[2px]">
                <h3 className="text-md font-black text-neutral-900 dark:text-white mb-6">{survey.label}</h3>
                <div className="h-64 flex items-center justify-center">
                  {survey.type === 'text' || survey.type === 'textarea' ? (
                    survey.data && survey.data.length > 0 ? (
                      <div className="flex flex-wrap items-center justify-center gap-3 p-4 w-full h-full overflow-y-auto content-center">
                        {(() => {
                          const maxVal = Math.max(...survey.data.map(w => w.value));
                          const minVal = Math.min(...survey.data.map(w => w.value));
                          const range = maxVal - minVal || 1;
                          
                          // Shuffle array deterministically or just map
                          return survey.data.map((word, i) => {
                            const normalized = (word.value - minVal) / range;
                            const size = 14 + (normalized * 26); // 14px to 40px
                            const opacity = 0.6 + (normalized * 0.4);
                            const colors = ['text-indigo-600', 'text-sky-500', 'text-emerald-500', 'text-amber-500', 'text-rose-500', 'text-violet-500'];
                            const colorClass = colors[i % colors.length];

                            return (
                              <span 
                                key={i}
                                className={`font-bold transition-transform hover:scale-110 cursor-default ${colorClass}`}
                                style={{ fontSize: `${size}px`, opacity }}
                                title={`${word.text} (${word.value} occurrences)`}
                              >
                                {word.text}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <p className="text-neutral-400 text-sm">Not enough text data collected yet.</p>
                    )
                  ) : (
                    <PrintableChart height={256} printWidth={350}>
                      <BarChart data={survey.data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{fontSize: 12}} />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '8px' }} />
                        <Bar 
                          isAnimationActive={false}
                          dataKey="count" 
                          fill="#8b5cf6" 
                          radius={[0, 4, 4, 0]} 
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(data) => handleChartClick(data, survey.label)}
                        />
                      </BarChart>
                    </PrintableChart>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </div> {/* END OF PDF EXPORT CONTAINER */}

      {/* Drill-Down Modal */}
      {selectedSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-neutral-800 rounded-md shadow-brutal dark:shadow-brutal-dark border-2 border-neutral-900 dark:border-neutral-700 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">{selectedSegment.title}</h3>
                <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">{selectedSegment.participants.length} Participant(s)</p>
              </div>
              <button 
                onClick={() => setSelectedSegment(null)}
                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              {selectedSegment.participants.length === 0 ? (
                <div className="p-6 text-center text-neutral-500">No participants found for this segment.</div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {selectedSegment.participants.map((p, i) => (
                    <li key={i} className="px-6 py-3 hover:bg-neutral-50 transition-colors flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{p.name}</p>
                        <p className="text-xs text-neutral-500">{p.email || 'No email provided'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
