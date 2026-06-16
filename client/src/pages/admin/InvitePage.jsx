import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Mail, Filter, X, SlidersHorizontal } from 'lucide-react';
import api from '../../lib/api';
import useAppStore from '../../stores/useAppStore';
import { Button } from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';

export default function InvitePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useAppStore(state => state.addToast);

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isSearching, setIsSearching] = useState(true);

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ industry: '', city: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [invitedIds, setInvitedIds] = useState(new Set());  // already-sent this session
  const [invitingIds, setInvitingIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkInviting, setIsBulkInviting] = useState(false);

  useEffect(() => { fetchEvent(); }, [id]);

  // Dynamic debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      searchParticipants(query, filters);
    }, 300);
    return () => clearTimeout(delay);
  }, [id, query, filters.industry, filters.city]);

  const fetchEvent = async () => {
    try {
      const res = await api.get(`/admin/events/${id}`);
      setEvent(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load event' });
    }
  };

  const searchParticipants = async (searchQuery, currentFilters) => {
    try {
      setIsSearching(true);
      const params = new URLSearchParams({ q: searchQuery });
      if (currentFilters.industry) params.append('industry', currentFilters.industry);
      if (currentFilters.city) params.append('city', currentFilters.city);
      const res = await api.get(`/admin/events/${id}/invite/search?${params.toString()}`);
      setParticipants(res || []);
    } catch (err) {
      addToast({ type: 'error', title: 'Search Failed', message: err.message });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (participantId) => {
    try {
      setInvitingIds(prev => new Set(prev).add(participantId));
      await api.post(`/admin/events/${id}/invite`, { participantId });
      setInvitedIds(prev => new Set(prev).add(participantId));
      addToast({ type: 'success', title: 'Invite Sent', message: 'Invitation email dispatched.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to Invite', message: err.message });
    } finally {
      setInvitingIds(prev => { const s = new Set(prev); s.delete(participantId); return s; });
    }
  };

  const handleBulkInvite = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsBulkInviting(true);
      const idsArray = Array.from(selectedIds);
      const res = await api.post(`/admin/events/${id}/invite/bulk`, { participantIds: idsArray });
      setInvitedIds(prev => { const s = new Set(prev); idsArray.forEach(i => s.add(i)); return s; });
      addToast({ type: 'success', title: 'Bulk Invites Sent', message: `Dispatched ${res.count} invitations.` });
      setSelectedIds(new Set());
    } catch (err) {
      addToast({ type: 'error', title: 'Bulk Invite Failed', message: err.message });
    } finally {
      setIsBulkInviting(false);
    }
  };

  const toggleSelectRow = (pid) => {
    setSelectedIds(prev => { const s = new Set(prev); s.has(pid) ? s.delete(pid) : s.add(pid); return s; });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === participants.length ? new Set() : new Set(participants.map(p => p.id)));
  };

  const clearFilters = () => setFilters({ industry: '', city: '' });
  const hasActiveFilters = filters.industry || filters.city;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/events/${id}`)}
          className="p-2 -ml-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white uppercase">Invite Participants</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Global database search for <span className="font-bold text-neutral-700 dark:text-neutral-300">{event?.title}</span>
          </p>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white dark:bg-neutral-800 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark">
        <div className="p-4 flex items-center gap-3">
          {/* Search box */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, email, company, job title, city, or any survey answer…"
              className="w-full pl-9 pr-4 py-2 text-sm border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold focus:border-primary-500 dark:focus:border-primary-500 outline-none transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md border-2 font-bold transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-400'
                : 'bg-white dark:bg-neutral-800 border-neutral-900 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-primary-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                {[filters.industry, filters.city].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Bulk invite button */}
          {selectedIds.size > 0 && (
            <Button icon={Mail} onClick={handleBulkInvite} isLoading={isBulkInviting}>
              Invite Selected ({selectedIds.size})
            </Button>
          )}

          {/* Result count / loading */}
          <span className="text-xs text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
            {isSearching ? 'Searching…' : `${participants.length} result${participants.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Filter drawer */}
        {showFilters && (
          <div className="px-4 pb-4 pt-0 border-t-2 border-neutral-900 dark:border-neutral-700">
            <div className="pt-4 flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-1.5">
                  Industry
                </label>
                <input
                  type="text"
                  placeholder="e.g. online shop, Technology, Healthcare…"
                  value={filters.industry}
                  onChange={e => setFilters(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold focus:border-primary-500 dark:focus:border-primary-500 outline-none"
                />
                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Matches the "Industry" column from the global address book.</p>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider mb-1.5">
                  City / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, Jakarta, Tokyo…"
                  value={filters.city}
                  onChange={e => setFilters(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border-2 border-neutral-900 dark:border-neutral-500 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold focus:border-primary-500 dark:focus:border-primary-500 outline-none"
                />
                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Matches the "City" column from the global address book.</p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mb-6 px-3 py-2 text-sm text-danger-600 dark:text-danger-400 hover:text-danger-800 dark:hover:text-danger-300 hover:bg-danger-50 dark:hover:bg-danger-900/30 rounded-md transition-colors whitespace-nowrap font-bold"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap -mt-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Active filters:</span>
          {filters.industry && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-md text-xs font-bold border-2 border-primary-300 dark:border-primary-600">
              Industry: {filters.industry}
              <button onClick={() => setFilters(prev => ({ ...prev, industry: '' }))} className="hover:text-primary-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.city && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-md text-xs font-bold border-2 border-primary-300 dark:border-primary-600">
              City: {filters.city}
              <button onClick={() => setFilters(prev => ({ ...prev, city: '' }))} className="hover:text-primary-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Spreadsheet table */}
      <div className="w-full overflow-x-auto bg-white dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 rounded-md shadow-brutal dark:shadow-brutal-dark">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-neutral-50 dark:bg-neutral-900 border-b-2 border-neutral-900 dark:border-neutral-700">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  className="rounded border-neutral-900 dark:border-neutral-500 text-primary-600 dark:text-primary-500"
                  checked={participants.length > 0 && selectedIds.size === participants.length}
                  onChange={toggleSelectAll}
                />
              </th>
              {['Name', 'Email', 'Company', 'Job Title', 'Industry', 'City'].map(col => (
                <th key={col} className="px-3 py-3 font-black text-xs text-neutral-900 dark:text-white uppercase tracking-wider min-w-[110px]">
                  {col}
                </th>
              ))}
              <th className="px-4 py-3 font-black text-xs text-neutral-900 dark:text-white uppercase tracking-wider text-right w-36">
                Action
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y-2 divide-neutral-900 dark:divide-neutral-700 transition-opacity duration-200 ${isSearching && participants.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
            {isSearching && participants.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-inv-${i}`}>
                  <td className="px-4 py-2.5 align-middle"><Skeleton className="h-4 w-4" /></td>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5 align-middle">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                  <td className="px-4 py-2.5 align-middle text-right w-36">
                    <Skeleton className="h-8 w-20 inline-block" />
                  </td>
                </tr>
              ))
            ) : participants.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-neutral-400 dark:text-neutral-500">
                  <Search className="w-8 h-8 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                  <p>No participants found.</p>
                  <p className="text-xs mt-1">Try a different search term or clear your filters.</p>
                </td>
              </tr>
            ) : (
              participants.map(p => {
                const alreadySent = invitedIds.has(p.id);
                const isInviting = invitingIds.has(p.id);
                const isSelected = selectedIds.has(p.id);

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${isSelected ? 'bg-primary-50/60 dark:bg-primary-900/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'}`}
                  >
                    <td className="px-4 py-2.5 align-middle">
                      <input
                        type="checkbox"
                        className="rounded border-neutral-900 dark:border-neutral-500 text-primary-600 dark:text-primary-500"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(p.id)}
                      />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <p className="font-bold text-neutral-900 dark:text-white truncate max-w-[150px]">{p.name}</p>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs truncate max-w-[160px]">{p.email}</p>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-neutral-700 dark:text-neutral-300 truncate max-w-[130px]">{p.company || <span className="text-neutral-300 dark:text-neutral-600">—</span>}</td>
                    <td className="px-3 py-2.5 align-middle text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">{p.jobTitle || <span className="text-neutral-300 dark:text-neutral-600">—</span>}</td>
                    <td className="px-3 py-2.5 align-middle">
                      {p.industry ? (
                        <span className="inline-block px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-md text-xs truncate max-w-[110px]">{p.industry}</span>
                      ) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      {p.city ? (
                        <span className="inline-block px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-md text-xs">{p.city}</span>
                      ) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 align-middle text-right">
                      {alreadySent ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/30 rounded-md border-2 border-success-200 dark:border-success-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Sent
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInvite(p.id)}
                          disabled={isInviting}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-700 dark:text-primary-400 bg-white dark:bg-neutral-800 border-2 border-primary-300 dark:border-primary-600 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/30 disabled:opacity-50 transition-colors"
                        >
                          {isInviting ? (
                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                          {isInviting ? 'Sending…' : 'Send Invite'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
