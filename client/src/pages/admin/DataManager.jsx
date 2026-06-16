import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Download, Search, Users, MapPin, Briefcase, Upload, CheckCircle, AlertCircle, Trash2, Save, FileSpreadsheet, Activity, X } from 'lucide-react';
import Papa from 'papaparse';
import api from '../../lib/api';
import useAppStore from '../../stores/useAppStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import Skeleton from '../../components/ui/Skeleton';

export default function DataManager() {
  const addToast = useAppStore(state => state.addToast);
  
  const [activeTab, setActiveTab] = useState('global'); // global | import | flagged

  // Global Data State
  const [allParticipants, setAllParticipants] = useState([]);  // full dataset — source of truth
  const [participants, setParticipants] = useState([]);         // kept for legacy compat (mutations)
  const [globalLoading, setGlobalLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [globalEditStates, setGlobalEditStates] = useState({});
  const [activeParticipantModal, setActiveParticipantModal] = useState(null);
  const [jsonbEditStates, setJsonbEditStates] = useState({});

  // Import Data State
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [newEventName, setNewEventName] = useState('');

  // Real-Time Progress Tracker State
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [batchProgress, setBatchProgress] = useState(null);

  // AI Preview State
  const [aiPreviewLoading, setAiPreviewLoading] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState(null);

  // Flagged Data State
  const [flaggedQueue, setFlaggedQueue] = useState([]);
  const [flaggedLoading, setFlaggedLoading] = useState(true);
  const [editStates, setEditStates] = useState({});

  // Bulk Delete State
  const [selectedRows, setSelectedRows] = useState(new Set());

  useEffect(() => {
    if (activeTab === 'global') fetchParticipants();
    if (activeTab === 'flagged') fetchFlagged();
    if (activeTab === 'import') fetchEvents();
  }, [activeTab]);

  // Client-side instant filtering — no debounce, no network round-trip
  const filteredParticipants = useMemo(() => {
    if (!searchTerm.trim()) return allParticipants;
    const q = searchTerm.toLowerCase();
    return allParticipants.filter(p =>
      (p.name        || '').toLowerCase().includes(q) ||
      (p.email       || '').toLowerCase().includes(q) ||
      (p.company     || '').toLowerCase().includes(q) ||
      (p.jobTitle    || '').toLowerCase().includes(q) ||
      (p.industry    || '').toLowerCase().includes(q) ||
      (p.city        || '').toLowerCase().includes(q) ||
      (p.phone       || '').toLowerCase().includes(q)
    );
  }, [allParticipants, searchTerm]);

  const fetchAiPreview = async () => {
    if (!file || parsedData.length === 0 || selectedEventId !== 'AUTO_EVENT') return;
    setAiPreviewLoading(true);
    try {
      const headers = Object.keys(parsedData[0] || {});
      const dataSample = parsedData.slice(0, 1000);
      const res = await api.post('/admin/data/import/preview', { headers, dataSample });
      setAiPreviewData(res);
    } catch (err) {
      console.error("AI Preview failed", err);
      addToast({ type: 'error', title: 'Preview Failed', message: 'Could not generate AI mapping preview.' });
    } finally {
      setAiPreviewLoading(false);
    }
  };

  // Reset preview if file or mode changes
  useEffect(() => {
    setAiPreviewData(null);
  }, [file, selectedEventId]);

  // Real-Time Polling Effect
  useEffect(() => {
    let intervalId;
    if (activeBatchId) {
      intervalId = setInterval(async () => {
        try {
          const res = await api.get('/admin/data/batches/' + activeBatchId);
          setBatchProgress(res);
          if (res.status === 'complete' || res.status === 'failed') {
            clearInterval(intervalId);
            setTimeout(() => {
              setActiveBatchId(null);
              setBatchProgress(null);
              // Auto-refresh tables
              if (activeTab === 'global') fetchParticipants(searchTerm);
              if (activeTab === 'flagged') fetchFlagged();
            }, 5000); // Hide after 5 seconds
          }
        } catch (err) {
          console.error('Failed to fetch batch progress', err);
          clearInterval(intervalId);
        }
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeBatchId, activeTab, searchTerm]);

  // --- Global Data Methods ---
  const fetchEvents = async () => {
    try {
      const res = await api.get('/admin/events');
      setEvents(res || []);
    } catch (err) {
      console.error('Failed to load events for import selector', err);
    }
  };

  const fetchParticipants = async () => {
    try {
      setGlobalLoading(true);
      // Always load ALL participants — search is done client-side for instant results
      const res = await api.get('/admin/data/participants?search=');
      const list = res || [];
      setAllParticipants(list);
      setParticipants(list); // keep in sync
      const states = {};
      list.forEach(p => {
        states[p.id] = {
          email: p.email || '',
          name: p.name || '',
          phone: p.phone || '',
          company: p.company || '',
          jobTitle: p.jobTitle || '',
          industry: p.industry || '',
          city: p.city || ''
        };
      });
      setGlobalEditStates(states);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load global participants' });
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await api.get('/admin/data/participants/export');
      const csv = Papa.unparse(res || []);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Meetsy_global_participants_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      addToast({ type: 'success', title: 'Export Successful', message: 'Global CSV downloaded.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Export Failed', message: err.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGlobalEdit = (id, field, value) => {
    setGlobalEditStates(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveGlobalRow = async (id) => {
    const updatedData = globalEditStates[id];
    // Optimistic update on both the full list and filtered view
    const merge = (list) => list.map(p => p.id === id ? { ...p, ...updatedData } : p);
    const originalAll = [...allParticipants];
    setAllParticipants(prev => merge(prev));
    setParticipants(prev => merge(prev));
    try {
      await api.put(`/admin/data/participants/${id}`, updatedData);
      addToast({ type: 'success', title: 'Saved', message: 'Participant updated.' });
    } catch (err) {
      setAllParticipants(originalAll);
      setParticipants(originalAll);
      addToast({ type: 'error', title: 'Error', message: 'Failed to update participant.' });
    }
  };

  const deleteGlobalRow = async (id) => {
    if (!window.confirm("Are you sure you want to completely delete this participant and all their registrations?")) return;
    const originalAll = [...allParticipants];
    const remove = (list) => list.filter(p => p.id !== id);
    setAllParticipants(prev => remove(prev));
    setParticipants(prev => remove(prev));
    try {
      await api.delete(`/admin/data/participants/${id}`);
      addToast({ type: 'success', title: 'Deleted', message: 'Participant deleted.' });
    } catch (err) {
      setAllParticipants(originalAll);
      setParticipants(originalAll);
      addToast({ type: 'error', title: 'Error', message: 'Failed to delete participant.' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;
    if (!window.confirm(`Are you sure you want to completely delete ${selectedRows.size} participant(s) and all their registrations?`)) return;
    const ids = Array.from(selectedRows);
    const originalAll = [...allParticipants];
    const remove = (list) => list.filter(p => !selectedRows.has(p.id));
    setAllParticipants(prev => remove(prev));
    setParticipants(prev => remove(prev));
    setSelectedRows(new Set());
    try {
      await api.post('/admin/data/participants/bulk-delete', { ids });
      addToast({ type: 'success', title: 'Deleted', message: `Deleted ${ids.length} participants.` });
    } catch (err) {
      setAllParticipants(originalAll);
      setParticipants(originalAll);
      addToast({ type: 'error', title: 'Error', message: 'Failed to delete participants.' });
    }
  };

  const toggleRowSelect = (id) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === participants.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(participants.map(p => p.id)));
    }
  };

  const addNewParticipant = async () => {
    try {
      const res = await api.post('/admin/data/participants', { name: 'New Participant', email: `new_${Date.now()}@example.com` });
      setAllParticipants(prev => [res, ...prev]);
      setParticipants(prev => [res, ...prev]);
      setGlobalEditStates(prev => ({ ...prev, [res.id]: { name: res.name, email: res.email, phone: '', company: '', jobTitle: '', industry: '', city: '' } }));
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to add participant.' });
    }
  };

  const openParticipantModal = (participant) => {
    setActiveParticipantModal(participant);
    const jsonbStates = {};
    (participant.registrations || []).forEach(reg => {
      jsonbStates[reg.id] = reg.answers || {};
    });
    setJsonbEditStates(jsonbStates);
  };

  const handleJsonbEdit = (regId, key, value) => {
    setJsonbEditStates(prev => ({
      ...prev,
      [regId]: { ...prev[regId], [key]: value }
    }));
  };

  const saveJsonbAnswers = async (regId) => {
    const originalList = [...participants];
    
    // Optimistic UI update
    setParticipants(prev => prev.map(p => {
      if (p.id === activeParticipantModal?.id) {
        return {
          ...p,
          registrations: p.registrations.map(r => r.id === regId ? { ...r, answers: jsonbEditStates[regId] } : r)
        };
      }
      return p;
    }));

    try {
      await api.put(`/admin/data/registrations/${regId}/answers`, { answers: jsonbEditStates[regId] });
      addToast({ type: 'success', title: 'Saved', message: 'Event survey answers updated.' });
    } catch (err) {
      // Revert on error
      setParticipants(originalList);
      addToast({ type: 'error', title: 'Error', message: 'Failed to update answers.' });
    }
  };

  // --- Importer Methods ---
  const TEMPLATE_HEADERS = ['email', 'name', 'phone', 'company', 'jobTitle', 'industry', 'city', 'country'];
  
  const downloadTemplate = () => {
    const csvContent = TEMPLATE_HEADERS.join(',') + '\n' + 'test@example.com,John Doe,12345,Acme Corp,Developer,IT,New York,USA';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template.csv';
    link.click();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processSelectedFile(selectedFile);
  };

  const processSelectedFile = (selectedFile) => {
    setFile(selectedFile);
    setImportResults(null);
    Papa.parse(selectedFile, {
      header: true, skipEmptyLines: true,
      complete: (results) => setParsedData(results.data),
      error: (err) => addToast({ type: 'error', title: 'Parse Error', message: err.message })
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      processSelectedFile(droppedFile);
    } else {
      addToast({ type: 'error', title: 'Invalid File', message: 'Please upload a valid CSV file.' });
    }
  };

  const handleImport = async () => {
    if (!parsedData.length) return;

    // Detect if we're in auto-event-column mode
    const isAutoEventCol = selectedEventId === 'AUTO_EVENT';

    // Auto-generate a single event name from filename (if no column found)
    let autoEventName = null;
    if (selectedEventId === 'AUTO_EVENT') {
      const detectedCol = aiPreviewData?.eventColumnKey;
      if (!detectedCol) {
        // Fallback: name from filename
        const baseName = file?.name?.replace(/\.csv$/i, '').replace(/[_-]/g, ' ').trim() || 'Imported Event';
        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        autoEventName = `${baseName} · ${dateStr}`;
      }
    }
    
    try {
      setIsProcessing(true);
      const res = await api.post('/admin/data/import', { 
        data: parsedData,
        eventId: (selectedEventId && selectedEventId !== 'AUTO_EVENT') ? selectedEventId : null,
        newEventName: autoEventName,
        useEventColumn: isAutoEventCol,
        columnMapping: aiPreviewData?.columnMapping,
        eventNameMapping: aiPreviewData?.eventNameMapping
      });
      setImportResults(res);
      if (res.batchId) {
        setActiveBatchId(res.batchId);
      }
      addToast({ type: 'success', title: 'Batch Queued', message: 'Data is being processed by the AI pipeline in the background.' });
      setTimeout(() => setActiveTab('flagged'), 2000);
    } catch (err) {
      addToast({ type: 'error', title: 'Import Failed', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper: detect if parsed CSV has an event name column
  const EVENT_COLUMN_ALIASES = ['event name', 'event_name', 'eventname', 'event', 'event title', 'event_title', 'nama event', 'nama acara', 'acara'];
  const detectEventColumn = (rows) => {
    if (!rows || rows.length === 0) return null;
    const headers = Object.keys(rows[0]);
    return headers.find(h => EVENT_COLUMN_ALIASES.includes(h.toLowerCase().trim())) || null;
  };

  // Title-case helper (mirrors backend capitalizeWords)
  const toTitleCase = (str) => str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  // Compute the detected event names from parsed CSV for preview
  // — standardize with title case and deduplicate by the normalized key
  const detectedEventCol = parsedData.length > 0 ? detectEventColumn(parsedData) : null;
  const uniqueEventNamesInCSV = detectedEventCol
    ? (() => {
        const seen = new Set();
        const result = [];
        parsedData.forEach(r => {
          const raw = r[detectedEventCol]?.toString().trim();
          if (!raw) return;
          const normalized = toTitleCase(raw);
          if (!seen.has(normalized)) { seen.add(normalized); result.push(normalized); }
        });
        return result;
      })()
    : [];

  // --- Flagged Queue Methods ---
  const fetchFlagged = async () => {
    try {
      setFlaggedLoading(true);
      const res = await api.get('/admin/data/flagged');
      setFlaggedQueue(res || []);
      // init edit states
      const states = {};
      (res || []).forEach(item => {
        const initialData = item.rawData.__standardized || item.rawData;
        states[item.id] = { 
          email: initialData.email || '',
          name: initialData.name || '',
          phone: initialData.phone || '',
          company: initialData.company || '',
          jobTitle: initialData.jobTitle || '',
          industry: initialData.industry || '',
          city: initialData.city || ''
        }; 
      });
      setEditStates(states);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load flagged data' });
    } finally {
      setFlaggedLoading(false);
    }
  };

  const handleFlaggedEdit = (id, field, value) => {
    setEditStates(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const resolveFlagged = async (id) => {
    const originalQueue = [...flaggedQueue];
    setFlaggedQueue(prev => prev.filter(f => f.id !== id));
    try {
      await api.patch(`/admin/data/flagged/${id}/resolve`, editStates[id]);
      addToast({ type: 'success', title: 'Resolved', message: 'Record merged into global database.' });
    } catch (err) {
      setFlaggedQueue(originalQueue);
      addToast({ type: 'error', title: 'Failed to Resolve', message: err.response?.data?.message || err.message });
    }
  };

  const discardFlagged = async (id) => {
    const originalQueue = [...flaggedQueue];
    setFlaggedQueue(prev => prev.filter(f => f.id !== id));
    try {
      await api.patch(`/admin/data/flagged/${id}/discard`);
      addToast({ type: 'success', title: 'Discarded', message: 'Record permanently discarded.' });
    } catch (err) {
      setFlaggedQueue(originalQueue);
      addToast({ type: 'error', title: 'Failed to Discard', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-neutral-900 dark:text-white uppercase">Data Manager</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Manage the global database, bulk import legacy data, and utilize AI to clean records.</p>
      </div>

      <div className="flex border-b-2 border-neutral-900 dark:border-neutral-700">
        <button 
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'global' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 dark:text-neutral-400'}`}
          onClick={() => setActiveTab('global')}
        >
          <Users className="w-4 h-4" /> Global Address Book
        </button>
        <button 
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'import' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 dark:text-neutral-400'}`}
          onClick={() => setActiveTab('import')}
        >
          <Upload className="w-4 h-4" /> Bulk Import
        </button>
        <button 
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'flagged' ? 'border-danger-600 text-danger-600' : 'border-transparent text-neutral-500 dark:text-neutral-400'}`}
          onClick={() => setActiveTab('flagged')}
        >
          <Activity className="w-4 h-4" /> Flagged Queue
          {flaggedQueue.length > 0 && activeTab !== 'flagged' && (
            <span className="ml-1 bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300 py-0.5 px-2 rounded-md text-xs font-bold border-2 border-neutral-900 dark:border-neutral-700">{flaggedQueue.length}</span>
          )}
        </button>
      </div>

      {/* --- GLOBAL TAB --- */}
      {activeTab === 'global' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between gap-4 flex-wrap">
            {/* Snappy client-side search bar */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search names, emails, company, city…"
                className="w-full pl-9 pr-9 py-2 text-sm border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:border-primary-500 outline-none transition-all font-bold"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-3 items-center">
              {searchTerm && !globalLoading && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                  {filteredParticipants.length} of {allParticipants.length} shown
                </span>
              )}
              <Button variant="secondary" onClick={addNewParticipant}>+ Add Manual Record</Button>
              <Button icon={Download} onClick={handleExport} isLoading={isExporting}>Export Global Data</Button>
              {selectedRows.size > 0 && (
                <Button variant="danger" icon={Trash2} onClick={handleBulkDelete}>Delete Selected ({selectedRows.size})</Button>
              )}
            </div>
          </div>
          
          <div className="w-full overflow-x-auto bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md shadow-brutal dark:shadow-brutal-dark">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-neutral-50 dark:bg-neutral-900 border-b-2 border-neutral-900 dark:border-neutral-700">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-2 border-neutral-900 dark:border-neutral-500 text-primary-600 bg-white dark:bg-neutral-900"
                      checked={filteredParticipants.length > 0 && selectedRows.size === filteredParticipants.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  {['Name*', 'Email*', 'Phone', 'Company', 'Job Title', 'Industry', 'City'].map(col => (
                    <th key={col} className="px-3 py-3 font-black text-neutral-500 dark:text-neutral-400 min-w-[120px] uppercase tracking-wider text-xs">{col}</th>
                  ))}
                  <th className="px-4 py-3 font-black text-neutral-500 dark:text-neutral-400 text-right w-48 uppercase tracking-wider text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-neutral-900 dark:divide-neutral-700">
                {globalLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skel-${i}`}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-6 w-full max-w-[150px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredParticipants.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-neutral-400 dark:text-neutral-500">
                    {searchTerm ? (
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                        <p className="text-sm font-bold text-neutral-900 dark:text-white">No results for &ldquo;{searchTerm}&rdquo;</p>
                        <button onClick={() => setSearchTerm('')} className="text-xs text-primary-600 hover:underline">Clear search</button>
                      </div>
                    ) : 'No participants yet.'}
                  </td></tr>
                ) : filteredParticipants.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                    <td className="px-4 py-2 align-middle">
                      <input 
                        type="checkbox" 
                        className="rounded border-2 border-neutral-900 dark:border-neutral-500 text-primary-600 bg-white dark:bg-neutral-900"
                        checked={selectedRows.has(item.id)}
                        onChange={() => toggleRowSelect(item.id)}
                      />
                    </td>
                    {['name', 'email', 'phone', 'company', 'jobTitle', 'industry', 'city'].map(field => (
                      <td key={field} className="px-1 py-1 align-top">
                        <input 
                          type="text"
                          value={globalEditStates[item.id]?.[field] || ''}
                          onChange={(e) => handleGlobalEdit(item.id, field, e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border-2 border-transparent rounded-md transition-colors focus:bg-white dark:focus:bg-neutral-900 focus:border-primary-500 outline-none bg-transparent text-neutral-900 dark:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-700/50 font-bold placeholder:text-neutral-400 dark:placeholder:text-neutral-600 placeholder:font-normal placeholder:italic"
                          placeholder={field}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 align-middle text-right whitespace-nowrap flex justify-end items-center gap-1">
                      <button onClick={() => deleteGlobalRow(item.id)} className="btn-icon btn-icon-danger" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => saveGlobalRow(item.id)} className="btn-icon btn-icon-success" title="Save Row">
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openParticipantModal(item)}
                        className="ml-1 px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-primary-900 hover:text-primary-700 dark:hover:text-primary-300 active:scale-95 rounded-md text-xs font-bold transition-all duration-150 border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark"
                        title="View Event History & Answers"
                      >
                        Events ({(item.registrations || []).length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- IMPORT TAB --- */}
      {activeTab === 'import' && (
        <div className="bg-white dark:bg-neutral-800 p-8 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark text-center animate-in fade-in max-w-4xl mx-auto">
          {!file && (
            <div 
              className={`max-w-md mx-auto space-y-4 p-8 border-2 border-dashed rounded-md transition-colors duration-200 ${
                isDragging ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/30 scale-105' : 'border-transparent'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className={`w-16 h-16 rounded-md flex items-center justify-center mx-auto mb-6 transition-colors ${
                isDragging ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
              }`}>
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white uppercase">Upload your CSV</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Drag and drop your file here, or click to browse. The ETL pipeline and AI will automatically standardize messy records.</p>
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <div className="flex justify-center gap-3 mt-6">
                <Button variant="secondary" onClick={downloadTemplate}>Download Template</Button>
                <Button onClick={() => fileInputRef.current?.click()}>Select File</Button>
              </div>
            </div>
          )}

          {file && !importResults && (
            <div className="max-w-2xl mx-auto space-y-6 text-left">
              <div className="flex items-center gap-4 p-4 border-2 border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 rounded-md">
                <FileSpreadsheet className="w-8 h-8 text-primary-600" />
                <div className="flex-1"><p className="font-bold text-neutral-900 dark:text-white">{file.name}</p><p className="text-sm text-neutral-600 dark:text-neutral-400">{parsedData.length} rows found</p></div>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm font-bold text-neutral-500 dark:text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/30 px-2.5 py-1 rounded-md border-2 border-transparent hover:border-danger-300 dark:hover:border-danger-700 active:scale-95 transition-all duration-150"
                >Cancel</button>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 rounded-md p-4 space-y-2">
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300">Target Event (Optional)</label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Choose how to link imported participants to an event. Extra CSV columns are saved as custom Event Registration Answers.</p>
                <select 
                  className="w-full px-3 py-2 border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:border-primary-500 outline-none font-bold"
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                >
                  <option value="">Global Address Book Only (No Event)</option>
                  <option value="AUTO_EVENT">Global Address Book + Auto Event (from CSV data)</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>

                {selectedEventId === 'AUTO_EVENT' && (
                  <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/30 border-2 border-primary-300 dark:border-primary-700 rounded-md animate-in slide-in-from-top-2 space-y-2">
                    {!aiPreviewData && !aiPreviewLoading ? (
                      <div className="text-center py-2">
                        <Button variant="secondary" onClick={fetchAiPreview} className="w-full sm:w-auto">
                          Generate AI Mapping Preview
                        </Button>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">See how the AI will detect and standardize event names before importing.</p>
                      </div>
                    ) : aiPreviewLoading ? (
                      <div className="flex items-center gap-3 text-primary-700 py-2 justify-center">
                        <Activity className="w-5 h-5 animate-pulse" />
                        <span className="text-sm font-bold">AI is mapping columns and standardizing events...</span>
                      </div>
                    ) : aiPreviewData?.eventColumnKey ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary-700 dark:text-primary-300">✅ AI detected Event column:</span>
                          <code className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded font-mono">{aiPreviewData.eventColumnKey}</code>
                        </div>
                        <p className="text-xs text-primary-600">
                          {Object.keys(aiPreviewData.eventNameMapping || {}).length} unique event{Object.keys(aiPreviewData.eventNameMapping || {}).length !== 1 ? 's' : ''} matched and standardized:
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Array.from(new Set(Object.values(aiPreviewData.eventNameMapping || {}))).map(name => (
                            <span key={name} className="inline-block px-2 py-0.5 bg-white dark:bg-neutral-800 border-2 border-primary-300 dark:border-primary-700 text-primary-800 dark:text-primary-300 rounded-md text-xs font-bold">
                              {name}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-primary-500 mt-1">Only participants that pass ETL (not flagged) will be linked to their respective event.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-amber-700">⚠️ AI could not detect an Event name column.</p>
                        <p className="text-xs text-amber-600">Falling back to auto-name from filename:</p>
                        <p className="text-sm font-semibold text-amber-900">
                          {(() => {
                            const baseName = file?.name?.replace(/\.csv$/i, '').replace(/[_-]/g, ' ').trim() || 'Imported Event';
                            const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            return `${baseName} · ${dateStr}`;
                          })()}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleImport} isLoading={isProcessing} icon={CheckCircle}>Start AI Pipeline</Button>
              </div>
            </div>
          )}

          {importResults && (
            <div className="max-w-md mx-auto py-8">
              <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
              <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase">Pipeline Started</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mt-2">Check the Flagged Queue to manually correct rows the AI could not confidently fix.</p>
              <Button className="mt-6" onClick={() => { setFile(null); setImportResults(null); }}>Import Another</Button>
            </div>
          )}
        </div>
      )}

      {/* --- FLAGGED TAB --- */}
      {activeTab === 'flagged' && (() => {
        const BADGE_COLORS = {
          duplicate_conflict: 'bg-orange-100 text-orange-800 border-orange-300',
          duplicate_csv:      'bg-yellow-100 text-yellow-800 border-yellow-300',
          duplicate_name:     'bg-amber-100 text-amber-800 border-amber-300',
          missing_field:      'bg-red-100 text-red-800 border-red-300',
          invalid_field:      'bg-pink-100 text-pink-800 border-pink-300',
          spam:               'bg-gray-100 text-gray-600 border-gray-300',
          validation:         'bg-blue-100 text-blue-800 border-blue-300',
        };
        const BADGE_LABELS = {
          duplicate_conflict: '⚠ Duplicate Conflict',
          duplicate_csv:      '⚠ CSV Duplicate',
          duplicate_name:     '⚠ Name Match',
          missing_field:      '✗ Missing Field',
          invalid_field:      '✗ Invalid Field',
          spam:               '✗ Spam/Junk',
          validation:         '⚠ Validation Error',
        };

        // Build a grouping key for each duplicate item.
        // Priority: if the item has a DB anchor record (__existing), group by its email
        // so CSV duplicates that also exist in DB join the same bucket as DB conflicts.
        const getDuplicateKey = (item) => {
          const rd = item.rawData || {};
          // If ANY duplicate has a linked DB record, group by that DB email
          if (rd.__existing?.email) return `db::${rd.__existing.email.toLowerCase()}`;
          // Name-match duplicates group by the matched DB name
          if (rd.__existing?.name)  return `db::name::${rd.__existing.name.toLowerCase()}`;
          // Pure CSV-only duplicate: extract the shared key from the reason string
          if (rd.__reasonCategory === 'duplicate_csv') {
            const m = item.reason?.match(/\("([^"]+)"\)/);
            return `csv::${m ? m[1].toLowerCase() : item.id}`;
          }
          return `other::${item.id}`;
        };

        const isDupCat = (cat) => cat === 'duplicate_conflict' || cat === 'duplicate_name' || cat === 'duplicate_csv';

        // Separate duplicates from non-duplicates
        const dupItems = flaggedQueue.filter(i => isDupCat(i.rawData?.__reasonCategory));
        const nonDupItems = flaggedQueue.filter(i => !isDupCat(i.rawData?.__reasonCategory));

        // Group duplicates by their conflict key
        const dupGroups = new Map();
        for (const item of dupItems) {
          const key = getDuplicateKey(item) || item.id;
          if (!dupGroups.has(key)) {
            const rd = item.rawData || {};
            const anchor = rd.__existing || null;
            dupGroups.set(key, { key, anchor, items: [] });
          } else if (!dupGroups.get(key).anchor) {
            // Latch onto the first item that has a DB anchor in this group
            const rd = item.rawData || {};
            if (rd.__existing) dupGroups.get(key).anchor = rd.__existing;
          }
          dupGroups.get(key).items.push(item);
        }

        const FIELDS = ['email', 'name', 'phone', 'company', 'jobTitle', 'industry', 'city'];
        const FIELD_LABELS = ['Email*', 'Name', 'Phone', 'Company', 'Job Title', 'Industry', 'City'];

        return (
          <div className="space-y-4 animate-in fade-in">
            {flaggedLoading ? (
              <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md shadow-brutal dark:shadow-brutal-dark overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-100 dark:bg-neutral-900 border-b-2 border-neutral-900 dark:border-neutral-700 font-black text-neutral-900 dark:text-white uppercase">
                    <tr>
                      <th className="px-4 py-3 w-48">Source File</th>
                      <th className="px-4 py-3">Data Review</th>
                      <th className="px-4 py-3 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-neutral-900 dark:divide-neutral-700">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <tr key={`skel-flag-${i}`}>
                        <td className="px-4 py-3 align-top"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3 align-top space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </td>
                        <td className="px-4 py-3 align-top text-right space-y-2">
                          <Skeleton className="h-8 w-8 inline-block ml-1" />
                          <Skeleton className="h-8 w-8 inline-block ml-1" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : flaggedQueue.length === 0 ? (
              <div className="bg-white dark:bg-neutral-800 p-12 text-center rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark">
                <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
                <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase">Queue is empty!</h3>
                <p className="text-neutral-500 dark:text-neutral-400">All data has been successfully standardized.</p>
              </div>
            ) : (
              <div className="space-y-6">

                {/* Legend */}
                <div className="bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md p-4 shadow-brutal dark:shadow-brutal-dark">
                  <p className="text-xs font-black text-neutral-600 dark:text-neutral-400 mb-2 uppercase tracking-wide">Flag Reason Legend</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(BADGE_COLORS).map(([cat, color]) => (
                      <span key={cat} className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border-2 ${color}`}>
                        {BADGE_LABELS[cat]}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">Edit the fields below, then <span className="font-bold">save ✓</span> to merge into the global database, or <span className="font-bold">discard 🗑</span> to permanently remove the record.</p>
                </div>

                {/* ── DUPLICATE GROUPS ── */}
                {dupGroups.size > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                      <span className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 text-xs font-bold">{dupItems.length}</span>
                      Duplicate Records — grouped by conflict
                    </h3>

                    {Array.from(dupGroups.values()).map(({ key, anchor, items }) => {
                      // Does any row in this group have a DB anchor?
                      const hasDBRecord = !!anchor;
                      // Are there any rows flagged as a direct DB conflict (data mismatch)?
                      const hasConflictRows = items.some(i => i.rawData?.__reasonCategory === 'duplicate_conflict');
                      // Are all rows pure CSV-only (no DB record)?
                      const isPureCSV = !hasDBRecord;

                      const groupBorderColor = hasConflictRows ? 'border-orange-300' : hasDBRecord ? 'border-amber-300' : 'border-yellow-300';
                      const groupBgColor     = hasConflictRows ? 'bg-orange-50'     : hasDBRecord ? 'bg-amber-50'     : 'bg-yellow-50';

                      // Describe who is duplicating with who
                      const csvCount = items.length;
                      const anchorLabel = anchor ? (anchor.email || anchor.name) : null;
                      const headerLabel = hasConflictRows
                        ? `⚠ CSV rows conflict with DB record`
                        : hasDBRecord
                        ? `⚠ CSV rows match existing DB record`
                        : `⚠ Duplicates within this CSV file`;

                      return (
                        <div key={key} className={`rounded-md border-2 ${groupBorderColor} overflow-hidden shadow-brutal dark:shadow-brutal-dark`}>
                          {/* Group header */}
                          <div className={`${groupBgColor} px-4 py-2.5 flex items-center justify-between border-b ${groupBorderColor}`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">{headerLabel}</span>
                              <span className="text-xs bg-white/70 dark:bg-neutral-800/70 border-2 border-current text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-md font-bold">
                                {csvCount} CSV {csvCount === 1 ? 'row' : 'rows'}
                              </span>
                              {hasDBRecord && (
                                <span className="text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-2 border-neutral-300 dark:border-neutral-600 px-2 py-0.5 rounded-md font-bold">
                                  + 1 DB record
                                </span>
                              )}
                            </div>
                            {anchorLabel && (
                              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono shrink-0 ml-2">
                                key: <strong>{anchorLabel}</strong>
                              </span>
                            )}
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                              <thead className="bg-white/80 dark:bg-neutral-800/80 border-b-2 border-neutral-900 dark:border-neutral-700">
                                <tr>
                                  <th className="px-4 py-2 text-xs font-black text-neutral-500 dark:text-neutral-400 w-28 uppercase tracking-wider">Source</th>
                                  {FIELD_LABELS.map(l => (
                                    <th key={l} className="px-3 py-2 text-xs font-black text-neutral-500 dark:text-neutral-400 min-w-[110px] uppercase tracking-wider">{l}</th>
                                  ))}
                                  <th className="px-4 py-2 w-20 text-right text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Anchor/DB row shown ONCE at top of group */}
                                {anchor && (
                                  <tr className="bg-neutral-100 dark:bg-neutral-700 border-b-2 border-dashed border-neutral-300 dark:border-neutral-600">
                                    <td className="px-4 py-2 align-middle">
                                      <span className="inline-flex items-center gap-1 text-xs font-black bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-md border-2 border-neutral-300 dark:border-neutral-500 whitespace-nowrap">
                                        🗄 DB Record
                                      </span>
                                    </td>
                                    {FIELDS.map(field => (
                                      <td key={field} className="px-3 py-2 text-neutral-500 dark:text-neutral-400 text-xs truncate max-w-[130px]" title={anchor[field] || '—'}>
                                        {anchor[field] || <span className="italic text-neutral-300 dark:text-neutral-600">—</span>}
                                      </td>
                                    ))}
                                    <td className="px-4 py-2" />
                                  </tr>
                                )}

                                {/* All CSV rows in this group */}
                                {items.map((item, idx) => {
                                  const cat = item.rawData?.__reasonCategory || 'validation';
                                  return (
                                    <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-neutral-800' : 'bg-orange-50/20 dark:bg-orange-900/10'} border-b-2 border-neutral-200 dark:border-neutral-700 last:border-0`}>
                                      <td className="px-4 py-2 align-top">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest">CSV row {idx + 1}</span>
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border-2 ${BADGE_COLORS[cat]}`}>
                                            {BADGE_LABELS[cat]}
                                          </span>
                                        </div>
                                      </td>
                                      {FIELDS.map(field => (
                                        <td key={field} className="px-1 py-1 align-top">
                                          <input
                                            type="text"
                                            value={editStates[item.id]?.[field] || ''}
                                            onChange={(e) => handleFlaggedEdit(item.id, field, e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border-2 border-transparent rounded-md transition-colors focus:bg-white dark:focus:bg-neutral-900 focus:border-primary-500 outline-none bg-white/60 dark:bg-neutral-800/60 text-neutral-900 dark:text-white hover:bg-white dark:hover:bg-neutral-700 font-bold"
                                            placeholder={`Missing ${field}`}
                                          />
                                        </td>
                                      ))}
                                      <td className="px-4 py-2 align-middle text-right space-x-1 whitespace-nowrap">
                                        <button onClick={() => discardFlagged(item.id)} className="btn-icon btn-icon-danger" title="Discard">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => resolveFlagged(item.id)} className="btn-icon btn-icon-success" title="Save & Approve">
                                          <Save className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── NON-DUPLICATE ITEMS (validation, missing, spam, etc.) ── */}
                {nonDupItems.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                      <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-red-700 text-xs font-bold">{nonDupItems.length}</span>
                      Validation Errors — individual records
                    </h3>
                    <div className="w-full overflow-x-auto bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md shadow-brutal dark:shadow-brutal-dark">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-neutral-50 dark:bg-neutral-900 border-b-2 border-neutral-900 dark:border-neutral-700">
                          <tr>
                            <th className="px-4 py-3 font-black text-neutral-500 dark:text-neutral-400 min-w-[200px] uppercase tracking-wider text-xs">Flag Reason</th>
                            {FIELD_LABELS.map(col => (
                              <th key={col} className="px-3 py-3 font-black text-neutral-500 dark:text-neutral-400 min-w-[120px] uppercase tracking-wider text-xs">{col}</th>
                            ))}
                            <th className="px-4 py-3 font-black text-neutral-500 dark:text-neutral-400 text-right w-24 uppercase tracking-wider text-xs">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-neutral-900 dark:divide-neutral-700">
                          {nonDupItems.map((item) => {
                            const cat = item.rawData?.__reasonCategory || 'validation';
                            return (
                              <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
                                <td className="px-4 py-2 align-top">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border-2 ${BADGE_COLORS[cat]}`}>
                                    {BADGE_LABELS[cat]}
                                  </span>
                                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 leading-tight break-words max-w-[190px]" title={item.reason}>
                                    {item.reason}
                                  </p>
                                </td>
                                {FIELDS.map(field => (
                                  <td key={field} className="px-1 py-1 align-top">
                                    <input
                                      type="text"
                                      value={editStates[item.id]?.[field] || ''}
                                      onChange={(e) => handleFlaggedEdit(item.id, field, e.target.value)}
                                      className="w-full px-2 py-1.5 text-sm border-2 border-transparent rounded-md transition-colors focus:bg-white dark:focus:bg-neutral-900 focus:border-primary-500 outline-none bg-transparent text-neutral-900 dark:text-white hover:bg-neutral-100/50 dark:hover:bg-neutral-700/50 font-bold placeholder:text-neutral-400 dark:placeholder:text-neutral-600 placeholder:font-normal placeholder:italic"
                                      placeholder={`Missing ${field}`}
                                    />
                                  </td>
                                ))}
                                <td className="px-4 py-2 align-middle text-right space-x-1 whitespace-nowrap">
                                  <button onClick={() => discardFlagged(item.id)} className="btn-icon btn-icon-danger" title="Discard">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => resolveFlagged(item.id)} className="btn-icon btn-icon-success" title="Save & Approve">
                                    <Save className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })()}

      {/* --- REAL-TIME PROGRESS TRACKER WIDGET --- */}
      {activeBatchId && batchProgress && (() => {
        const phase = batchProgress.currentPhase || 'queued';
        const isComplete = batchProgress.status === 'complete';
        const isFailed = batchProgress.status === 'failed';
        const isPhase0 = phase === 'mapping_columns';
        const processed = batchProgress.cleanedRows + batchProgress.aiRows + batchProgress.flaggedRows + batchProgress.discardedRows;
        const pct = batchProgress.totalRows > 0 ? Math.min(100, (processed / batchProgress.totalRows) * 100) : 0;

        const PHASES = [
          { key: 'mapping_columns', label: 'AI Column Mapping',  desc: 'phi4-mini maps CSV headers → schema fields', color: 'text-violet-600', bg: 'bg-violet-500' },
          { key: 'processing_rows', label: 'Validation & Dedup',  desc: 'Checking names, emails, duplicates…',         color: 'text-blue-600',   bg: 'bg-blue-500' },
          { key: 'ai_enrichment',   label: 'AI ETL Enrichment',  desc: 'phi4-mini filling missing fields…',            color: 'text-primary-600', bg: 'bg-primary-500' },
          { key: 'complete',        label: 'Complete',            desc: 'All rows processed',                          color: 'text-success-600', bg: 'bg-success-500' },
        ];
        const phaseIndex = PHASES.findIndex(p => p.key === phase);

        const phaseLabel = isComplete ? 'Pipeline Complete!' : isFailed ? 'Pipeline Failed' :
          phase === 'mapping_columns' ? '⚡ AI Mapping Column Headers…' :
          phase === 'processing_rows' ? '🔍 Validating & Deduplicating Rows…' :
          phase === 'ai_enrichment'   ? '🤖 AI Enriching Missing Fields…' : 'Starting…';

        return (
          <div className="fixed bottom-6 right-6 w-[26rem] bg-white dark:bg-neutral-800 rounded-md shadow-brutal dark:shadow-brutal-dark border-2 border-neutral-900 dark:border-neutral-700 overflow-hidden z-50 animate-in slide-in-from-bottom-5">
            {/* Header */}
            <div className={`px-4 py-3 flex items-center gap-3 border-b-2 border-neutral-900 dark:border-neutral-700 ${isComplete ? 'bg-success-500' : isFailed ? 'bg-danger-500' : 'bg-primary-500'}`}>
              {isComplete ? (
                <CheckCircle className="w-5 h-5 text-white shrink-0" />
              ) : isFailed ? (
                <AlertCircle className="w-5 h-5 text-white shrink-0" />
              ) : (
                <div className="w-5 h-5 shrink-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white uppercase tracking-wide truncate">{phaseLabel}</p>
                <p className="text-xs text-white/80 font-bold truncate">{batchProgress.filename}</p>
              </div>
            </div>

            <div className="px-4 pt-3 pb-4 space-y-3">
              {/* Overall progress bar */}
              <div>
                <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  <span>Overall Progress</span>
                  <span className="font-bold">
                    {isPhase0 ? 'Analyzing columns…' : `${processed} / ${batchProgress.totalRows} rows`}
                  </span>
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-700 rounded-md h-2 overflow-hidden">
                  {isPhase0 ? (
                    // Indeterminate animation during Phase 0
                    <div className="h-full w-1/2 rounded-md bg-violet-500 animate-[pulse_1.5s_ease-in-out_infinite] origin-left" />
                  ) : (
                    <div
                      className={`h-full rounded-md transition-all duration-700 ${isComplete ? 'bg-success-500' : 'bg-primary-500'}`}
                      style={{ width: `${isComplete ? 100 : pct}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Phase stepper */}
              <div className="grid grid-cols-4 gap-1 mt-1">
                {PHASES.map((p, idx) => {
                  const isActive = p.key === phase && !isComplete;
                  const isDone = isComplete || idx < phaseIndex;
                  return (
                    <div key={p.key} className="flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black border-2 transition-all
                        ${isDone ? 'bg-success-500 text-white border-neutral-900' : isActive ? `${p.bg} text-white border-neutral-900 dark:border-white shadow-brutal dark:shadow-brutal-dark` : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 border-neutral-300 dark:border-neutral-600'}`}>
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[9px] text-center leading-tight font-bold ${isActive ? p.color : 'text-neutral-400 dark:text-neutral-500'}`}>
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Row counters */}
              <div className="grid grid-cols-4 gap-2 pt-1 border-t-2 border-neutral-900 dark:border-neutral-700">
                <div className="text-center">
                  <p className="text-base font-bold text-success-600">{batchProgress.cleanedRows}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Clean</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-primary-600">{batchProgress.aiRows}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">AI Fixed</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-warning-600">{batchProgress.flaggedRows}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Flagged</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-neutral-400 dark:text-neutral-500">{batchProgress.discardedRows}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Skipped</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* --- PARTICIPANT EVENTS MODAL --- */}
      {activeParticipantModal && (
        <div className="fixed inset-0 bg-neutral-900/50 dark:bg-neutral-950/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-md shadow-brutal dark:shadow-brutal-dark border-2 border-neutral-900 dark:border-neutral-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b-2 border-neutral-900 dark:border-neutral-700 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900">
              <div>
                <h2 className="text-lg font-black text-neutral-900 dark:text-white uppercase">{activeParticipantModal.name} - Event History</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{activeParticipantModal.email}</p>
              </div>
              <button onClick={() => setActiveParticipantModal(null)} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-white font-black text-xl">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {(activeParticipantModal.registrations || []).length === 0 ? (
                <p className="text-neutral-500 dark:text-neutral-400 text-center py-8">No event history found.</p>
              ) : (
                (activeParticipantModal.registrations || []).map(reg => (
                  <div key={reg.id} className="border-2 border-neutral-900 dark:border-neutral-700 rounded-md overflow-hidden">
                    <div className="bg-neutral-100 dark:bg-neutral-700 px-4 py-3 border-b-2 border-neutral-900 dark:border-neutral-700 flex justify-between items-center">
                      <div className="font-bold text-neutral-800 dark:text-neutral-200">{reg.event?.title || 'Unknown Event'}</div>
                      <span className={`text-xs px-2 py-1 rounded-md font-bold border-2 ${reg.status === 'APPROVED' ? 'bg-success-100 text-success-800 border-success-300' : 'bg-warning-100 text-warning-800 border-warning-300'}`}>
                        {reg.status}
                      </span>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-black text-neutral-700 dark:text-neutral-300 uppercase">Custom Survey Answers (JSONB)</h4>
                        <Button size="sm" icon={Save} onClick={() => saveJsonbAnswers(reg.id)}>Save Answers</Button>
                      </div>
                      
                      {Object.keys(jsonbEditStates[reg.id] || {}).length === 0 ? (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 italic p-3 bg-neutral-50 dark:bg-neutral-900 rounded-md border-2 border-neutral-900 dark:border-neutral-700">
                          <p>No custom survey answers for this event.</p>
                          <button 
                            className="mt-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-bold underline"
                            onClick={() => handleJsonbEdit(reg.id, 'New Question', 'New Answer')}
                          >
                            + Add custom key
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(jsonbEditStates[reg.id] || {}).map(([key, val]) => (
                            <div key={key}>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{key}</label>
                                <button 
                                  className="text-xs text-danger-500 hover:text-danger-700"
                                  onClick={() => {
                                    const newState = { ...jsonbEditStates[reg.id] };
                                    delete newState[key];
                                    setJsonbEditStates(prev => ({ ...prev, [reg.id]: newState }));
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                              <input 
                                type="text"
                                value={val}
                                onChange={(e) => handleJsonbEdit(reg.id, key, e.target.value)}
                                className="w-full px-3 py-2 text-sm border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:border-primary-500 outline-none font-bold"
                              />
                            </div>
                          ))}
                          <div className="col-span-1 md:col-span-2 mt-2">
                            <button 
                              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-bold"
                              onClick={() => {
                                const newKey = prompt("Enter new custom question/key name:");
                                if (newKey) handleJsonbEdit(reg.id, newKey, '');
                              }}
                            >
                              + Add custom key
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
