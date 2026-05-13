import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEvents, deleteEvent, setSearchTerm } from '../store/slices/eventsSlice';
import { eventService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Plus, Calendar, MapPin, Users, DollarSign, Search, X, Check, AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, BarChart3, Filter, MoreHorizontal, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

const AdminDashboard = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items: events, loading, searchTerm, pagination } = useAppSelector(state => state.events);
  const { currentPage, totalPages } = pagination;
  const [pageSize] = useState(10);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    dispatch(fetchEvents({ page: 0, size: pageSize }));
  }, [dispatch, pageSize]);

  const handlePageChange = (newPage) => {
    dispatch(fetchEvents({ page: newPage, size: pageSize }));
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;
    try {
      const resultAction = await dispatch(deleteEvent(eventToDelete.id));
      if (deleteEvent.fulfilled.match(resultAction)) {
        setIsDeleteConfirmOpen(false);
        dispatch(fetchEvents({ page: currentPage, size: pageSize }));
        setStatus({ type: 'success', message: 'Event deleted successfully' });
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete event' });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await eventService.update(selectedEvent.id, {
        ...selectedEvent,
        price: parseFloat(selectedEvent.price),
        totalSeats: parseInt(selectedEvent.totalSeats)
      });
      setIsEditModalOpen(false);
      dispatch(fetchEvents({ page: currentPage, size: pageSize }));
      setStatus({ type: 'success', message: 'Event updated successfully' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to update event' });
    }
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && events.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="loader"></div>
      <p className="text-slate-400 font-medium animate-pulse">Loading dashboard...</p>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-xl shadow-primary/10 border border-primary/20">
              <LayoutDashboard size={32} />
           </div>
           <div>
              <h1 className="text-4xl font-black text-white tracking-tight">Admin <span className="text-gradient">Console</span></h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-slate-500 font-medium text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Management Mode Active
                </span>
              </div>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/analytics')}
            className="gap-2"
          >
            <BarChart3 size={18} /> Analytics
          </Button>
          <Button 
            onClick={() => navigate('/create-event')}
            className="gap-2"
          >
            <Plus size={18} /> Create New Event
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Total Events', value: events.length, icon: Calendar, color: 'text-primary' },
          { label: 'Avg Attendance', value: '84%', icon: Users, color: 'text-secondary' },
          { label: 'Monthly Revenue', value: '₹14.2k', icon: DollarSign, color: 'text-accent' },
          { label: 'System Health', value: 'Optimal', icon: Check, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <Card key={i} className="flex flex-col gap-1 p-6 bg-white/[0.02] border-white/5" hover={false}>
            <div className={`p-2 rounded-lg bg-white/5 w-fit ${stat.color} mb-3`}>
              <stat.icon size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">{stat.label}</span>
            <span className="text-2xl font-black text-white tracking-tight">{stat.value}</span>
          </Card>
        ))}
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {status.message && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className={`overflow-hidden`}
          >
            <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
              status.type === 'success' 
                ? 'bg-accent/10 border-accent/20 text-accent' 
                : 'bg-danger/10 border-danger/20 text-danger'
            }`}>
              {status.type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
              <span className="font-bold">{status.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
        <div className="w-full md:flex-1">
          <Input 
            icon={Search}
            placeholder="Search events by title or location..."
            value={searchTerm}
            onChange={(e) => dispatch(setSearchTerm(e.target.value))}
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Button variant="outline" size="sm" className="gap-2 flex-1 md:flex-none">
            <Filter size={16} /> Filters
          </Button>
          <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
            Showing <span className="text-white font-bold">{filteredEvents.length}</span> entries
          </div>
        </div>
      </div>

      {/* Table Container */}
      <Card className="p-0 overflow-hidden border-white/5 bg-surface/40" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">Event Details</th>
                <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">Schedule</th>
                <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event, index) => (
                <motion.tr 
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden border border-white/5 shadow-lg">
                        <img 
                          src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=200'} 
                          className="w-full h-full object-cover"
                          alt={event.title}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-primary transition-colors">{event.title}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin size={10} className="text-accent" /> {event.location}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm text-slate-300 font-medium">
                      {new Date(event.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                       {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center justify-between gap-8 mb-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {event.availableSeats} / {event.totalSeats} Sold
                          </span>
                          <span className="text-[10px] font-black text-primary uppercase">
                            ₹{event.price}
                          </span>
                       </div>
                       <div className="w-40 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(event.availableSeats / event.totalSeats) * 100}%` }}
                            className="h-full bg-primary"
                          />
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => { setSelectedEvent(event); setIsEditModalOpen(true); }}
                        className="p-2 border-primary/20 text-primary hover:bg-primary/10"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => { setEventToDelete(event); setIsDeleteConfirmOpen(true); }}
                        className="p-2 border-danger/20 text-danger hover:bg-danger/10"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {events.length > 0 && (
        <div className="mt-12 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all shadow-xl"
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="flex gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i)}
                  className={`w-10 h-10 rounded-xl font-bold transition-all ${
                    currentPage === i 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'bg-white/5 text-slate-500 hover:bg-white/10'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-all shadow-xl"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-surface border border-white/10 p-8 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white">Edit <span className="text-gradient">Event</span></h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <Input 
                  label="Event Title"
                  value={selectedEvent.title} 
                  onChange={e => setSelectedEvent({...selectedEvent, title: e.target.value})} 
                  required 
                />
                <Input 
                  label="Location"
                  icon={MapPin}
                  value={selectedEvent.location} 
                  onChange={e => setSelectedEvent({...selectedEvent, location: e.target.value})} 
                  required 
                />
                
                <div className="grid grid-cols-2 gap-6">
                  <Input 
                    label="Price (₹)"
                    type="number" 
                    value={selectedEvent.price} 
                    onChange={e => setSelectedEvent({...selectedEvent, price: e.target.value})} 
                    required 
                  />
                  <Input 
                    label="Total Capacity"
                    type="number" 
                    value={selectedEvent.totalSeats} 
                    onChange={e => setSelectedEvent({...selectedEvent, totalSeats: e.target.value})} 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Input 
                    label="Start Time"
                    type="datetime-local" 
                    value={selectedEvent.startTime?.substring(0, 16)} 
                    onChange={e => setSelectedEvent({...selectedEvent, startTime: e.target.value})} 
                    required 
                  />
                  <Input 
                    label="End Time"
                    type="datetime-local" 
                    value={selectedEvent.endTime?.substring(0, 16)} 
                    onChange={e => setSelectedEvent({...selectedEvent, endTime: e.target.value})} 
                    required 
                  />
                </div>

                <Input 
                  label="Cover Image URL"
                  type="url" 
                  value={selectedEvent.imageUrl} 
                  onChange={e => setSelectedEvent({...selectedEvent, imageUrl: e.target.value})} 
                />

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">Event Description</label>
                  <textarea 
                    className="premium-input min-h-[120px] resize-none"
                    value={selectedEvent.description} 
                    onChange={e => setSelectedEvent({...selectedEvent, description: e.target.value})} 
                    required 
                  />
                </div>

                <div className="flex gap-4 pt-6 border-t border-white/5">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Update Experience
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-surface border border-white/10 p-10 rounded-3xl shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-8 border border-danger/20">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-black text-white mb-4">Confirm Deletion</h3>
              <p className="text-slate-500 mb-10">
                Are you sure you want to permanently remove <strong>{eventToDelete?.title}</strong>? All booking data will be archived.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1"
                >
                  Keep Event
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleDelete}
                  className="flex-1"
                >
                  Yes, Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
