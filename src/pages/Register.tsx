import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion } from 'motion/react';
import { Upload, ChevronRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userAuth, setUserAuth] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    mobile: '',
    fcName: '',
    fcUid: '',
    fcOvr: '',
    fcExperience: ''
  });

  const [photo, setPhoto] = useState<File | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
      } else {
        setUserAuth(session.user);
      }
    };
    checkUser();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!userAuth) throw new Error("Not authenticated");
      if (!photo || !paymentProof) throw new Error("Please upload both your photo and payment proof");

      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => form.append(key, value));
      form.append('uid', userAuth.id);
      form.append('email', userAuth.email || '');
      form.append('photo', photo);
      form.append('paymentProof', paymentProof);

      const response = await axios.post('/api/register', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setSuccess(true);
      } else {
        throw new Error(response.data.error || 'Registration failed');
      }

    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-fc-dark flex flex-col items-center justify-center p-6 text-center">
         <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-fc-card p-10 rounded-3xl border border-white/5 shadow-2xl max-w-sm w-full"
         >
           <CheckCircle2 className="w-20 h-20 text-fc-green mx-auto mb-6" />
           <h2 className="font-display uppercase text-3xl mb-4">Registration Sent</h2>
           <p className="text-gray-400 font-sans text-sm mb-8">
             Your application is now under admin review. Once approved, you will be able to access your dashboard.
           </p>
           <button 
             onClick={() => navigate('/dashboard')}
             className="w-full bg-white text-black font-semibold py-3 rounded-full hover:bg-gray-200 transition-colors"
           >
             Go to Dashboard
           </button>
         </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fc-dark text-white p-6 pb-20">
      <div className="max-w-2xl mx-auto">
        <header className="mb-10 text-center pt-8">
          <h1 className="font-display uppercase text-4xl mb-2">Player Registration</h1>
          <p className="text-gray-400 text-sm">Please fill out your FC Mobile details.</p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-start gap-3">
             <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-400" />
             <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-fc-card p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="font-display uppercase text-xl text-fc-green">Personal Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1 mb-1 block">Full Name</span>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-fc-green transition-colors" placeholder="John Doe" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1 mb-1 block">Age</span>
                <input required type="number" name="age" value={formData.age} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-fc-green transition-colors" placeholder="18" />
              </label>
            </div>
            
            <label className="block">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1 mb-1 block">Mobile Number</span>
              <input required type="tel" name="mobile" value={formData.mobile} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-fc-green transition-colors" placeholder="+1 234 567 8900" />
            </label>
          </div>

          <div className="bg-fc-card p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="font-display uppercase text-xl text-fc-green">FC Mobile Profile</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1 mb-1 block">In-Game Name</span>
                <input required type="text" name="fcName" value={formData.fcName} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-fc-green transition-colors" placeholder="xX_Striker_Xx" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1 mb-1 block">Player UID</span>
                <input required type="text" name="fcUid" value={formData.fcUid} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-fc-green transition-colors" placeholder="123456789" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1 mb-1 block">Team OVR</span>
                <input required type="number" name="fcOvr" value={formData.fcOvr} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-fc-green transition-colors" placeholder="95" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1 mb-1 block">Experience</span>
                <select required name="fcExperience" value={formData.fcExperience} onChange={handleChange} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fc-green transition-colors">
                  <option value="" disabled>Select Level</option>
                  <option value="Beginner">Beginner (&lt; 1 Year)</option>
                  <option value="Intermediate">Intermediate (1-2 Years)</option>
                  <option value="Advanced">Advanced (2+ Years)</option>
                  <option value="Pro">Pro / Tournament Player</option>
                </select>
              </label>
            </div>
          </div>

          <div className="bg-fc-card p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="font-display uppercase text-xl text-fc-green">Attachments</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                 <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1">Personal Photo</span>
                 <label className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors relative overflow-hidden",
                    photo ? "border-fc-green bg-fc-green/5" : "border-gray-600 hover:border-gray-400 bg-black/50"
                 )}>
                   {photo ? (
                      <span className="font-mono text-xs text-fc-green px-2 text-center break-all">{photo.name}</span>
                   ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-400 font-medium">Upload Image</span>
                      </>
                   )}
                   <input required type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                 </label>
              </div>

              <div className="space-y-1">
                 <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1">Payment Proof</span>
                 <label className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors relative overflow-hidden",
                    paymentProof ? "border-fc-green bg-fc-green/5" : "border-gray-600 hover:border-gray-400 bg-black/50"
                 )}>
                   {paymentProof ? (
                      <span className="font-mono text-xs text-fc-green px-2 text-center break-all">{paymentProof.name}</span>
                   ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-400 font-medium">Upload Screenshot</span>
                      </>
                   )}
                   <input required type="file" accept="image/*" className="hidden" onChange={(e) => setPaymentProof(e.target.files?.[0] || null)} />
                 </label>
              </div>
            </div>
          </div>

          <button 
             disabled={loading}
             type="submit" 
             className="w-full flex items-center justify-center gap-2 bg-fc-green text-black font-display text-xl uppercase tracking-wider py-4 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Complete Registration'}
            {!loading && <ChevronRight className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
