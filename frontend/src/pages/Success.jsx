import { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { pollBookingStatus, resetBookingStatus } from '../store/slices/bookingsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ShieldCheck, Download, Sparkles, ArrowRight } from 'lucide-react';
import { bookingService } from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const Success = () => {
  const { bookingId } = useParams();
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
    return () => clearInterval(interval);
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
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {(status === 'processing' || status === 'idle') && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md">
            <Card className="p-8 sm:p-12 text-center space-y-8">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
              <h1 className="text-3xl font-medium text-white tracking-tight">Validating Experience</h1>
              <p className="text-white/40 text-sm leading-relaxed">Securing your spot in the global inventory...</p>
              <div className="p-4 rounded-xl liquid-glass text-white/30 font-mono text-[10px] tracking-widest">
                TX_ID: {bookingId.toUpperCase()}
              </div>
            </Card>
          </motion.div>
        )}

        {status === 'failed' && (
          <motion.div key="failed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
            <Card className="p-8 sm:p-12 text-center space-y-8">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
                <XCircle size={32} />
              </div>
              <h1 className="text-3xl font-medium text-white tracking-tight">Reservation Failed</h1>
              <p className="text-red-500/80 text-sm p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                {error || 'The inventory lock expired. Please try again.'}
              </p>
              <div className="flex gap-4">
                 <Button variant="secondary" onClick={() => navigate('/')} className="flex-1">Home</Button>
                 <Button onClick={() => window.history.back()} className="flex-1">Retry</Button>
              </div>
            </Card>
          </motion.div>
        )}

        {status === 'completed' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl">
            <Card className="p-8 sm:p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                 <Sparkles size={120} className="text-white" />
              </div>
              
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-10 text-black shadow-2xl shadow-white/10">
                <CheckCircle size={40} />
              </div>
              
              <h1 className="text-5xl font-medium text-white tracking-tight mb-4 italic">Success</h1>
              <p className="text-white/50 text-lg mb-12">
                Your spot is confirmed. Welcome to the inner circle.
              </p>

              {/* Digital Pass Visual */}
              <div className="bg-white text-black rounded-[2.5rem] overflow-hidden mb-12 text-left">
                <div className="p-8 border-b-2 border-dashed border-black/10 relative">
                   <div className="absolute top-1/2 -left-4 w-8 h-8 bg-[#0a0a0a] rounded-full -translate-y-1/2" />
                   <div className="absolute top-1/2 -right-4 w-8 h-8 bg-[#0a0a0a] rounded-full -translate-y-1/2" />
                   
                   <div className="flex justify-between items-start mb-8">
                      <div>
                         <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Entry Pass</span>
                         <div className="text-lg font-bold font-mono uppercase mt-1">{currentBookingId?.slice(-8)}</div>
                      </div>
                      <Badge variant="primary" className="bg-black text-white px-4">VERIFIED</Badge>
                   </div>

                   <div>
                      <span className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Reserved Seats</span>
                      <div className="text-3xl font-medium tracking-tighter mt-1 italic uppercase">{seats || 'Open Access'}</div>
                   </div>
                </div>

                <div className="p-8 bg-black/[0.02] flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <ShieldCheck size={18} className="text-emerald-500" />
                      <span className="text-xs font-bold text-black/60">Encrypted Pass Issued</span>
                   </div>
                   <div className="w-12 h-12 bg-white border border-black/5 rounded-xl grid grid-cols-4 gap-0.5 p-1.5 opacity-60">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-black' : 'bg-transparent'}`} />
                      ))}
                   </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleDownload} disabled={downloading} className="flex-1">
                  <Download size={18} className="mr-2" /> {downloading ? 'Syncing...' : 'Get Pass'}
                </Button>
                <Button variant="secondary" onClick={() => navigate('/')} className="flex-1">
                  Discover More <ArrowRight size={18} className="ml-2" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Success;
