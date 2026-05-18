import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut, Upload, Swords, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [matchData, setMatchData] = useState({ opponentId: '', score1: '', score2: '' });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !data) {
        // If not registered yet, go to register
        navigate('/register');
      } else {
        setUserData(data);
      }
      setLoading(false);
    };
    fetchUser();
  }, [navigate]);

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate('/');
  };

  const submitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshot) return alert('Screenshot is required');
    setUploadLoading(true);
    setUploadSuccess(false);
    
    try {
      const form = new FormData();
      form.append('uid', userData.id);
      form.append('opponentId', matchData.opponentId);
      form.append('score1', matchData.score1);
      form.append('score2', matchData.score2);
      form.append('resultScreenshot', screenshot);

      await axios.post('/api/results', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadSuccess(true);
      setScreenshot(null);
      setMatchData({ opponentId: '', score1: '', score2: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to upload result.');
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return <div className="h-screen bg-fc-dark flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-fc-green"></div></div>;
  }

  return (
    <div className="min-h-screen bg-fc-dark text-white p-6 pb-20">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-10 pt-4 border-b border-white/10 pb-4">
         <div>
            <h1 className="font-display uppercase text-2xl">Player Dashboard</h1>
            <p className="text-gray-400 font-mono text-xs mt-1">UID: {userData?.fc_uid}</p>
         </div>
         <button onClick={handleSignOut} className="text-gray-400 hover:text-white transition-colors">
            <LogOut className="w-6 h-6" />
         </button>
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        
        {userData?.status === 'pending' && (
           <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-6 flex items-start gap-4">
              <Clock className="w-8 h-8 text-yellow-500 shrink-0 mt-1" />
              <div>
                 <h2 className="font-display uppercase text-xl text-yellow-500 mb-1">Application Under Review</h2>
                 <p className="text-yellow-200/70 text-sm">Your application is currently being reviewed by the admins via Telegram. Please check back later.</p>
              </div>
           </div>
        )}

        {userData?.status === 'rejected' && (
           <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-red-500 shrink-0 mt-1" />
              <div>
                 <h2 className="font-display uppercase text-xl text-red-500 mb-1">Application Rejected</h2>
                 <p className="text-red-200/70 text-sm">Unfortunately, your application was not approved for this tournament.</p>
              </div>
           </div>
        )}

        {userData?.status === 'approved' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-fc-card border border-white/5 rounded-3xl p-6">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-full bg-fc-green/10 flex items-center justify-center">
                     <Swords className="w-5 h-5 text-fc-green" />
                   </div>
                   <h2 className="font-display text-xl uppercase tracking-wider">Report Result</h2>
                 </div>

                 {uploadSuccess && (
                   <div className="mb-4 bg-fc-green/10 text-fc-green px-4 py-3 rounded-lg text-sm font-medium border border-fc-green/20">
                      Result successfully uploaded for admin verification!
                   </div>
                 )}

                 <form onSubmit={submitResult} className="space-y-4">
                    <label className="block">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1 mb-1 block">Opponent Name or UID</span>
                      <input required type="text" value={matchData.opponentId} onChange={e => setMatchData({...matchData, opponentId: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-fc-green transition-colors" placeholder="Opponent" />
                    </label>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <label className="block">
                         <span className="text-xs text-fc-green uppercase tracking-wider font-semibold ml-1 mb-1 block">Your Score</span>
                         <input required type="number" value={matchData.score1} onChange={e => setMatchData({...matchData, score1: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-center text-xl font-display placeholder:text-gray-600 focus:outline-none focus:border-fc-green transition-colors" placeholder="0" />
                       </label>
                       <label className="block">
                         <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1 mb-1 block">Opponent Score</span>
                         <input required type="number" value={matchData.score2} onChange={e => setMatchData({...matchData, score2: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-center text-xl font-display placeholder:text-gray-600 focus:outline-none focus:border-fc-green transition-colors" placeholder="0" />
                       </label>
                    </div>

                    <div className="space-y-1">
                       <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1">Match Screenshot</span>
                       <label className={cn(
                          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors relative overflow-hidden",
                          screenshot ? "border-fc-green bg-fc-green/5" : "border-gray-600 hover:border-gray-400 bg-black/50"
                       )}>
                         {screenshot ? (
                            <span className="font-mono text-xs text-fc-green px-2 text-center break-all">{screenshot.name}</span>
                         ) : (
                            <>
                              <Upload className="w-6 h-6 text-gray-400 mb-2" />
                              <span className="text-xs text-gray-400 font-medium">Upload Screenshot</span>
                            </>
                         )}
                         <input required type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
                       </label>
                    </div>

                    <button 
                       disabled={uploadLoading}
                       type="submit" 
                       className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {uploadLoading ? 'Uploading...' : 'Submit Result'}
                    </button>
                 </form>
              </div>

              <div className="bg-fc-card border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center opacity-60">
                 <h2 className="font-display text-xl uppercase tracking-wider mb-2">Tournament Bracket</h2>
                 <p className="text-sm font-sans text-gray-400 max-w-xs">The Round of 32 bracket will be generated and managed by admins once all registrations are approved.</p>
              </div>

           </div>
        )}
      </main>
    </div>
  );
}
