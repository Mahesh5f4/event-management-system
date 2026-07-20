import { useEffect, useMemo, memo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEvents, setSearchTerm } from '../store/slices/eventsSlice';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Search, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Badge from '../components/ui/Badge';

const EventCard = memo(({ event }) => (
  <Link to={`/event/${event.id}`} className="group transform-gpu">
    <div className="liquid-glass flex flex-col h-full bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-[2rem] overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img 
          src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800'} 
          alt={event.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 will-change-transform"
        />
        <div className="absolute top-4 right-4">
          <Badge variant="primary" className="bg-white text-black border-none px-4 py-1.5 shadow-xl">
            ₹{event.price}
          </Badge>
        </div>
      </div>
      
      <div className="p-8 flex flex-col flex-1">
        <h3 className="text-2xl font-medium text-white mb-6 group-hover:text-white transition-colors line-clamp-2 leading-snug">
          {event.title}
        </h3>
        
        <div className="space-y-4 mt-auto">
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <Calendar size={16} />
            <span>{new Date(event.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <MapPin size={16} />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-white/30">
            {event.availableSeats} Seats Left
          </span>
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            Details <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  </Link>
));

EventCard.displayName = 'EventCard';

const Home = () => {
  const dispatch = useAppDispatch();
  const { items: events, loading, searchTerm } = useAppSelector(state => state.events);

  useEffect(() => {
    dispatch(fetchEvents({ page: 0, size: 12 }));
  }, [dispatch]);

  const filteredEvents = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return events.filter(event => {
      if (!event) return false;
      const title = event.title || '';
      const location = event.location || '';
      return title.toLowerCase().includes(term) || location.toLowerCase().includes(term);
    });
  }, [events, searchTerm]);

  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center px-6 sm:px-12 overflow-hidden">
        <div className="max-w-3xl z-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 mb-6"
          >
            <Sparkles size={14} className="text-white" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Premium Event Discovery</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white text-4xl sm:text-6xl lg:text-7xl font-medium leading-[1.1] tracking-tight mb-6"
          >
            Live Better, Feel Whole <br /> Every Day
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg"
          >
            Secure your spot at exclusive global gatherings. Discover tech summits, art festivals, and elite networking events tailored for your journey.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-xl"
          >
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input 
                type="text"
                placeholder="Search experiences..."
                value={searchTerm}
                onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                className="liquid-glass w-full bg-white/5 text-white pl-12 pr-6 py-4 rounded-full outline-none focus:bg-white/10 transition-all placeholder:text-white/30"
              />
            </div>
            <button className="w-full sm:w-auto bg-white text-black font-medium px-8 py-4 rounded-full hover:bg-white/90 transition-colors">
              Explore
            </button>
          </motion.div>
        </div>
      </section>

      {/* Featured Events Grid */}
      <section className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div className="space-y-2">
            <h2 className="text-3xl font-medium text-white tracking-tight">Curated Experiences</h2>
            <p className="text-white/50">Handpicked global highlights for you.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="liquid-glass aspect-[4/5] rounded-3xl animate-pulse bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
