import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { LogIn, Upload, CheckCircle, Clock, XCircle, Trophy } from 'lucide-react';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    name: '', age: '', mobile: '', fcName: '', fcUid: '', fcOvr: '', fcExperience: ''
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [payment, setPayment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    setUserData(data);
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!supabase) return alert('Supabase is not configured. Please add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSubmitting(true);
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value as string));
    data.append('uid', session.user.id);
    data.append('email', session.user.email);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        body: data,
      });
      const result = await res.json();
      if (result.success) {
        setUserData(result.user);
      } else {
        alert(result.error);
      }
    } catch (err) {
      console.error(err);
      alert('Registration failed.');
    }
    setSubmitting(false);
  };

  const [matchData, setMatchData] = useState({ score1: '', score2: '', opponentId: '' });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploadingMatch, setUploadingMatch] = useState(false);

  const handleMatchUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingMatch(true);
    
    const data = new FormData();
    data.append('uid', session.user.id);
    Object.entries(matchData).forEach(([key, value]) => data.append(key, value as string));

    try {
      const res = await fetch('/api/results', { method: 'POST', body: data });
      const result = await res.json();
      if (result.success) {
        alert('Match result submitted!');
        setMatchData({ score1: '', score2: '', opponentId: '' });
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Upload failed.');
    }
    setUploadingMatch(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-emerald-400">
            <Trophy className="w-6 h-6" /> KnoX11 Tourney
          </div>
          {session ? (
            <button onClick={handleLogout} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Sign Out
            </button>
          ) : null}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-4 py-8">
        {!session ? (
          <div className="text-center py-20 px-4">
            <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Show Your KnoX11 Skills</h1>
            <p className="text-xl text-gray-400 mb-10 max-w-lg mx-auto">Register for the ultimate tournament, compete with the best, and prove your team's worth.</p>
            <button 
              onClick={handleLogin}
              className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-transform active:scale-95"
            >
              <LogIn className="w-5 h-5" /> Sign in with Google to Register
            </button>
          </div>
        ) : !userData ? (
          <div className="bg-gray-900 border border-gray-800 p-6 md:p-8 rounded-2xl shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Complete Registration</h2>
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Age</label>
                  <input required type="number" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Mobile Number</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">FC Team Name</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" value={formData.fcName} onChange={e => setFormData({...formData, fcName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">FC UID</label>
                  <input required className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" value={formData.fcUid} onChange={e => setFormData({...formData, fcUid: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Team OVR</label>
                  <input required type="number" className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" value={formData.fcOvr} onChange={e => setFormData({...formData, fcOvr: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">KnoX11 Experience (Years/Months)</label>
                <input required className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" value={formData.fcExperience} onChange={e => setFormData({...formData, fcExperience: e.target.value})} />
              </div>

              <button 
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl mt-6 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {submitting ? 'Submitting...' : 'Submit Registration'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex items-start gap-4">
              {userData.status === 'approved' && <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />}
              {userData.status === 'pending' && <Clock className="w-8 h-8 text-yellow-500 shrink-0" />}
              {userData.status === 'rejected' && <XCircle className="w-8 h-8 text-red-500 shrink-0" />}
              
              <div>
                <h3 className="text-lg font-bold">
                  {userData.status === 'approved' ? 'Registration Approved!' : 
                   userData.status === 'pending' ? 'Application Under Review' : 'Application Rejected'}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {userData.status === 'approved' ? "You're all set to compete. Upload your match results below." : 
                   userData.status === 'pending' ? "The admins are reviewing your details. You'll be notified via Telegram once approved." : 
                   "Unfortunately, your registration was not approved. Contact an admin for details."}
                </p>
              </div>
            </div>

            {/* Match Upload Section (Only if approved) */}
            {userData.status === 'approved' && (
              <div className="bg-gray-900 border border-gray-800 p-6 md:p-8 rounded-2xl">
                <h2 className="text-xl font-bold mb-6">Submit Match Result</h2>
                <form onSubmit={handleMatchUpload} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Your Score</label>
                      <input type="number" required className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-2xl font-black text-center" value={matchData.score1} onChange={e => setMatchData({...matchData, score1: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Opponent Score</label>
                      <input type="number" required className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-2xl font-black text-center" value={matchData.score2} onChange={e => setMatchData({...matchData, score2: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Opponent Team/ID</label>
                    <input required className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" value={matchData.opponentId} onChange={e => setMatchData({...matchData, opponentId: e.target.value})} />
                  </div>

                  <button 
                    disabled={uploadingMatch}
                    className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
                  >
                    {uploadingMatch ? 'Uploading...' : 'Submit Result'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
