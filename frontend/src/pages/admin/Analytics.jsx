import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchRevenueData } from '../../store/slices/analyticsSlice';
import { BarChart3, TrendingUp, Users, DollarSign, ArrowUpRight, Calendar, ArrowLeft, Download, Filter, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const Analytics = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { revenueData: data, loading } = useAppSelector(state => state.analytics);

  useEffect(() => {
    dispatch(fetchRevenueData());
  }, [dispatch]);

  const totalRevenue = data?.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0) || 0;
  const totalTickets = data?.reduce((acc, curr) => acc + (curr.totalTickets || 0), 0) || 0;

  if (loading && (!data || data.length === 0)) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="loader"></div>
      <p className="text-slate-400 font-medium animate-pulse">Aggregating real-time data...</p>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-6">
           <motion.button 
             whileHover={{ x: -5 }}
             onClick={() => navigate('/admin')}
             className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl"
           >
              <ArrowLeft size={20} />
           </motion.button>
           <div>
              <h1 className="text-4xl font-black text-white tracking-tight">Revenue <span className="text-gradient">Analytics</span></h1>
              <p className="text-slate-500 font-medium mt-1">Global performance metrics and sales intelligence</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" className="gap-2 bg-white/[0.02]">
            <Download size={18} /> Export CSV
          </Button>
          <div className="px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-xs uppercase tracking-widest flex items-center gap-3">
             <TrendingUp size={18} /> Market Status: Active
          </div>
        </div>
      </div>

      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary', trend: '+12.5%' },
          { label: 'Tickets Issued', value: totalTickets.toLocaleString(), icon: Users, color: 'text-accent', trend: '+8.2%' },
          { label: 'Catalog Size', value: data.length, icon: BarChart3, color: 'text-secondary', trend: 'Stable' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-8 bg-surface/40 border-white/5 relative overflow-hidden" hover={false}>
               <div className="flex justify-between items-start mb-8">
                  <div className={`p-4 rounded-2xl bg-white/5 ${stat.color} border border-white/10 shadow-xl`}>
                    <stat.icon size={28} />
                  </div>
                  <Badge variant="accent" className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20 px-3 py-1 font-black text-[10px]">
                    {stat.trend} <ArrowUpRight size={12} className="ml-1 inline" />
                  </Badge>
               </div>
               <span className="text-sm font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
               <h2 className="text-5xl font-black text-white mt-2 tracking-tighter italic">{stat.value}</h2>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Performance List */}
        <div className="lg:col-span-8">
           <Card className="p-0 border-white/5 bg-surface/40 overflow-hidden" hover={false}>
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                 <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Event Performance</h3>
                 <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-colors">
                       <Filter size={18} />
                    </button>
                 </div>
              </div>
              <div className="p-8 space-y-12">
                 <AnimatePresence>
                   {data.map((event, idx) => (
                     <motion.div 
                       key={event.eventId}
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: 0.3 + (idx * 0.05) }}
                       className="group"
                     >
                       <div className="flex justify-between items-end mb-4">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 font-black text-lg border border-white/10 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                {idx + 1}
                             </div>
                             <div>
                                <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{event.eventTitle}</h4>
                                <div className="flex items-center gap-3 text-xs text-slate-500 font-bold mt-1">
                                   <Badge variant="neutral" className="bg-white/5 border-white/10 px-2 py-0.5 text-[9px] uppercase">{event.totalTickets} Sales</Badge>
                                   <div className="w-1 h-1 rounded-full bg-slate-800" />
                                   <span>ID: #{event.eventId}</span>
                                </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-2xl font-black text-white tracking-tighter italic">₹{event.totalRevenue.toLocaleString()}</div>
                             <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Net Revenue</div>
                          </div>
                       </div>
                       {/* Performance Bar */}
                       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: totalRevenue > 0 ? `${((event.totalRevenue || 0) / totalRevenue) * 100}%` : '0%' }}
                            transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-primary to-accent relative"
                          >
                             <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </motion.div>
                       </div>
                     </motion.div>
                   ))}
                 </AnimatePresence>
              </div>
           </Card>
        </div>

        {/* Insights / Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <Card className="p-8 bg-primary/5 border-primary/10 relative overflow-hidden group" hover={false}>
              <div className="absolute -top-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
                 <Sparkles size={160} />
              </div>
              <h3 className="text-sm font-black text-primary uppercase tracking-[3px] mb-6">AI Predictions</h3>
              <p className="text-slate-400 font-medium leading-relaxed mb-8">Based on current booking velocity, you are projected to reach <span className="text-white font-bold">₹{(totalRevenue * 1.4).toLocaleString()}</span> by end of quarter.</p>
              <Button className="w-full bg-primary/20 hover:bg-primary/30 border-primary/30 text-primary py-4 font-black text-xs uppercase tracking-widest">
                 View Projection Forecast
              </Button>
           </Card>

           <Card className="p-8 bg-surface/40 border-white/5" hover={false}>
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8">System Activity</h3>
              <div className="space-y-6">
                 {[
                   { label: 'Booking Engine', status: 'Stable', color: 'bg-emerald-400' },
                   { label: 'Redis Cache', status: 'Optimal', color: 'bg-emerald-400' },
                   { label: 'Analytics Pipeline', status: 'Active', color: 'bg-emerald-400' },
                   { label: 'Email Gateway', status: 'Stable', color: 'bg-emerald-400' },
                 ].map((sys, i) => (
                   <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-500">{sys.label}</span>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{sys.status}</span>
                         <div className={`w-2 h-2 rounded-full ${sys.color} animate-pulse`} />
                      </div>
                   </div>
                 ))}
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
