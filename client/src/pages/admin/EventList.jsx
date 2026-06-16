import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../../lib/api';
import useAppStore from '../../stores/useAppStore';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const addToast = useAppStore(state => state.addToast);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/events');
      setEvents(res);
    } catch (err) {
      addToast({ type: 'error', title: 'Error loading events', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      DRAFT: 'neutral',
      OPEN: 'success',
      CLOSED: 'warning',
      DONE: 'primary'
    };
    return <Badge variant={map[status] || 'neutral'}>{status}</Badge>;
  };

  const columns = [
    { header: 'Title', accessorKey: 'title', className: 'w-1/3' },
    { 
      header: 'Date', 
      render: (row) => new Date(row.date).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
      }) 
    },
    { 
      header: 'Status', 
      render: (row) => statusBadge(row.status)
    },
    { 
      header: 'Registered', 
      render: (row) => `${row._count?.registrations || 0} / ${row.capacity === 0 ? 'Unlimited' : row.capacity}`
    },
    {
      header: '',
      className: 'w-16 text-right',
      render: (row) => (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (row._count?.registrations > 0) {
              addToast({ type: 'error', title: 'Action Blocked', message: `Cannot delete event: There are ${row._count.registrations} participants registered.` });
              return;
            }
            if (window.confirm(`Are you sure you want to completely delete the event "${row.title}"?`)) {
              // Optimistic UI update
              const originalEvents = [...events];
              setEvents(prev => prev.filter(e => e.id !== row.id));
              
              try {
                await api.delete(`/admin/events/${row.id}`);
                addToast({ type: 'success', title: 'Deleted', message: 'Event deleted successfully.' });
              } catch (err) {
                // Revert on error
                setEvents(originalEvents);
                addToast({ type: 'error', title: 'Error', message: err.message });
              }
            }
          }}
          className="p-2 text-danger hover:bg-danger-50 rounded-md transition-colors"
          title="Delete Event"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Events</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your events and view registration metrics.
          </p>
        </div>
        <Button onClick={() => navigate('/events/new')} icon={Plus}>
          New Event
        </Button>
      </div>

      <Table 
        columns={columns}
        data={events}
        isLoading={isLoading}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(`/events/${row.id}`)}
        emptyMessage="No events found. Click 'New Event' to create one."
      />
    </div>
  );
}
