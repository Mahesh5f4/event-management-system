import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEventById } from '../store/slices/eventsSlice';
import { initiateBooking } from '../store/slices/bookingsSlice';
import { seatLockService } from '../services/api';
import { motion } from 'framer-motion';
import { CreditCard, ShieldCheck, ArrowRight, Loader, Lock, Sparkles, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

const Payment = () => {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { currentEvent: event } = useAppSelector(state => state.events);
  const [loading, setLoading] = useState(false);
  const isPaymentSuccess = useRef(false);

  const queryParams = new URLSearchParams(location.search);
  const ticketCount = parseInt(queryParams.get('tickets')) || 1;
  const seats = queryParams.get('seats') || 'Any';
  const seatList = seats !== 'Any' ? seats.split(',') : [];

  useEffect(() => {
    if (!event || event.id !== parseInt(eventId)) {
      dispatch(fetchEventById(eventId));
    }

    return () => {
      if (!isPaymentSuccess.current && seatList.length > 0) {
        seatLockService.unlockMultiple(eventId, seatList).catch(() => {});
      }
    };
  }, [eventId, dispatch, event, seatList]);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    try {
      const resultAction = await dispatch(initiateBooking({ 
        eventId: parseInt(eventId), 
        ticketCount: ticketCount, 
        seats: seatList 
      }));
      
      if (initiateBooking.fulfilled.match(resultAction)) {
        isPaymentSuccess.current = true;
        navigate(`/success/${resultAction.payload.bookingId}?seats=${seats}`);
      } else {
        alert(resultAction.payload || 'Payment failed');
        setLoading(false);
      }
    } catch (err) {
      alert('An unexpected error occurred');
      setLoading(false);
    }
  };

  if (!event) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="loader"></div>
      <p className="text-slate-400 font-medium animate-pulse">Initializing secure gateway...</p>
    </div>
  );

  const totalAmount = event.price * ticketCount;
  const convenienceFee = 150;
  const grandTotal = totalAmount + convenienceFee;

  return (
    <div className="container mx-auto px-4 py-20 max-w-2xl relative">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-md h-[400px] bg-primary/10 blur-[100px] rounded-full -z-10" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <Card className="p-10 md:p-12 border-white/5 bg-surface/60 backdrop-blur-2xl" hover={false}>
          <div className="text-center mb-12">
             <div className="w-20 h-20 bg-emerald-400/10 rounded-3xl flex items-center justify-center text-emerald-400 mx-auto mb-6 shadow-xl shadow-emerald-400/5 border border-emerald-400/20">
                <Lock size={40} />
             </div>
             <h1 className="text-4xl font-black text-white tracking-tight mb-2">Finalize <span className="text-gradient">Booking</span></h1>
             <p className="text-slate-400 font-medium">Fast, secure, and hassle-free booking experience</p>
          </div>

          <div className="space-y-8 mb-12">
            <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles size={80} />
               </div>
               
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Reservation Summary</h3>
               
               <div className="space-y-4 mb-6">
                 <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="text-white font-bold">{event.title}</span>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">{ticketCount} Admission Pass(es)</span>
                    </div>
                    <span className="text-white font-black italic">₹{totalAmount.toLocaleString('en-IN')}</span>
                 </div>
                 
                 <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Selected Seats</span>
                    <div className="flex gap-1">
                      {seatList.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 text-[10px] font-black border border-white/10">
                          {s}
                        </span>
                      ))}
                    </div>
                 </div>

                 <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Processing Fee</span>
                    <span className="text-slate-400 font-bold">₹{convenienceFee}</span>
                 </div>
               </div>

               <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-[4px]">Total Payable</span>
                  <span className="text-4xl font-black text-white italic tracking-tighter">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
               </div>
            </div>

            <div className="space-y-8">
               <div className="p-8 rounded-[32px] bg-primary/5 border border-primary/10 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                     <CheckCircle size={32} />
                  </div>
                  <div>
                     <h4 className="text-white font-bold text-lg">Express Checkout</h4>
                     <p className="text-slate-400 text-sm">Your booking is ready. Click below to confirm.</p>
                  </div>
               </div>

               <Button 
                 onClick={handlePayment}
                 loading={loading}
                 className="w-full py-6 text-xl tracking-tight shadow-2xl shadow-primary/40"
               >
                 {loading ? 'Processing...' : `Confirm Booking • ₹${grandTotal.toLocaleString('en-IN')}`}
                 {!loading && <ArrowRight className="ml-2" />}
               </Button>
               
               <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-[2px]">
                 By clicking confirm, you agree to the event terms and conditions.
               </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 pt-10 border-t border-white/5">
             <div className="flex items-center gap-3 px-6 py-2 rounded-2xl bg-emerald-400/5 text-emerald-400 border border-emerald-400/10">
                <ShieldCheck size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">PCI-DSS Compliant Gateway</span>
             </div>
             
             <div className="flex items-center gap-8 opacity-20 grayscale hover:grayscale-0 transition-all cursor-pointer">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-5" />
             </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Payment;
