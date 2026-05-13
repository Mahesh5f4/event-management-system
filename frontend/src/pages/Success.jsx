import { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { pollBookingStatus, resetBookingStatus } from '../store/slices/bookingsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Ticket, Calendar, XCircle, Loader, ShieldCheck, Download, Sparkles, ArrowRight, Share2 } from 'lucide-react';
import { bookingService } from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const Success = () => {
  const { bookingId } = useParams(); // correlationId
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const seats = queryParams.get('seats');
  
  const dispatch = useAppDispatch();
  const { bookingStatus: status, currentBookingId, error } = useAppSelector(state => state.bookings);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let interval;
    if (status === 'processing' || status === 'idle') {
      interval = setInterval(() => {
        dispatch(pollBookingStatus(bookingId));
      }, 2000);
    }
    return () => {
      clearInterval(interval);
    };
  }, [bookingId, status, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(resetBookingStatus());
    };
  }, [dispatch]);

  const handleDownload = async () => {
    if (!currentBookingId) return;
    setDownloading(true);
    try {
      const response = await bookingService.downloadTicket(currentBookingId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${currentBookingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-primary/10 blur-[120px] rounded-full -z-10" />

      <AnimatePresence mode="wait">
        {(status === 'processing' || status === 'idle') && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-lg"
          >
            <Card className="p-12 text-center border-white/5 bg-surface/60 backdrop-blur-3xl" hover={false}>
              <div className="loader mx-auto mb-10"></div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-4">Securing Your <span className="text-gradient">Experience</span></h1>
              <p className="text-slate-400 font-medium leading-relaxed mb-10">We are validating your reservation with the global inventory. This typically takes less than 5 seconds.</p>
              
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 text-slate-500 font-mono text-xs">
                <ShieldCheck size={16} className="text-primary" />
                QUEUE_REF: {bookingId.slice(0, 12).toUpperCase()}
              </div>
            </Card>
          </motion.div>
        )}

        {status === 'failed' && (
          <motion.div 
            key="failed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg"
          >
            <Card className="p-12 text-center border-white/5 bg-surface/60 backdrop-blur-3xl" hover={false}>
              <div className="w-20 h-20 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-8 border border-danger/20">
                <XCircle size={40} />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-4">Reservation Failed</h1>
              <p className="text-danger font-bold mb-10 leading-relaxed bg-danger/5 p-4 rounded-2xl border border-danger/10">
                {error || 'The inventory lock expired before payment was completed. Please try selecting different seats.'}
              </p>
              <div className="flex gap-4">
                 <Button variant="outline" onClick={() => navigate('/')} className="flex-1">Back to Events</Button>
                 <Button onClick={() => window.history.back()} className="flex-1">Retry Selection</Button>
              </div>
            </Card>
          </motion.div>
        )}

        {status === 'completed' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="w-full max-w-xl"
          >
            <Card className="p-12 text-center border-white/5 bg-surface/60 backdrop-blur-3xl relative overflow-hidden" hover={false}>
              {/* Confetti-like decor */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 blur-[60px] rounded-full -z-10" />
              
              <motion.div 
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 150, delay: 0.2 }}
                className="w-24 h-24 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-accent shadow-2xl shadow-accent/20 border-2 border-accent/30"
              >
                <CheckCircle size={48} />
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 italic uppercase">Success!</h1>
              <p className="text-slate-400 font-medium text-lg leading-relaxed mb-12">
                Your spot is confirmed. Welcome to the inner circle of the world's most iconic events.
              </p>

              {/* High-End Digital Pass */}
              <div className="relative mb-12 group cursor-pointer">
                 <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-[36px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                 <div className="relative bg-white text-slate-900 rounded-[32px] overflow-hidden">
                    {/* Top Section */}
                    <div className="p-8 pb-6 text-left border-b-2 border-dashed border-slate-200 relative">
                       <div className="absolute top-1/2 -left-4 w-8 h-8 bg-surface rounded-full -translate-y-1/2 z-10" />
                       <div className="absolute top-1/2 -right-4 w-8 h-8 bg-surface rounded-full -translate-y-1/2 z-10" />
                       
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry Pass No.</span>
                             <p className="text-lg font-black font-mono leading-none">{currentBookingId?.slice(-8).toUpperCase()}</p>
                          </div>
                          <Badge className="bg-slate-900 text-white border-transparent py-1.5 px-4 font-black text-[10px]">VERIFIED</Badge>
                       </div>

                       <div className="space-y-4">
                          <div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reserved Seats</span>
                             <p className="text-2xl font-black tracking-tight">{seats || 'All-Access'}</p>
                          </div>
                       </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="p-8 bg-slate-50 flex items-center justify-between">
                       <div className="text-left">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Signature</span>
                          <div className="mt-2 flex items-center gap-2">
                             <ShieldCheck size={16} className="text-emerald-500" />
                             <span className="text-xs font-bold text-slate-600">Encrypted Pass</span>
                          </div>
                       </div>
                       
                       {/* Abstract QR Code */}
                       <div className="w-16 h-16 bg-white p-2 rounded-xl border border-slate-200 grid grid-cols-5 gap-0.5">
                          {Array.from({ length: 25 }).map((_, i) => (
                            <div key={i} className={`rounded-[1px] ${Math.random() > 0.4 ? 'bg-slate-900' : 'bg-transparent'}`} />
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleDownload} 
                  disabled={downloading}
                  className="flex-1 py-4 text-lg"
                >
                  <Download size={20} className="mr-2" /> {downloading ? 'Syncing...' : 'Get Pass'}
                </Button>
                <Link to="/" className="flex-1">
                  <Button variant="outline" className="w-full py-4 text-lg">
                    Discover More <ArrowRight size={20} className="ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center gap-6">
                 <button className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <Share2 size={16} /> Share Achievement
                 </button>
                 <div className="w-1 h-1 rounded-full bg-slate-800" />
                 <button className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <Sparkles size={16} /> Rate Experience
                 </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Success;
