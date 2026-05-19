import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { LogIn, Upload, CheckCircle, Clock, XCircle, Trophy } from 'lucide-react';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        navigate('/dashboard');
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        navigate('/dashboard');
      } else {
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-white/5 bg-fc-dark/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-8 h-8 text-fc-green" />
            <h1 className="font-display uppercase text-xl font-bold tracking-wider">KnoX11 Tourney</h1>
          </div>
          {session ? (
            <div className="flex items-center gap-4">
              {isAdmin && (
                <a href="/admin" className="text-emerald-400 font-semibold uppercase text-sm border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors">
                  Admin Panel
                </a>
              )}
              <button onClick={handleLogout} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 py-8">
        {!session ? (
          <>
            <div className="text-center py-20 px-4">
              <h1 className="text-5xl md:text-6xl font-display uppercase font-bold mb-6 tracking-tight text-fc-green">Show Your <br />KnoX11 Skills</h1>
              <p className="text-xl text-gray-400 mb-10 max-w-lg mx-auto">Register for the ultimate tournament, compete with the best, and prove your team's worth.</p>
              <button 
                onClick={handleLogin}
                className="inline-flex items-center gap-3 bg-fc-green text-black px-8 py-4 rounded-full font-bold uppercase tracking-wider hover:bg-emerald-400 transition-transform active:scale-95 text-lg"
              >
                <LogIn className="w-5 h-5" /> Sign in with Google to Register
              </button>
            </div>

            <div className="bg-gray-950 border border-white/5 rounded-3xl p-8 mt-12 text-left mb-20 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-fc-green"></div>
               <h2 className="font-display text-2xl uppercase tracking-wider mb-6 pb-4 border-b border-white/5 text-white">Tournament Rules</h2>
               <div className="text-gray-400 space-y-4 font-sans text-sm md:text-base leading-relaxed">
                 <p>Welcome to the ultimate test of your KnoX11 skills! The full rulebook will be published here shortly.</p>
                 <ul className="list-disc pl-6 space-y-2 mt-4 text-fc-green/80">
                   <li><span className="text-gray-400">All participants must play with their registered FC Mobile squads.</span></li>
                   <li><span className="text-gray-400">Match results must be supported by 2 leg screenshots.</span></li>
                   <li><span className="text-gray-400">Fair play is strictly enforced by our admin team.</span></li>
                 </ul>
                 <p className="mt-6 pt-4 border-t border-white/5">Please join our <a href="#" className="text-fc-green underline hover:text-emerald-400">Telegram Channel</a> for immediate updates and announcements.</p>
               </div>
            </div>
          </>
        ) : (
           <div className="text-center py-32 text-gray-400 font-display uppercase tracking-widest animate-pulse">
              Redirecting to your Dashboard...
           </div>
        )}
      </main>
    </div>
  );
}
