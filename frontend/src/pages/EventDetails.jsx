import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEventById, clearCurrentEvent } from '../store/slices/eventsSlice';
import { eventService, bookingService, seatLockService } from '../services/api';
import { MapPin, Calendar, Clock, Ticket, ArrowLeft, ArrowRight, ChevronRight, Star, MessageSquare, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import { reviewService } from '../services/api';

const Seat = memo(({ seatId, isBooked, isLocked, isSelected, onSelect, label }) => (
  <button
    disabled={isBooked || isLocked}
    className={`
      w-8 h-8 rounded-xl text-[10px] font-bold transition-all border transform-gpu
      ${isSelected ? 'bg-white text-black border-white shadow-xl shadow-white/10' : ''}
      ${isBooked ? 'bg-red-500/20 text-red-500/40 border-red-500/20 cursor-not-allowed opacity-60' : ''}
      ${isLocked ? 'bg-red-500/10 text-red-500/20 border-red-500/10 cursor-not-allowed animate-pulse' : ''}
      ${!isSelected && !isBooked && !isLocked ? 'bg-emerald-500/10 text-emerald-500/50 border-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30' : ''}
    `}
    onClick={() => onSelect(seatId, isSelected)}
  >
    {label}
  </button>
));

Seat.displayName = 'Seat';

const SeatMap = memo(({ total, rows, cols, bookedSeats, lockedByOthers, selectedSeats, onSelectSeat }) => {
  return Array.from({ length: rows }).map((_, rowIndex) => (
    <div key={rowIndex} className="flex gap-4 items-center transform-gpu">
      <span className="w-5 text-[8px] font-bold text-white/20 uppercase">{String.fromCharCode(65 + rowIndex)}</span>
      <div className="flex gap-2">
        {Array.from({ length: cols }).map((_, colIndex) => {
          const seatIndex = rowIndex * cols + colIndex;
          if (seatIndex >= total) return null;

          const seatId = `${String.fromCharCode(65 + rowIndex)}${colIndex + 1}`;
          const isBooked = bookedSeats.includes(seatId);
          const isSelected = selectedSeats.includes(seatId);
          const isLocked = lockedByOthers.includes(seatId) && !isSelected;

          return (
            <Seat
              key={seatId}
              seatId={seatId}
              isBooked={isBooked}
              isLocked={isLocked}
              isSelected={isSelected}
              onSelect={onSelectSeat}
              label={colIndex + 1}
            />
          );
        })}
      </div>
    </div>
  ));
});

SeatMap.displayName = 'SeatMap';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { user } = useAppSelector(state => state.auth);
  const { currentEvent: event, loading } = useAppSelector(state => state.events);

  const [step, setStep] = useState('details'); // details, seats
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
  }, [step, selectedSeats.length]);

  const [recommendations, setRecommendations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', imageUrl: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    dispatch(fetchEventById(id));

    const fetchRecommendations = async () => {
      try {
        const resp = await eventService.getRecommendations(id);
        setRecommendations(resp.data.data);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      }
    };
    fetchRecommendations();

    const fetchReviews = async () => {
      try {
        const resp = await reviewService.getEventReviews(id);
        setReviews(resp.data.data);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      }
    };
    fetchReviews();

    const fetchSeatData = async () => {
      try {
        const [lockedResp, bookedResp] = await Promise.all([
          seatLockService.getLocked(id),
          bookingService.getBookedSeats(id)
        ]);
        setLockedByOthers(lockedResp.data.data);
        setBookedSeats(bookedResp.data.data);

        if (user) {
          const myLocksResp = await seatLockService.getMyLocks(id);
          setSelectedSeats(myLocksResp.data.data);
        }
      } catch (err) {
        console.error('Error fetching seat data:', err);
      }
    };
    fetchSeatData();

    // WebSocket Connection
    const stompClient = new Client({
      webSocketFactory: () => new SockJS('/ws-booking'),
      onConnect: () => {
        if (user) {
          stompClient.publish({
            destination: `/app/register/${id}/${user.email}`
          });
        }
        stompClient.subscribe(`/topic/event/${id}/seats`, (message) => {
          const updatedLockedSeats = JSON.parse(message.body);
          setLockedByOthers(updatedLockedSeats);
        });
      },
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate();
      dispatch(clearCurrentEvent());
      if (!isProceedingToCheckout.current && selectedSeats.length > 0) {
        seatLockService.unlockMultiple(id, selectedSeats).catch(() => { });
      }
    };
  }, [id, user, dispatch]);

  const handleSelectSeat = useCallback(async (seatId, isSelected) => {
    if (isSelected) {
      try {
        await seatLockService.unlock(id, seatId);
        setSelectedSeats(prev => prev.filter(s => s !== seatId));
      } catch (err) { }
    } else {
      if (selectedSeats.length >= ticketQuantity) return;
      try {
        await seatLockService.lock(id, seatId);
        setSelectedSeats(prev => [...prev, seatId].sort());
      } catch (err) { }
    }
  }, [id, selectedSeats.length, ticketQuantity]);

  const handleBook = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (selectedSeats.length === 0) return;
    isProceedingToCheckout.current = true;
    navigate(`/payment/${event.id}?tickets=${selectedSeats.length}&seats=${selectedSeats.join(',')}`);
  }, [user, selectedSeats, event?.id, navigate]);

  const seatGridConfig = useMemo(() => {
    if (!event) return null;
    const total = event.totalSeats || 100;
    const cols = 10;
    const rows = Math.ceil(total / cols);
    return { total, cols, rows };
  }, [event]);

  if (loading && !event) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      <p className="text-white/40 text-sm font-medium">Syncing event data...</p>
    </div>
  );

  if (!event) return (
    <div className="container mx-auto px-6 py-32 text-center">
      <h2 className="text-3xl font-medium text-white mb-6">Event not found</h2>
      <Button onClick={() => navigate('/')}>Return Home</Button>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 pt-12 transform-gpu antialiased">
      <div className="container mx-auto px-6 max-w-7xl">
        <AnimatePresence mode="wait">
          {step === 'details' ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12"
            >
              <div className="lg:col-span-7 space-y-10">
                <div className="relative rounded-[2.5rem] overflow-hidden aspect-video border border-white/10 shadow-2xl">
                  <img
                    src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1200'}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: Calendar, label: "Date", value: new Date(event.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                    { icon: MapPin, label: "Venue", value: event.location },
                    { icon: Clock, label: "Starts", value: new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                  ].map((info, i) => (
                    <Card key={i} className="p-5 flex flex-col items-center text-center">
                      <div className="p-3 rounded-2xl bg-white/5 text-white mb-3">
                        <info.icon size={20} />
                      </div>
                      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{info.label}</div>
                      <div className="text-white font-medium text-sm">{info.value}</div>
                    </Card>
                  ))}
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-medium text-white tracking-tight">Overview</h3>
                  <p className="text-white/60 leading-relaxed font-light whitespace-pre-wrap text-lg">
                    {event.description}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-5">
                <Card className="p-8 sticky top-32 space-y-8">
                  <div className="pb-8 border-b border-white/5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-4">Official Pricing</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-medium text-white tracking-tighter">₹{event.price}</span>
                      <span className="text-white/40 font-bold uppercase text-[10px] tracking-widest">/ Admission</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">Ticket Quantity</h4>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Max 10</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          onClick={() => setTicketQuantity(n)}
                          className={`w-12 h-12 rounded-2xl font-bold text-sm transition-all duration-300 ${ticketQuantity === n
                            ? 'bg-white text-black scale-105 shadow-xl shadow-white/10'
                            : 'bg-white/5 text-white/40 hover:text-white border border-white/5'
                            }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full py-5 text-base"
                    onClick={() => { setSelectedSeats([]); setStep('seats'); }}
                    disabled={event.availableSeats === 0}
                  >
                    {event.availableSeats === 0 ? 'Waitlist Only' : 'Select Seats'}
                    <ChevronRight size={18} className="ml-2" />
                  </Button>
                </Card>
              </div>

              {/* Reviews Section */}
              <div className="lg:col-span-12 mt-20 pt-20 border-t border-white/5 grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-3xl font-medium text-white tracking-tight">Guest Reviews</h3>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2">Authentic experiences from our community</p>
                    </div>
                    <Badge variant="glass" className="px-4 py-2 flex items-center gap-2 backdrop-blur-xl">
                      <Star size={16} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-xl font-bold">{event.averageRating?.toFixed(1) || '0.0'}</span>
                      <span className="text-white/40 text-xs font-medium">({event.reviewCount || 0})</span>
                    </Badge>
                  </div>

                  <div className="space-y-6">
                    {reviews.length > 0 ? reviews.map((review) => (
                      <Card key={review.id} className="p-6 space-y-4 hover:bg-white/[0.04] transition-colors group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                              <img src={review.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.userName}`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">{review.userName}</h4>
                              <div className="flex gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={10} className={i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-white/10'} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-white/60 leading-relaxed text-sm font-light italic">"{review.comment}"</p>
                        {review.imageUrl && (
                          <div className="relative rounded-2xl overflow-hidden aspect-video w-48 border border-white/10 mt-4 group-hover:scale-105 transition-transform duration-500">
                            <img src={review.imageUrl} alt="Review" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </Card>
                    )) : (
                      <div className="p-12 text-center rounded-[2.5rem] bg-white/[0.02] border border-dashed border-white/10">
                        <MessageSquare className="mx-auto text-white/10 mb-4" size={40} />
                        <p className="text-white/20 font-medium tracking-tight">No reviews yet. Be the first to share your experience!</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <Card className="p-8 space-y-8 sticky top-32">
                    <div className="space-y-2">
                      <h4 className="text-xl font-medium text-white tracking-tight">Share Your Experience</h4>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Help others discover this event</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${newReview.rating >= star ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/5 text-white/20 hover:text-white'}`}
                            >
                              <Star size={18} className={newReview.rating >= star ? 'fill-yellow-500' : ''} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Your Feedback</label>
                        <textarea
                          placeholder="How was the event? Mention the vibe, crowd, or any tips..."
                          value={newReview.comment}
                          onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-white/20 transition-all outline-none min-h-[120px]"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Photo URL (Optional)</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Paste an image URL..."
                            value={newReview.imageUrl}
                            onChange={(e) => setNewReview(prev => ({ ...prev, imageUrl: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:ring-1 focus:ring-white/20 transition-all outline-none"
                          />
                          <Camera className="absolute left-3 top-3 text-white/20" size={16} />
                        </div>
                      </div>

                      <Button
                        className="w-full py-4"
                        onClick={async () => {
                          if (!user) { navigate('/login'); return; }
                          if (!newReview.comment) return;
                          setIsSubmittingReview(true);
                          try {
                            await reviewService.addReview(id, newReview);
                            const resp = await reviewService.getEventReviews(id);
                            setReviews(resp.data.data);
                            setNewReview({ rating: 5, comment: '', imageUrl: '' });
                            // Refresh event to get new average rating
                            dispatch(fetchEventById(id));
                          } catch (err) {
                            alert(err.response?.data?.message || 'Failed to submit review');
                          } finally {
                            setIsSubmittingReview(false);
                          }
                        }}
                        disabled={isSubmittingReview || !newReview.comment}
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>

              {recommendations.length > 0 && (
                <div className="lg:col-span-12 mt-20 pt-20 border-t border-white/5">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-3xl font-medium text-white tracking-tight">Similar Events</h3>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2">Recommended by our AI Engine</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {recommendations.map((rec) => (
                      <Card
                        key={rec.id}
                        className="group cursor-pointer overflow-hidden transform-gpu hover:bg-white/[0.07] transition-all duration-500"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          navigate(`/event/${rec.id}`);
                        }}
                      >
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src={rec.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=600'}
                            alt={rec.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute top-4 right-4">
                            <Badge variant="glass" className="backdrop-blur-xl">₹{rec.price}</Badge>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xl font-medium text-white tracking-tight line-clamp-1">{rec.title}</h4>
                            <div className="flex items-center gap-1 shrink-0 bg-white/5 px-2 py-1 rounded-lg">
                              <Star size={12} className="text-yellow-500 fill-yellow-500" />
                              <span className="text-xs text-white/60 font-bold">{rec.averageRating?.toFixed(1) || '0.0'}</span>
                            </div>
                          </div>
                          <p className="text-white/40 text-xs line-clamp-2 mb-4 font-light leading-relaxed">{rec.description}</p>
                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 text-white/40">
                              <Calendar size={14} />
                              <span className="text-[10px] font-bold uppercase tracking-wider">
                                {new Date(rec.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-500">
                              <span className="text-[10px] font-bold uppercase tracking-widest italic">AI Match</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="seats"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 transform-gpu">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => {
                      if (selectedSeats.length > 0) {
                        seatLockService.unlockMultiple(id, selectedSeats).catch(() => { });
                        setSelectedSeats([]);
                      }
                      setStep('details');
                    }}
                    className="w-12 h-12 rounded-2xl liquid-glass text-white/60 hover:text-white flex items-center justify-center transition-all duration-300 transform-gpu"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h1 className="text-3xl font-medium text-white tracking-tight">{event.title}</h1>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Select your seating position</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Card className="p-0 px-6 py-3 flex flex-col items-center min-w-[120px] transform-gpu">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Selected</span>
                    <span className="text-xl font-bold text-white leading-none mt-1">{selectedSeats.length} / {ticketQuantity}</span>
                  </Card>
                  {selectedSeats.length > 0 && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 transform-gpu"
                    >
                      <Clock size={16} className="text-white animate-pulse" />
                      <span className="text-xl font-bold text-white font-mono leading-none tracking-tighter">
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-8">
                  <Card className="p-12 md:p-20 relative overflow-hidden bg-white/[0.02] transform-gpu">
                    <div className="mb-20">
                      <div className="w-3/4 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto rounded-full" />
                      <div className="text-center mt-6 text-[10px] font-bold text-white/20 uppercase tracking-[1em]">Stage Area</div>
                    </div>

                    <div className="flex flex-col gap-5 items-center mb-16 transform-gpu">
                      {seatGridConfig && (
                        <SeatMap
                          {...seatGridConfig}
                          bookedSeats={bookedSeats}
                          lockedByOthers={lockedByOthers}
                          selectedSeats={selectedSeats}
                          onSelectSeat={handleSelectSeat}
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap justify-center gap-8 pt-12 border-t border-white/5">
                      {[
                        { label: 'Available', color: 'bg-emerald-500/10 border-emerald-500/20' },
                        { label: 'Selected', color: 'bg-white border-white' },
                        { label: 'Occupied', color: 'bg-red-500/20 border-red-500/20' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-md border ${item.color}`} />
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-4">
                  <Card className="p-8 space-y-8 transform-gpu">
                    <div className="flex items-center gap-4 mb-2">
                      <Ticket size={24} className="text-white" />
                      <h3 className="text-xl font-medium text-white uppercase tracking-tight">Order Summary</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Seats</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {selectedSeats.length > 0 ? selectedSeats.map(s => (
                            <Badge key={s} variant="primary" className="text-[10px]">{s}</Badge>
                          )) : <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">None selected</span>}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Price</span>
                        <span className="text-white font-medium">₹{event.price} x {selectedSeats.length}</span>
                      </div>
                      <div className="pt-6 border-t border-white/5 flex justify-between items-end">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">Total</span>
                        <span className="text-4xl font-medium text-white tracking-tighter">
                          ₹{(event.price * selectedSeats.length).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full py-5 text-base"
                      onClick={handleBook}
                      disabled={selectedSeats.length !== ticketQuantity}
                    >
                      Checkout Securely
                      <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default memo(EventDetails);
