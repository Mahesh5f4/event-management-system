import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEventById } from '../store/slices/eventsSlice';
import { initiateBooking } from '../store/slices/bookingsSlice';
import { seatLockService } from '../services/api';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Lock, Sparkles, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

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
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      <p className="text-white/40 text-sm font-medium">Securing gateway...</p>
    </div>
  );

  const totalAmount = event.price * ticketCount;
  const convenienceFee = 150;
  const grandTotal = totalAmount + convenienceFee;

  return (
    <div className="container mx-auto px-6 py-20 max-w-xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-10 md:p-12">
          <div className="text-center mb-12">
             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black mx-auto mb-6 shadow-xl shadow-white/5">
                <Lock size={32} />
             </div>
             <h1 className="text-4xl font-medium text-white tracking-tight mb-2">Checkout</h1>
             <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Fast & secure reservation</p>
          </div>

          <div className="space-y-8 mb-12">
            <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-6">
               <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Order Summary</h3>
               
               <div className="space-y-4">
                 <div className="flex justify-between items-start">
                    <div>
                       <div className="text-white font-medium">{event.title}</div>
                       <div className="text-[10px] font-bold text-white/40 uppercase mt-1">{ticketCount} Admission Pass(es)</div>
                    </div>
                    <span className="text-white font-medium">₹{totalAmount.toLocaleString('en-IN')}</span>
                 </div>
                 
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Selected Seats</span>
                    <div className="flex gap-1">
                      {seatList.map(s => (
                        <Badge key={s} variant="primary" className="text-[9px]">{s}</Badge>
                      ))}
                    </div>
                 </div>

                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Processing</span>
                    <span className="text-white/50">₹{convenienceFee}</span>
                 </div>
               </div>

               <div className="pt-6 border-t border-white/5 flex justify-between items-end">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Total Payable</span>
                  <span className="text-4xl font-medium text-white tracking-tighter">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
               </div>
            </div>

            <div className="space-y-6">
               <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white">
                     <CheckCircle size={24} />
                  </div>
                  <div>
                     <div className="text-white font-medium">Instant Delivery</div>
                     <p className="text-white/40 text-[10px] uppercase tracking-widest">Passes will be issued immediately</p>
                  </div>
               </div>

               <Button 
                 onClick={handlePayment}
                 loading={loading}
                 className="w-full py-5 text-lg"
               >
                 Confirm Booking <ArrowRight size={18} className="ml-2" />
               </Button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 pt-10 border-t border-white/5">
             <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck size={14} />
                <span>PCI-DSS Secured Gateway</span>
             </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Payment;
