import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Eye } from 'lucide-react';
import api from '../../lib/api';
import useAppStore from '../../stores/useAppStore';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export default function ApprovePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useAppStore(state => state.addToast);
  
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING, APPROVED, REJECTED
  
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal State for custom answers
  const [viewAnswersData, setViewAnswersData] = useState(null); // { participant, answers }

  const [showRejectAllModal, setShowRejectAllModal] = useState(false);
  const [isRejectingAll, setIsRejectingAll] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  useEffect(() => {
    fetchRegistrations();
  }, [id, activeTab]);

  const fetchEvent = async () => {
    try {
      const res = await api.get(`/admin/events/${id}`);
      setEvent(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load event' });
    }
  };

  const fetchRegistrations = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/admin/events/${id}/approve?status=${activeTab}`);
      setRegistrations(res);
      setSelectedIds(new Set()); // Reset selections on tab change
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load registrations' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdate = async (status) => {
    if (selectedIds.size === 0) return;
    try {
      setIsUpdating(true);
      await api.put(`/admin/events/${id}/approve`, {
        registrationIds: Array.from(selectedIds),
        status
      });
      
      addToast({ 
        type: 'success', 
        title: 'Success', 
        message: `Successfully marked ${selectedIds.size} as ${status}` 
      });
      
      fetchRegistrations(); // refresh current list
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectAllPending = async () => {
    try {
      setIsRejectingAll(true);
      const res = await api.put(`/admin/events/${id}/reject-all-pending`);
      addToast({ 
        type: 'success', 
        title: 'Success', 
        message: `Successfully rejected ${res.rejectedCount} pending registrations.` 
      });
      setShowRejectAllModal(false);
      fetchRegistrations(); // refresh list
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsRejectingAll(false);
    }
  };

  const toggleSelect = (regId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(regId)) newSet.delete(regId);
      else newSet.add(regId);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === registrations.length && registrations.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(registrations.map(r => r.id)));
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'APPROVED': return <Badge variant="success">Approved</Badge>;
      case 'REJECTED': return <Badge variant="danger">Rejected</Badge>;
      case 'ATTENDED': return <Badge variant="neutral" className="bg-indigo-100 text-indigo-700 border-indigo-200">Attended</Badge>;
      default: return <Badge variant="warning">Pending</Badge>;
    }
  };

  const columns = [
    {
      header: (
        <input 
          type="checkbox" 
          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
          checked={registrations.length > 0 && selectedIds.size === registrations.length}
          onChange={toggleSelectAll}
        />
      ),
      render: (row) => (
        <input 
          type="checkbox" 
          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelect(row.id)}
        />
      ),
      className: "w-12"
    },
    { 
      header: 'Participant', 
      render: (row) => (
        <div>
          <p className="font-black text-neutral-900 dark:text-white">{row.participant?.name}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-bold">{row.participant?.email}</p>
        </div>
      )
    },
    { header: 'Company', render: (row) => row.participant?.company || '-' },
    { header: 'Job Title', render: (row) => row.participant?.jobTitle || '-' },
    { 
      header: 'Answers', 
      render: (row) => {
        const hasAnswers = row.answers && Object.keys(row.answers).length > 0;
        if (!hasAnswers) return <span className="text-neutral-400 text-sm">None</span>;
        
        return (
          <button 
            onClick={() => setViewAnswersData(row)}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <Eye className="w-4 h-4" /> View
          </button>
        );
      }
    },
    { 
      header: 'Status', 
      render: (row) => getStatusBadge(row.status)
    }
  ];

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(`/events/${id}`)}
          className="p-2 -ml-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white uppercase">Approvals</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Review registrations for {event?.title}</p>
        </div>
      </div>
      
      {activeTab === 'PENDING' && (
        <div className="absolute top-0 right-0">
          <Button 
            variant="danger" 
            onClick={() => setShowRejectAllModal(true)}
            icon={XCircle}
          >
            Reject Remaining Pending
          </Button>
        </div>
      )}

      <div className="flex border-b-2 border-neutral-900 dark:border-neutral-700 overflow-x-auto bg-white dark:bg-neutral-800">
        {['PENDING', 'APPROVED', 'REJECTED'].map(tab => (
          <button 
            key={tab}
            className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-black' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-bold'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-md border-2 border-neutral-900 dark:border-neutral-700 shadow-brutal dark:shadow-brutal-dark flex items-center justify-between sticky top-4 z-10 animate-in slide-in-from-top-4">
          <span className="text-sm font-bold text-neutral-900 dark:text-white">
            {selectedIds.size} participant{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" variant="danger" icon={XCircle}
              onClick={() => handleBulkUpdate('REJECTED')}
              isLoading={isUpdating}
            >
              Reject Selected
            </Button>
            <Button 
              size="sm" variant="primary" icon={CheckCircle}
              onClick={() => handleBulkUpdate('APPROVED')}
              isLoading={isUpdating}
            >
              Approve & Send Emails
            </Button>
          </div>
        </div>
      )}

      <Table 
        columns={columns}
        data={registrations}
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        emptyMessage={`No ${activeTab.toLowerCase()} registrations found.`}
      />

      {/* View Answers Modal */}
      <Modal 
        isOpen={!!viewAnswersData} 
        onClose={() => setViewAnswersData(null)}
        title="Survey Answers"
      >
        {viewAnswersData && (
          <div className="space-y-6">
            <div className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-md border-2 border-neutral-900 dark:border-neutral-700">
              <h3 className="text-sm font-black text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">Participant Details</h3>
              <p className="font-black text-neutral-900 dark:text-white">{viewAnswersData.participant.name}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 font-bold">{viewAnswersData.participant.email}</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Custom Questions</h3>
              {Object.entries(viewAnswersData.answers).map(([key, value]) => (
                <div key={key} className="border-b-2 border-neutral-900 dark:border-neutral-700 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-black text-neutral-900 dark:text-white mb-1">{key}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 p-3 rounded-md border-2 border-neutral-900 dark:border-neutral-700 font-bold">
                    {Array.isArray(value) ? value.join(', ') : value}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setViewAnswersData(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject All Modal */}
      <Modal 
        isOpen={showRejectAllModal} 
        onClose={() => !isRejectingAll && setShowRejectAllModal(false)}
        title="Reject All Pending"
      >
        <div className="space-y-6">
          <p className="text-neutral-600 dark:text-neutral-300 font-bold">
            Are you sure you want to reject all remaining <strong className="text-neutral-900 dark:text-white">PENDING</strong> registrations for this event?
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 border-2 border-red-200 dark:border-red-900 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-400 font-bold">
              This action cannot be easily undone. All pending participants will immediately receive a rejection email.
            </p>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowRejectAllModal(false)}
              disabled={isRejectingAll}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleRejectAllPending}
              isLoading={isRejectingAll}
              icon={XCircle}
            >
              Yes, Reject All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
