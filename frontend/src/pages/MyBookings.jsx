import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMyBookings } from '../store/slices/bookingsSlice';
import { bookingService } from '../services/api';
import { Ticket, Calendar, MapPin, CheckCircle, ChevronLeft, ChevronRight, Download, CreditCard, LayoutGrid, List as ListIcon, Sparkles, Receipt, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const MyBookings = () => {
  const dispatch = useAppDispatch();
  const { myBookings: bookings, loading, totalPages, currentPage } = useAppSelector(state => state.bookings);
  const [pageSize] = useState(10);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  useEffect(() => {
    dispatch(fetchMyBookings({ page: 0, size: pageSize }));
  }, [dispatch, pageSize]);

  const handlePageChange = (newPage) => {
    dispatch(fetchMyBookings({ page: newPage, size: pageSize }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownload = async (bookingId) => {
    try {
      const res = await bookingService.downloadTicket(bookingId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${bookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Download failed. Please try again.');
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium">Retrieving your digital assets...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      <div className="container-custom pt-32">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-indigo-500" />
              <span className="text-indigo-500 font-bold tracking-widest text-[10px] uppercase">My Library</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-none mb-4">
              Access <span className="text-slate-400">Tickets</span>
            </h1>
            <p className="text-slate-500 font-light max-w-md">Your secure vault for all confirmed event admissions and digital passes.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800"
          >
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              <ListIcon size={18} />
            </button>
          </motion.div>
        </div>

        {bookings.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 premium-card border-dashed border-slate-800 bg-slate-950"
          >
            <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-700 mb-8">
              <Ticket size={40} strokeWidth={1} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight text-center">No active tickets</h2>
            <p className="text-slate-500 max-w-sm mb-10 text-center font-light">You haven't secured any passes yet. Ready to experience something iconic?</p>
            <Button className="btn-primary px-10 py-4" onClick={() => window.location.href = '/'}>
              Discover Events <ArrowRight size={18} className="ml-2" />
            </Button>
          </motion.div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-8" : "flex flex-col gap-8"}>
            <AnimatePresence mode="popLayout">
              {bookings.map((booking, index) => (
                <motion.div
                  key={booking.bookingId}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <div className={`group relative premium-card p-0 overflow-hidden ${viewMode === 'list' ? 'flex flex-col md:flex-row min-h-[280px]' : 'h-full flex flex-col'}`}>
                    {/* Visual Asset */}
                    <div className={`${viewMode === 'list' ? 'w-full md:w-64 h-48 md:h-auto' : 'h-48'} relative overflow-hidden shrink-0`}>
                      <img 
                        src={booking.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800'} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-50 group-hover:opacity-70"
                        alt={booking.eventTitle}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-3 shadow-xl">
                          <Ticket size={24} />
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                          Confirmed
                        </span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-8 md:p-10 flex-1 flex flex-col">
                      <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
                        <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                          <CreditCard size={14} className="text-indigo-500" />
                          <span>ID <span className="text-white font-mono">#{booking.bookingId?.toString().substring(0, 8).toUpperCase()}</span></span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 tracking-widest uppercase">
                          <Sparkles size={12} /> Digital Pass
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-indigo-400 transition-colors leading-tight tracking-tight">
                        {booking.eventTitle}
                      </h3>

                      <div className="grid grid-cols-2 gap-6 mb-10">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Date & Time</span>
                          <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
                            <Calendar size={14} className="text-indigo-500" />
                            <span>{booking.eventTime ? new Date(booking.eventTime).toLocaleString('en-IN', { dateStyle: 'medium' }) : 'Pending'}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Venue</span>
                          <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
                            <MapPin size={14} className="text-indigo-500" />
                            <span className="line-clamp-1">{booking.eventLocation}</span>
                          </div>
                        </div>
                      </div>

                      {booking.seats && booking.seats.length > 0 && (
                        <div className="mb-10 p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Allocation</span>
                          <div className="flex gap-1.5">
                            {booking.seats.map(seat => (
                              <span key={seat} className="px-2.5 py-1 bg-slate-800 text-white font-bold rounded-lg text-[10px] border border-slate-700">
                                {seat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-auto pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start">
                          <div>
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Passes</div>
                            <div className="text-lg font-bold text-white tracking-tight">{booking.ticketCount}</div>
                          </div>
                          <div className="w-px h-8 bg-slate-800" />
                          <div>
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total Value</div>
                            <div className="text-lg font-bold text-white tracking-tight">₹{(booking.eventPrice * booking.ticketCount).toLocaleString('en-IN')}</div>
                          </div>
                        </div>

                        <div className="flex gap-3 w-full sm:w-auto">
                          <button 
                            onClick={() => handleDownload(booking.bookingId)}
                            className="flex-1 sm:flex-none p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-all flex items-center justify-center"
                            title="Download Receipt"
                          >
                            <Receipt size={20} />
                          </button>
                          <Button 
                            onClick={() => handleDownload(booking.bookingId)}
                            className="btn-primary flex-1 sm:flex-none px-8 py-3.5 text-sm"
                          >
                            <Download size={18} className="mr-2" /> Download Ticket
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {bookings.length > 0 && (
          <div className="mt-24 flex flex-col items-center gap-8">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">
              Page <span className="text-white">{currentPage + 1}</span> of <span className="text-white">{totalPages || 1}</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-white disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex gap-2.5">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`w-12 h-12 rounded-xl font-bold text-sm transition-all duration-300 ${
                      currentPage === i 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-110' 
                        : 'bg-slate-900 text-slate-500 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-white disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
