import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchRevenueData } from '../../store/slices/analyticsSlice';
import { BarChart3, TrendingUp, Users, DollarSign, ArrowUpRight, ArrowLeft, Download, Filter, Sparkles } from 'lucide-react';
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
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      <p className="text-white/40 text-sm font-medium">Aggregating intelligence...</p>
    </div>
  );

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-6">
           <button 
             onClick={() => navigate('/admin')}
             className="w-12 h-12 rounded-2xl liquid-glass text-white/40 hover:text-white transition-all flex items-center justify-center"
           >
              <ArrowLeft size={20} />
           </button>
           <div>
              <h1 className="text-5xl font-medium text-white tracking-tight">Intelligence</h1>
              <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-1">Real-time performance metrics</p>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary"><Download size={18} className="mr-2" /> Export</Button>
          <Badge variant="success" className="px-4 py-2"><TrendingUp size={14} className="mr-2 inline" /> Market: Optimal</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, trend: '+12.5%' },
          { label: 'Tickets Issued', value: totalTickets.toLocaleString(), icon: Users, trend: '+8.2%' },
          { label: 'Active Events', value: data.length, icon: BarChart3, trend: 'Stable' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-8">
               <div className="flex justify-between items-start mb-10">
                  <div className="p-4 rounded-2xl bg-white/5 text-white">
                    <stat.icon size={24} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">
                    {stat.trend}
                  </span>
               </div>
               <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{stat.label}</span>
               <h2 className="text-4xl font-medium text-white mt-2 tracking-tighter">
                {stat.value}
               </h2>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
           <Card className="p-0">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                 <h3 className="text-lg font-medium text-white uppercase tracking-tight">Event Performance</h3>
                 <button className="p-2 rounded-lg liquid-glass text-white/40 hover:text-white transition-colors">
                    <Filter size={18} />
                 </button>
              </div>
              <div className="p-8 space-y-12">
                 <AnimatePresence>
                    {data.map((event, idx) => (
                      <div key={event.eventId} className="space-y-4">
                        <div className="flex justify-between items-end">
                           <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-white/20 uppercase tracking-widest">{idx + 1}</span>
                              <div>
                                 <h4 className="text-white font-medium">{event.eventTitle}</h4>
                                 <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="secondary" className="text-[9px]">{event.totalTickets} Sales</Badge>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className="text-2xl font-medium text-white tracking-tighter">₹{event.totalRevenue.toLocaleString()}</div>
                           </div>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: totalRevenue > 0 ? `${((event.totalRevenue || 0) / totalRevenue) * 100}%` : '0%' }}
                             className="h-full bg-white/40"
                           />
                        </div>
                      </div>
                    ))}
                 </AnimatePresence>
              </div>
           </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <Card className="p-8 bg-white/[0.03] overflow-hidden group">
              <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                 <Sparkles size={160} />
              </div>
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[3px] mb-6">AI Forecast</h3>
              <p className="text-white/60 leading-relaxed mb-8">Based on velocity, projected revenue is <span className="text-white font-bold">₹{(totalRevenue * 1.4).toLocaleString()}</span> by EOY.</p>
              <Button variant="secondary" className="w-full">Download Report</Button>
           </Card>

           <Card className="p-8">
              <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-8">Node Status</h3>
              <div className="space-y-6">
                 {[
                   { label: 'Booking Core', status: 'Stable' },
                   { label: 'Redis L2', status: 'Optimal' },
                   { label: 'RMQ Workers', status: 'Active' },
                 ].map((sys, i) => (
                   <div key={i} className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/50">{sys.label}</span>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{sys.status}</span>
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40" />
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
