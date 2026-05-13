import { Link } from 'react-router-dom';
import { Ticket, Mail, Phone, MapPin, ArrowUpRight, Globe, ShieldCheck } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    navigation: [
      { label: 'Discover Events', to: '/' },
      { label: 'Global Summits', to: '#' },
      { label: 'Ticket Pricing', to: '#' },
      { label: 'Venue Partners', to: '#' },
      { label: 'Upcoming Tours', to: '#' },
    ],
    resources: [
      { label: 'Help Center', to: '#' },
      { label: 'Terms of Service', to: '#' },
      { label: 'Privacy Policy', to: '#' },
      { label: 'Cookie Settings', to: '#' },
      { label: 'Security Protocol', to: '#' },
    ]
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-24 pb-12 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-indigo-500/5 blur-[120px] rounded-full -z-10 pointer-events-none" />

      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">
          {/* Brand Section */}
          <div className="lg:col-span-5 space-y-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Ticket size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white uppercase">
                Event<span className="text-indigo-500">Hub</span> <span className="text-xs text-slate-600 font-normal">PRO</span>
              </span>
            </Link>
            
            <p className="text-slate-500 text-lg leading-relaxed max-w-md font-light">
              The world's leading platform for exclusive engineering summits, tech gatherings, and iconic cultural moments.
            </p>

            <div className="flex gap-4">
              {[Globe, Mail].map((Icon, i) => (
                <button key={i} className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-all">
                  <Icon size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
            <div className="space-y-6">
              <h4 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Navigation</h4>
              <ul className="space-y-4">
                {footerLinks.navigation.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-slate-500 hover:text-indigo-400 transition-colors text-sm font-medium flex items-center group">
                      {link.label}
                      <ArrowUpRight size={14} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Resources</h4>
              <ul className="space-y-4">
                {footerLinks.resources.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-slate-500 hover:text-indigo-400 transition-colors text-sm font-medium flex items-center group">
                      {link.label}
                      <ArrowUpRight size={14} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6 col-span-2 md:col-span-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Official Contact</h4>
              <ul className="space-y-5">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-500 font-medium leading-relaxed">
                    Mahesh,<br />
                    Srikakulam, AP, India
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-indigo-500 shrink-0" />
                  <a href="mailto:mahesh20104@gmail.com" className="text-sm text-slate-500 hover:text-white font-medium transition-colors">
                    mahesh20104@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-indigo-500 shrink-0" />
                  <a href="tel:+916281835791" className="text-sm text-slate-500 hover:text-white font-medium transition-colors">
                    +91 6281835791
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="space-y-2">
            <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
              © 2026 EVENTHUB PRO. All rights reserved.
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4">
               <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Global System Status: Operational
               </div>
               <div className="w-1 h-1 rounded-full bg-slate-800" />
               <div className="flex items-center gap-2 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                  <Globe size={12} /> System Language: EN-US
               </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Protocol Secured</span>
             </div>
             <div className="w-px h-6 bg-slate-900" />
             <div className="flex items-center gap-4">
                <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-4 grayscale hover:grayscale-0 transition-all opacity-30 hover:opacity-100" />
                <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-4 grayscale hover:grayscale-0 transition-all opacity-30 hover:opacity-100" />
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
