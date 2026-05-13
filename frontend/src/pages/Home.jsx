import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEvents, setSearchTerm } from '../store/slices/eventsSlice';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Search, Sparkles, TrendingUp, Zap, ChevronRight, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

const Home = () => {
  const dispatch = useAppDispatch();
  const { items: events, loading, searchTerm } = useAppSelector(state => state.events);

  useEffect(() => {
    dispatch(fetchEvents({ page: 0, size: 12 }));
  }, [dispatch]);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          event.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium">Loading iconic experiences...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 md:gap-24 pb-24">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-24 lg:pt-32 overflow-hidden">
        <div className="container-custom relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-8"
            >
              <Sparkles size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Premium Event Discovery</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]"
            >
              The world's most <br className="hidden md:block" />
              <span className="text-indigo-500">extraordinary</span> events.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl"
            >
              Secure your spot at exclusive tech summits, music festivals, and global gatherings. One platform for all your cultural milestones.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-2xl bg-slate-900/50 border border-slate-800 p-2 rounded-2xl flex flex-col sm:flex-row gap-2"
            >
              <div className="flex-1">
                <Input 
                  icon={Search}
                  placeholder="Search events, cities, or venues..."
                  value={searchTerm}
                  onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                  className="bg-transparent border-none focus:ring-0 text-base py-4"
                />
              </div>
              <Button className="btn-primary w-full sm:w-auto px-8">
                Explore
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-indigo-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      </section>

      {/* Stats/Features */}
      <section className="container-custom">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[
            { icon: TrendingUp, label: "Trending Now", desc: "Access the most anticipated global summits.", color: "text-indigo-400" },
            { icon: Zap, label: "Instant Delivery", desc: "Digital tickets delivered to your vault instantly.", color: "text-sky-400" },
            { icon: MapPin, label: "Global Reach", desc: "Discover premium events in 50+ cities.", color: "text-emerald-400" },
          ].map((feature, i) => (
            <div key={i} className="premium-card group">
              <div className={`p-3 rounded-xl bg-slate-800 w-fit mb-6 transition-colors group-hover:bg-slate-700 ${feature.color}`}>
                <feature.icon size={24} />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">{feature.label}</h4>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Events Grid */}
      <section className="container-custom">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Featured Experiences</h2>
            <p className="text-slate-400">Handpicked events for our premium community.</p>
          </div>
          <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
            {['All', 'Music', 'Tech', 'Sports'].map(cat => (
              <button key={cat} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${cat === 'All' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-24 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl">
            <p className="text-slate-500">No events found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <Link key={event.id} to={`/event/${event.id}`} className="group">
                <div className="premium-card p-0 overflow-hidden h-full flex flex-col">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img 
                      src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800'} 
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-white/90 text-slate-900 border-none font-bold">
                        ₹{event.price}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex gap-2 mb-4">
                      <span className="badge-indigo">Trending</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-indigo-400 transition-colors">
                      {event.title}
                    </h3>
                    <div className="space-y-3 mt-auto">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Calendar size={14} className="text-indigo-500" />
                        <span>{new Date(event.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <MapPin size={14} className="text-indigo-500" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </div>
                    <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-400">
                        <span className="text-white font-bold">{event.availableSeats}</span> seats left
                      </span>
                      <span className="text-indigo-400 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                        View Details <ArrowRight size={16} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
