import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEventById, clearCurrentEvent } from '../store/slices/eventsSlice';
import { bookingService, seatLockService } from '../services/api';
import { MapPin, Calendar, Clock, Ticket, AlertCircle, CheckCircle, ArrowLeft, ShieldCheck, Zap, ArrowRight, Share2, Info, ChevronRight, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { user } = useAppSelector(state => state.auth);
  const { currentEvent: event, loading } = useAppSelector(state => state.events);
  
  const [step, setStep] = useState('details'); // details, quantity, seats
  const [ticketQuantity, setTicketQuantity] = useState(2);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [lockedByOthers, setLockedByOthers] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const isProceedingToCheckout = useRef(false);

  useEffect(() => {
    let timer;
    if (step === 'seats' && selectedSeats.length > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, selectedSeats]);

  useEffect(() => {
    dispatch(fetchEventById(id));
    
    const fetchSeatData = async () => {
      try {
        const [lockedResp, bookedResp] = await Promise.all([
          seatLockService.getLocked(id),
          bookingService.getBookedSeats(id)
        ]);
        setLockedByOthers(lockedResp.data.data.filter(s => !selectedSeats.includes(s)));
        setBookedSeats(bookedResp.data.data);
      } catch (err) {
        console.error('Error fetching seat data:', err);
      }
    };
    fetchSeatData();

    // WebSocket Connection
    const stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-booking'),
      onConnect: () => {
        if (user) {
          stompClient.publish({
            destination: `/app/register/${id}/${user.email}`
          });
        }
        stompClient.subscribe(`/topic/event/${id}/seats`, (message) => {
          const updatedLockedSeats = JSON.parse(message.body);
          setLockedByOthers(updatedLockedSeats.filter(s => !selectedSeats.includes(s)));
        });
      },
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate();
      dispatch(clearCurrentEvent());
      if (!isProceedingToCheckout.current && selectedSeats.length > 0) {
        seatLockService.unlockMultiple(id, selectedSeats).catch(() => {});
      }
    };
  }, [id, selectedSeats, user, dispatch]);

  const handleBook = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (selectedSeats.length === 0) {
      return;
    }
    isProceedingToCheckout.current = true;
    navigate(`/payment/${event.id}?tickets=${selectedSeats.length}&seats=${selectedSeats.join(',')}`);
  };

  if (loading && !event) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      <p className="text-slate-400 font-medium">Syncing event data...</p>
    </div>
  );
  
  if (!event) return (
    <div className="container-custom py-32 text-center">
      <h2 className="text-3xl font-bold text-white mb-6">Event not found</h2>
      <Button onClick={() => navigate('/')} className="btn-primary">Return Home</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <div className="container-custom pt-32">
        {step !== 'seats' && (
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-12 text-sm font-semibold group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
            Explore Events
          </button>
        )}

        <AnimatePresence mode="wait">
          {step === 'details' ? (
            <motion.div 
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20"
            >
              {/* Left Side: Content */}
              <div className="lg:col-span-7 space-y-12">
                <div className="relative rounded-3xl overflow-hidden aspect-video border border-slate-800 shadow-2xl">
                  <img 
                    src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200'} 
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  <div className="absolute bottom-10 left-10 right-10">
                    <div className="flex gap-3 mb-6">
                       <span className="badge-indigo">Featured</span>
                       <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">Selling Fast</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
                      {event.title}
                    </h1>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { icon: Calendar, label: "Timeline", value: new Date(event.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), color: "text-indigo-400" },
                    { icon: MapPin, label: "Venue", value: event.location, color: "text-sky-400" },
                    { icon: Clock, label: "Duration", value: "Approx. 4 Hours", color: "text-emerald-400" },
                  ].map((info, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${info.color}`}>
                        <info.icon size={22} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{info.label}</div>
                        <div className="text-white font-semibold text-sm">{info.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-white tracking-tight">Overview</h3>
                    <div className="h-px flex-1 bg-slate-800" />
                  </div>
                  <p className="text-lg text-slate-400 leading-relaxed font-light whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="premium-card flex items-start gap-5">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                         <ShieldCheck size={24} />
                      </div>
                      <div>
                         <h4 className="text-white font-bold mb-1">Buyer Guarantee</h4>
                         <p className="text-xs text-slate-500 leading-relaxed">Secure transaction with instant digital ticket delivery.</p>
                      </div>
                   </div>
                   <div className="premium-card flex items-start gap-5">
                      <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                         <Zap size={24} />
                      </div>
                      <div>
                         <h4 className="text-white font-bold mb-1">Direct Entry</h4>
                         <p className="text-xs text-slate-500 leading-relaxed">Present your digital pass directly at the venue entrance.</p>
                      </div>
                   </div>
                </div>
              </div>

              {/* Right Side: Booking Panel */}
              <div className="lg:col-span-5 relative">
                <div className="sticky top-32">
                  <div className="premium-card p-10 shadow-2xl">
                    <div className="mb-10 pb-8 border-b border-slate-800 flex flex-col gap-2">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pricing Strategy</span>
                       <div className="flex items-baseline gap-2">
                         <span className="text-5xl font-bold text-white tracking-tight italic">₹{event.price}</span>
                         <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">/ admission</span>
                       </div>
                    </div>

                    <div className="space-y-10">
                        <div>
                          <div className="flex items-center justify-between mb-6">
                             <h4 className="text-xs font-bold text-white uppercase tracking-widest">Select Quantity</h4>
                             <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Max 10</span>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button 
                                key={n} 
                                onClick={() => setTicketQuantity(n)} 
                                className={`w-12 h-12 rounded-xl font-bold text-sm transition-all duration-300 ${
                                  ticketQuantity === n 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105' 
                                    : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <Button 
                            className="btn-primary w-full py-5 text-base tracking-tight"
                            onClick={() => { setSelectedSeats([]); setStep('seats'); }} 
                            disabled={event.availableSeats === 0}
                          >
                            {event.availableSeats === 0 ? 'Waitlist Only' : 'Select Seating Plan'} 
                            <ChevronRight className="ml-2" size={18} />
                          </Button>
                          
                          <div className="flex items-center justify-center gap-10">
                             <button className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                                <Share2 size={14} /> Share
                             </button>
                             <div className="w-1 h-1 rounded-full bg-slate-800" />
                             <button className="text-slate-500 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                                <Info size={14} /> Details
                             </button>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Full Page Seat Selection */
            <motion.div 
              key="seats"
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="max-w-7xl mx-auto"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-16">
                <div className="flex items-center gap-8">
                  <button 
                    onClick={() => {
                      if (selectedSeats.length > 0) {
                        seatLockService.unlockMultiple(id, selectedSeats).catch(() => {});
                        setSelectedSeats([]);
                      }
                      setStep('details');
                    }}
                    className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-all flex items-center justify-center shadow-xl"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight uppercase">{event.title}</h1>
                    <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
                      <span>{event.location}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-800" />
                      <span>{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="px-8 py-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center min-w-[140px]">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Selection</span>
                    <span className="text-2xl font-bold text-white italic leading-none">{selectedSeats.length} <span className="text-slate-700 mx-1">/</span> {ticketQuantity}</span>
                  </div>
                  {selectedSeats.length > 0 && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="px-8 py-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-4"
                    >
                      <Clock size={20} className="text-indigo-400 animate-pulse" />
                      <span className="text-2xl font-bold text-indigo-400 font-mono leading-none tracking-tighter italic">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-8">
                   <div className="premium-card p-12 md:p-20 relative overflow-hidden bg-slate-900/30">
                      {/* Cinema Screen Visual */}
                      <div className="mb-24 relative">
                        <div className="w-4/5 h-[3px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent mx-auto rounded-full shadow-[0_0_40px_rgba(79,70,229,0.3)]" />
                        <div className="absolute top-10 left-0 w-full text-center">
                           <span className="text-[10px] font-bold text-slate-700 uppercase tracking-[1.5em] pl-[1.5em]">Main Stage Area</span>
                        </div>
                      </div>

                      {/* Seat Map */}
                      <div className="flex flex-col gap-6 items-center mb-16">
                        {(() => {
                          const total = event.totalSeats || 100;
                          const cols = 12;
                          const rows = Math.ceil(total / cols);
                          
                          return Array.from({ length: rows }).map((_, rowIndex) => (
                            <div key={rowIndex} className="flex gap-4 sm:gap-6 items-center">
                              <span className="w-6 text-[10px] font-bold text-slate-800 text-center uppercase">
                                {String.fromCharCode(65 + rowIndex)}
                              </span>
                              <div className="flex gap-2 sm:gap-3">
                                {Array.from({ length: cols }).map((_, colIndex) => {
                                  const seatIndex = rowIndex * cols + colIndex;
                                  if (seatIndex >= total) return null;
                                  
                                  const seatId = `${String.fromCharCode(65 + rowIndex)}${colIndex + 1}`;
                                  const isBooked = bookedSeats.includes(seatId);
                                  const isLocked = lockedByOthers.includes(seatId);
                                  const isSelected = selectedSeats.includes(seatId);
                                  
                                  return (
                                    <motion.button
                                      key={seatId}
                                      whileHover={!isBooked && !isLocked ? { scale: 1.2, zIndex: 10 } : {}}
                                      whileTap={!isBooked && !isLocked ? { scale: 0.9 } : {}}
                                      disabled={isBooked || isLocked}
                                      className={`
                                        w-7 h-7 sm:w-9 sm:h-9 rounded-lg text-[10px] font-bold transition-all duration-300 border
                                        ${isSelected ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : ''}
                                        ${isBooked ? 'bg-slate-900 text-slate-950 border-transparent opacity-10 cursor-not-allowed' : ''}
                                        ${isLocked ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 cursor-not-allowed animate-pulse' : ''}
                                        ${!isSelected && !isBooked && !isLocked ? 'bg-slate-900 text-slate-600 border-slate-800 hover:border-indigo-500/40 hover:text-white hover:bg-slate-800' : ''}
                                      `}
                                      onClick={async () => {
                                        if (isBooked || isLocked) return;
                                        if (!user) { navigate('/login'); return; }
                                        
                                        if (isSelected) {
                                          try {
                                            await seatLockService.unlock(id, seatId);
                                            setSelectedSeats(prev => prev.filter(s => s !== seatId));
                                          } catch (err) {}
                                        } else {
                                          if (selectedSeats.length >= ticketQuantity) return;
                                          try {
                                            await seatLockService.lock(id, seatId);
                                            setSelectedSeats(prev => [...prev, seatId].sort());
                                          } catch (err) {}
                                        }
                                      }}
                                    >
                                      {colIndex + 1}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap justify-center gap-10 pt-16 border-t border-slate-800">
                        {[
                          { label: 'Available', color: 'bg-slate-900 border-slate-800' },
                          { label: 'Selected', color: 'bg-white border-white' },
                          { label: 'Locked', color: 'bg-indigo-500/20 border-indigo-500/30' },
                          { label: 'Reserved', color: 'bg-slate-950 opacity-20' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded-md border ${item.color}`} />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{item.label}</span>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="premium-card p-8 shadow-2xl">
                    <div className="flex items-center gap-4 mb-10">
                       <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-slate-800">
                          <Ticket size={22} />
                       </div>
                       <h3 className="text-xl font-bold text-white uppercase tracking-tight">Order Details</h3>
                    </div>
                    
                    <div className="space-y-8 mb-12">
                      <div className="flex justify-between items-center group">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Reserved Seats</span>
                        <div className="flex flex-wrap gap-1.5 justify-end max-w-[160px]">
                           {selectedSeats.length > 0 ? selectedSeats.map(s => (
                             <span key={s} className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20 transition-transform duration-300 group-hover:scale-105">
                               {s}
                             </span>
                           )) : <span className="text-xs font-bold text-slate-800 uppercase italic tracking-widest">Select Seats</span>}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Unit Value</span>
                        <span className="text-white font-bold italic">₹{event.price} x {selectedSeats.length}</span>
                      </div>
                      <div className="pt-10 border-t border-slate-800 flex justify-between items-end">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.4em]">Total</span>
                        <span className="text-4xl font-bold text-white italic tracking-tighter">
                          ₹{(event.price * selectedSeats.length).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Button 
                        className="btn-primary w-full py-5 text-base"
                        onClick={handleBook}
                        disabled={selectedSeats.length !== ticketQuantity}
                      >
                        {selectedSeats.length === ticketQuantity 
                          ? 'Checkout Securely' 
                          : `Pick ${ticketQuantity - selectedSeats.length} more`}
                        <ArrowRight className="ml-2" size={18} />
                      </Button>
                      
                      <button 
                        onClick={() => {
                          if (selectedSeats.length > 0) {
                            seatLockService.unlockMultiple(id, selectedSeats).catch(() => {});
                            setSelectedSeats([]);
                          }
                          setStep('details');
                        }}
                        className="w-full text-slate-600 hover:text-white transition-colors font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        Change Quantity
                      </button>
                    </div>

                    <div className="mt-12 p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                       <div className="flex items-center gap-3 text-white">
                          <ShieldCheck size={16} className="text-indigo-400" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Security Verified</span>
                       </div>
                       <p className="text-[10px] text-slate-600 font-light leading-relaxed uppercase tracking-wider">
                         Your selection is encrypted and locked for <span className="text-white font-bold">5 minutes</span>.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EventDetails;
