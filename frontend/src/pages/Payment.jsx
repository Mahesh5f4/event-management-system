import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEventById } from '../store/slices/eventsSlice';
import { paymentService, seatLockService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ArrowRight, Lock, CreditCard, CheckCircle,
  AlertCircle, Loader2, Wallet, Banknote, X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

// ─── Load Razorpay Checkout Script ────────────────────────────
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ─── Payment Step States ──────────────────────────────────────
const STEP = {
  SUMMARY:    'summary',    // Order summary before payment
  PROCESSING: 'processing', // Creating order / Loading Razorpay
  PAYING:     'paying',     // Razorpay modal is open
  VERIFYING:  'verifying',  // Backend signature verification
  SUCCESS:    'success',    // Payment confirmed
  FAILED:     'failed',     // Payment failed
};

const Payment = () => {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentEvent: event } = useAppSelector(state => state.events);
  const { user } = useAppSelector(state => state.auth);
  const [step, setStep] = useState(STEP.SUMMARY);
  const [errorMsg, setErrorMsg] = useState('');
  const razorpayRef = useRef(null);
  const seatsReleasedRef = useRef(false);

  const queryParams = new URLSearchParams(location.search);
  const ticketCount = parseInt(queryParams.get('tickets')) || 1;
  const seats = queryParams.get('seats') || 'Any';
  const seatList = seats !== 'Any' ? seats.split(',') : [];

  // Fetch event data if missing or cleared by previous page's cleanup
  useEffect(() => {
    if (!event || event.id !== parseInt(eventId)) {
      dispatch(fetchEventById(eventId));
    }
  }, [eventId, event?.id, dispatch]);

  // Handle page lifecycle and seat locks
  useEffect(() => {
    // Pre-load Razorpay script in background
    loadRazorpayScript();

    return () => {
      // Release seat locks on unmount if payment didn't succeed
      if (!seatsReleasedRef.current && seatList.length > 0) {
        seatLockService.unlockMultiple(eventId, seatList).catch(() => {});
      }
      if (razorpayRef.current) {
        try { razorpayRef.current.close(); } catch (_) {}
      }
    };
  }, [eventId]);

  const releaseSeatLocks = useCallback(async () => {
    if (!seatsReleasedRef.current && seatList.length > 0) {
      seatsReleasedRef.current = true;
      await seatLockService.unlockMultiple(eventId, seatList).catch(() => {});
    }
  }, [eventId, seatList]);

  // ─── Main Payment Handler ─────────────────────────────────
  const handlePayment = async () => {
    setStep(STEP.PROCESSING);
    setErrorMsg('');

    // Step 1: Load Razorpay script
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      setErrorMsg('Payment gateway unavailable. Please check your internet connection.');
      setStep(STEP.FAILED);
      return;
    }

    // Step 2: Create Razorpay order on backend
    let orderData;
    try {
      const response = await paymentService.createOrder({
        eventId: parseInt(eventId),
        ticketCount,
        seats: seatList,
      });
      orderData = response.data.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create payment order. Please try again.';
      setErrorMsg(msg);
      setStep(STEP.FAILED);
      return;
    }

    // Step 3: Launch Razorpay Checkout modal
    setStep(STEP.PAYING);

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'EventHub',
      description: orderData.eventTitle || 'Event Ticket',
      order_id: orderData.razorpayOrderId,
      prefill: {
        name: orderData.userName || '',
        email: orderData.userEmail || user?.email || '',
      },
      theme: {
        color: '#ffffff',
        backdrop_color: 'rgba(0,0,0,0.8)',
      },
      modal: {
        backdropclose: false,
        escape: false,
        handleback: true,
        ondismiss: () => {
          setErrorMsg('Payment cancelled. Your seat reservation is still held for a short time. You can retry.');
          setStep(STEP.FAILED);
        },
      },
      // Step 4: On payment success — verify signature on backend
      handler: async (response) => {
        setStep(STEP.VERIFYING);
        try {
          const verifyResponse = await paymentService.verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          const booking = verifyResponse.data.data;
          seatsReleasedRef.current = true; // Seats released by backend on confirmation
          setStep(STEP.SUCCESS);
          // Brief success flash before navigation
          setTimeout(() => {
            navigate(`/success/${booking.bookingId || booking.id}?seats=${seats}`);
          }, 1200);
        } catch (err) {
          const msg = err.response?.data?.message || 'Payment verification failed. Please contact support.';
          setErrorMsg(msg);
          setStep(STEP.FAILED);
        }
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      razorpayRef.current = rzp;

      rzp.on('payment.failed', (response) => {
        console.error('Razorpay payment failed:', response.error);
        setErrorMsg(
          response.error?.description ||
          'Payment was declined. Please try a different payment method.'
        );
        setStep(STEP.FAILED);
      });

      rzp.open();
    } catch (err) {
      setErrorMsg('Failed to open payment gateway. Please try again.');
      setStep(STEP.FAILED);
    }
  };

  if (!event) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      <p className="text-white/40 text-sm font-medium">Securing gateway...</p>
    </div>
  );

  const totalAmount = event.price * ticketCount;
  const convenienceFee = 150;
  const grandTotal = totalAmount + convenienceFee;

  return (
    <div className="container mx-auto px-6 py-20 max-w-xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-10 md:p-12 relative overflow-hidden">

          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black mx-auto mb-6 shadow-xl shadow-white/5">
              <Lock size={32} />
            </div>
            <h1 className="text-4xl font-medium text-white tracking-tight mb-2">Checkout</h1>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Fast &amp; secure payment</p>
          </div>

          <AnimatePresence mode="wait">

            {/* SUMMARY — default view */}
            {step === STEP.SUMMARY && (
              <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="space-y-8 mb-12">
                  {/* Order Summary */}
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

                      {seatList.length > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Seats</span>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {seatList.map(s => (
                              <Badge key={s} variant="primary" className="text-[9px]">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Processing Fee</span>
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

                  {/* Payment Methods Info */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex gap-2 text-white/40">
                      <CreditCard size={18} />
                      <Wallet size={18} />
                      <Banknote size={18} />
                    </div>
                    <div>
                      <div className="text-white text-xs font-medium">All Payment Methods Accepted</div>
                      <p className="text-white/40 text-[10px] uppercase tracking-widest">Cards • UPI • NetBanking • Wallets</p>
                    </div>
                  </div>

                  <Button
                    onClick={handlePayment}
                    className="w-full py-5 text-lg"
                    id="pay-now-btn"
                  >
                    Pay ₹{grandTotal.toLocaleString('en-IN')} Securely
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-col items-center gap-3 pt-8 border-t border-white/5">
                  <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    <ShieldCheck size={14} />
                    <span>256-bit SSL • PCI-DSS Level 1 • Razorpay Secured</span>
                  </div>
                  <p className="text-[10px] text-white/20 text-center">
                    Powered by Razorpay Test Mode. Use test card: 4111 1111 1111 1111
                  </p>
                </div>
              </motion.div>
            )}

            {/* PROCESSING */}
            {step === STEP.PROCESSING && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-16 text-center space-y-6">
                <div className="w-16 h-16 mx-auto flex items-center justify-center">
                  <Loader2 size={40} className="text-white animate-spin" />
                </div>
                <h2 className="text-2xl font-medium text-white tracking-tight">Preparing Payment</h2>
                <p className="text-white/40 text-sm">Securing your order with Razorpay...</p>
              </motion.div>
            )}

            {/* PAYING */}
            {step === STEP.PAYING && (
              <motion.div key="paying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-16 text-center space-y-6">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                  <CreditCard size={32} className="text-white animate-pulse" />
                </div>
                <h2 className="text-2xl font-medium text-white tracking-tight">Complete Your Payment</h2>
                <p className="text-white/40 text-sm leading-relaxed">
                  The Razorpay payment window is open.<br/>
                  Complete your payment to confirm your booking.
                </p>
                <div className="p-3 rounded-xl liquid-glass text-white/30 font-mono text-[10px] tracking-widest">
                  Test Card: 4111 1111 1111 1111 • CVV: 123
                </div>
              </motion.div>
            )}

            {/* VERIFYING */}
            {step === STEP.VERIFYING && (
              <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-16 text-center space-y-6">
                <div className="w-16 h-16 mx-auto flex items-center justify-center">
                  <Loader2 size={40} className="text-white animate-spin" />
                </div>
                <h2 className="text-2xl font-medium text-white tracking-tight">Verifying Payment</h2>
                <p className="text-white/40 text-sm">Confirming payment with our server...</p>
              </motion.div>
            )}

            {/* SUCCESS */}
            {step === STEP.SUCCESS && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="py-16 text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-medium text-white tracking-tight">Payment Confirmed!</h2>
                <p className="text-white/40 text-sm">Redirecting to your booking...</p>
              </motion.div>
            )}

            {/* FAILED */}
            {step === STEP.FAILED && (
              <motion.div key="failed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="space-y-6">
                <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-4">
                  <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-red-400 font-medium text-sm mb-1">Payment Failed</div>
                    <p className="text-red-400/70 text-[11px] leading-relaxed">{errorMsg}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button onClick={handlePayment} className="w-full py-5">
                    Try Again <ArrowRight size={18} className="ml-2" />
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(-1)} className="w-full">
                    Go Back
                  </Button>
                </div>

                <p className="text-[10px] text-white/20 text-center">
                  Your seat reservation may still be held. Try again or contact support.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};

export default Payment;
