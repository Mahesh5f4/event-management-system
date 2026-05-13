import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { createEvent } from '../store/slices/eventsSlice';
import { motion } from 'framer-motion';
import { PlusCircle, Calendar, MapPin, Tag, Info, CheckCircle, AlertCircle, Image as ImageIcon, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

const CreateEvent = () => {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    price: '',
    totalSeats: '',
    imageUrl: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const resultAction = await dispatch(createEvent({
        ...formData,
        price: parseFloat(formData.price),
        totalSeats: parseInt(formData.totalSeats)
      }));
      if (createEvent.fulfilled.match(resultAction)) {
        setStatus({ type: 'success', message: 'Experience published successfully! Redirecting...' });
        setTimeout(() => navigate('/admin'), 2000);
      } else {
        setStatus({ type: 'error', message: resultAction.payload || 'Failed to publish experience.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl relative">
       {/* Background Decor */}
       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-primary/5 blur-[100px] rounded-full -z-10" />

      <motion.button 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-10 font-bold group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
        Back to Dashboard
      </motion.button>

      <Card className="p-10 md:p-16 border-white/5 bg-surface/60 backdrop-blur-2xl" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center gap-8 mb-12 border-b border-white/5 pb-12">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-xl shadow-primary/10 border border-primary/20">
            <PlusCircle size={40} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
               <Badge variant="primary" className="px-3 py-1 font-black text-[10px] uppercase tracking-widest">Creator Mode</Badge>
               <Sparkles size={14} className="text-primary animate-pulse" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Host an <span className="text-gradient">Experience</span></h1>
            <p className="text-slate-400 font-medium mt-1">Publish a new event to the global catalog</p>
          </div>
        </div>

        {status.message && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`mb-10 p-5 rounded-2xl border flex items-center gap-4 ${
              status.type === 'success' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-danger/10 border-danger/20 text-danger'
            }`}
          >
            {status.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            <span className="font-bold">{status.message}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 gap-10">
            <Input 
              label="Event Title"
              icon={Tag}
              required
              placeholder="e.g. Next-Gen AI Summit 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
                <Info size={14} /> Comprehensive Description
              </label>
              <textarea 
                required 
                className="premium-input min-h-[160px] resize-none"
                placeholder="What makes this experience iconic? Detail the agenda, speakers, and atmosphere..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <Input 
              label="Venue / Location"
              icon={MapPin}
              required
              placeholder="e.g. Silicon Valley Center"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <Input 
              label="Admission Price (₹)"
              type="number" 
              required
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <Input 
              label="Event Starts"
              type="datetime-local" 
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
            <Input 
              label="Event Ends"
              type="datetime-local" 
              required
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>

          <div className="space-y-6">
            <Input 
              label="Cover Image URL"
              icon={ImageIcon}
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            />
            {formData.imageUrl && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="aspect-video w-full rounded-[32px] overflow-hidden border border-white/10 shadow-2xl relative group"
              >
                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" 
                  onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Badge variant="primary">Preview Mode Active</Badge>
                </div>
              </motion.div>
            )}
          </div>

          <Input 
            label="Total Capacity"
            icon={Users}
            type="number" 
            required
            placeholder="e.g. 500"
            value={formData.totalSeats}
            onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
          />

          <div className="pt-10 border-t border-white/5 flex gap-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="flex-1 py-4"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={loading}
              className="flex-[2] py-4 text-lg font-black italic tracking-tight"
            >
              Publish Experience <ArrowRight className="ml-2" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateEvent;
