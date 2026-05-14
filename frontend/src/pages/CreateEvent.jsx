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
    <div className="container mx-auto px-6 py-16 max-w-3xl">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-white/40 hover:text-white transition-all mb-10 text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={16} /> 
        Back
      </button>

      <Card className="p-10 md:p-16">
        <div className="flex flex-col md:flex-row md:items-center gap-8 mb-12 border-b border-white/5 pb-12">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black">
            <PlusCircle size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-medium text-white tracking-tight">Host Experience</h1>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Publish to global catalog</p>
          </div>
        </div>

        {status.message && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`mb-10 p-5 rounded-2xl border flex items-center gap-4 ${
              status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}
          >
            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-medium">{status.message}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
          <Input 
            label="Experience Title"
            icon={Tag}
            required
            placeholder="AI Summit 2026"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest ml-1">Description</label>
            <textarea 
              required 
              className="liquid-glass w-full bg-white/5 text-white px-5 py-4 rounded-2xl outline-none focus:bg-white/10 transition-all placeholder:text-white/20 text-sm min-h-[160px] resize-none"
              placeholder="Detail the agenda and atmosphere..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input 
              label="Venue"
              icon={MapPin}
              required
              placeholder="San Francisco, CA"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <Input 
              label="Price (₹)"
              type="number" 
              required
              placeholder="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input 
              label="Start"
              type="datetime-local" 
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
            <Input 
              label="End"
              type="datetime-local" 
              required
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>

          <Input 
            label="Image URL"
            icon={ImageIcon}
            type="url"
            placeholder="https://..."
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          />

          <Input 
            label="Total Capacity"
            icon={Calendar}
            type="number" 
            required
            placeholder="500"
            value={formData.totalSeats}
            onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
          />

          <div className="pt-10 border-t border-white/5 flex gap-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={loading}
              className="flex-[2]"
            >
              Publish <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateEvent;
