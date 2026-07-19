import { useEffect, useState, useCallback, memo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMyBookings } from '../store/slices/bookingsSlice';
import { bookingService } from '../services/api';
import { Ticket, Calendar, MapPin, ChevronLeft, ChevronRight, Download, CreditCard, Receipt, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';

const BookingCard = memo(({ booking, index, onDownload }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="transform-gpu"
  >
    <Card className="group overflow-hidden p-0 flex flex-col md:flex-row min-h-[220px] transform-gpu">
      <div className="w-full md:w-48 h-32 md:h-auto relative overflow-hidden bg-white/5">
        <img 
          src={booking.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800'} 
          className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity will-change-transform"
          alt={booking.eventTitle}
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Ticket size={32} className="text-white/20" />
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col justify-between">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
              <CreditCard size={12} />
              <span>ID: {booking.bookingId?.toString().substring(0, 8).toUpperCase()}</span>
            </div>
            <h3 className="text-2xl font-medium text-white leading-tight">
              {booking.eventTitle}
            </h3>
          </div>
          <Badge variant="success">Confirmed</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-8 mt-6">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <Calendar size={14} />
            <span>{new Date(booking.eventTime).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
          </div>
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <MapPin size={14} />
            <span className="line-clamp-1">{booking.eventLocation}</span>
          </div>
          {booking.seats && (
            <div className="flex items-center gap-2">
              {booking.seats.map(s => (
                <span key={s} className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-bold">{s}</span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Passes</div>
              <div className="text-white font-medium">{booking.ticketCount}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Value</div>
              <div className="text-white font-medium">₹{(booking.eventPrice * booking.ticketCount).toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => onDownload(booking.bookingId)}
              className="transform-gpu"
            >
              <Download size={16} className="mr-2" /> Download
            </Button>
          </div>
        </div>
      </div>
    </Card>
  </motion.div>
));

BookingCard.displayName = 'BookingCard';

const MyBookings = () => {
  const dispatch = useAppDispatch();
  const { myBookings: bookings, loading, totalPages, currentPage } = useAppSelector(state => state.bookings);
  const [pageSize] = useState(10);

  useEffect(() => {
    dispatch(fetchMyBookings({ page: 0, size: pageSize }));
  }, [dispatch, pageSize]);

  const handlePageChange = useCallback((newPage) => {
    dispatch(fetchMyBookings({ page: newPage, size: pageSize }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dispatch, pageSize]);

  const handleDownload = useCallback(async (bookingId) => {
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
  }, []);

  if (loading && bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 transform-gpu">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
        <p className="text-white/40 text-sm font-medium">Retrieving digital passes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 pt-12 transform-gpu antialiased">
      <div className="container mx-auto px-6 max-w-5xl">
        <header className="mb-16 transform-gpu">
          <h1 className="text-5xl font-medium text-white tracking-tight mb-4">My Library</h1>
          <p className="text-white/40 text-lg">Your secure vault for all confirmed event passes.</p>
        </header>

        {bookings.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-24 border-dashed transform-gpu">
            <Ticket size={48} className="text-white/10 mb-6" />
            <h2 className="text-2xl font-medium text-white mb-2">No active tickets</h2>
            <p className="text-white/40 mb-10 text-center max-w-sm">You haven't secured any passes yet. Ready to experience something iconic?</p>
            <Button onClick={() => window.location.href = '/'}>
              Explore Events <ArrowRight size={18} className="ml-2" />
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-6 transform-gpu">
            <AnimatePresence mode="popLayout">
              {bookings.map((booking, index) => (
                <BookingCard 
                  key={booking.bookingId} 
                  booking={booking} 
                  index={index} 
                  onDownload={handleDownload} 
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-16 flex items-center justify-center gap-4 transform-gpu">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-3 rounded-xl liquid-glass text-white/40 hover:text-white disabled:opacity-20 transition-all transform-gpu"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-bold text-white/20 uppercase tracking-[0.2em]">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="p-3 rounded-xl liquid-glass text-white/40 hover:text-white disabled:opacity-20 transition-all transform-gpu"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(MyBookings);
