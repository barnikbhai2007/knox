import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Users, LayoutDashboard, Shield, LogOut, Check, X, Trash2, Edit2, Save } from 'lucide-react';
import { cn } from '../lib/utils';

type UserData = {
  id: string;
  name: string;
  fc_name: string;
  fc_uid: string;
  fc_ovr: number;
  fc_experience: string;
  mobile: string;
  status: string;
};

type Bracket = {
  id?: string;
  round: string;
  player1_id: string;
  player2_id: string;
  score1: number;
  score2: number;
  fc_team1: string;
  fc_team2: string;
  winner_id?: string | null;
};

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'brackets'>('users');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  // Users State
  const [users, setUsers] = useState<UserData[]>([]);
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Brackets State
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [newMatch, setNewMatch] = useState<Partial<Bracket>>({
    round: 'Round of 16',
    score1: 0,
    score2: 0,
    fc_team1: '',
    fc_team2: '',
  });
  const [editingBracketId, setEditingBracketId] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/');
      return;
    }
    setIsAdmin(true);
    setLoadingSession(false);
    fetchUsers();
    fetchBrackets();
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (!error && data) setUsers(data);
  };

  const fetchBrackets = async () => {
    const { data, error } = await supabase.from('brackets').select('*').order('created_at', { ascending: false });
    if (!error && data) setBrackets(data);
  };

  const updateUserStatus = async (uid: string, status: string) => {
    const { error } = await supabase.from('users').update({ status }).eq('id', uid);
    if (!error) {
      setUsers(users.map(u => u.id === uid ? { ...u, status } : u));
    }
  };

  const deleteUser = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const { error } = await supabase.from('users').delete().eq('id', uid);
    if (!error) {
      setUsers(users.filter(u => u.id !== uid));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Bracket CRUD
  const saveBracket = async (bracket: Partial<Bracket>) => {
    let p1Score = parseInt(bracket.score1 as any) || 0;
    let p2Score = parseInt(bracket.score2 as any) || 0;
    
    let winner = null;
    if (p1Score > p2Score && bracket.player1_id) winner = bracket.player1_id;
    if (p2Score > p1Score && bracket.player2_id) winner = bracket.player2_id;

    const payload = {
      round: bracket.round,
      player1_id: bracket.player1_id,
      player2_id: bracket.player2_id,
      score1: p1Score,
      score2: p2Score,
      fc_team1: bracket.fc_team1,
      fc_team2: bracket.fc_team2,
      winner_id: winner,
    };

    if (bracket.id) {
      const { error } = await supabase.from('brackets').update(payload).eq('id', bracket.id);
      if (!error) {
        setBrackets(brackets.map(b => b.id === bracket.id ? { ...b, ...payload } : b));
        setEditingBracketId(null);
      }
    } else {
      const { data, error } = await supabase.from('brackets').insert([payload]).select().single();
      if (!error && data) {
        setBrackets([data, ...brackets]);
        setNewMatch({ round: 'Round of 16', score1: 0, score2: 0, fc_team1: '', fc_team2: '' });
      }
    }
  };

  const deleteBracket = async (id: string) => {
    if (!confirm('Delete this match?')) return;
    const { error } = await supabase.from('brackets').delete().eq('id', id);
    if (!error) setBrackets(brackets.filter(b => b.id !== id));
  };

  if (loadingSession) {
    return <div className="min-h-screen bg-fc-dark flex items-center justify-center"><p className="text-white">Loading...</p></div>;
  }

  const filteredUsers = users.filter(u => userFilter === 'all' || u.status === userFilter);
  const approvedUsers = users.filter(u => u.status === 'approved');

  const getUserName = (id: string) => {
    return users.find(u => u.id === id)?.name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-fc-dark text-white font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-gray-950/80 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <Shield className="w-8 h-8 text-fc-green" />
          <h1 className="font-display uppercase text-xl font-bold tracking-wider">Admin</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab('users')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left", activeTab === 'users' ? 'bg-fc-green/20 text-fc-green' : 'text-gray-400 hover:bg-white/5')}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Users</span>
          </button>
          <button
            onClick={() => setActiveTab('brackets')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left", activeTab === 'brackets' ? 'bg-fc-green/20 text-fc-green' : 'text-gray-400 hover:bg-white/5')}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Bracket Editor</span>
          </button>
        </nav>

        <button onClick={handleLogout} className="mt-auto flex items-center gap-2 text-gray-400 hover:text-white transition-colors p-4">
          <LogOut className="w-5 h-5" /> Log out
        </button>
      </aside>

      <main className="flex-1 p-4 md:p-10 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="font-display uppercase text-3xl text-fc-green">Manage Users</h2>
                <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
                  {['all', 'pending', 'approved', 'rejected'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setUserFilter(filter as any)}
                      className={cn("px-4 py-2 rounded-lg text-sm font-medium capitalize", filter === userFilter ? 'bg-fc-green text-black' : 'text-gray-400 hover:text-white')}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-950/50 rounded-2xl border border-white/10 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white/5 text-gray-400">
                    <tr>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Player</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">UID / OVR</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Mobile</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-gray-500 text-xs">{user.fc_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-300">{user.fc_uid}</p>
                          <p className="text-gray-500 text-xs text-fc-green">{user.fc_ovr} OVR • {user.fc_experience}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{user.mobile}</td>
                        <td className="px-6 py-4">
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold capitalize",
                            user.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            user.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          )}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => updateUserStatus(user.id, 'approved')} title="Approve" className="p-2 bg-white/5 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateUserStatus(user.id, 'rejected')} title="Reject" className="p-2 bg-white/5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteUser(user.id)} title="Delete" className="p-2 bg-white/5 hover:bg-red-500 text-gray-400 hover:text-white rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'brackets' && (
            <div className="space-y-8">
              <h2 className="font-display uppercase text-3xl text-fc-green">Bracket Editor</h2>

              <div className="bg-gray-950/50 p-6 rounded-2xl border border-white/10 space-y-4">
                <h3 className="text-xl font-medium tracking-tight mb-4">Create New Match</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 uppercase">Round</label>
                    <input type="text" value={newMatch.round} onChange={e => setNewMatch({ ...newMatch, round: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 focus:border-fc-green transition-colors outline-none" />
                  </div>

                  <div className="space-y-1 lg:col-span-2">
                    <label className="text-xs text-gray-400 uppercase text-fc-green">Player 1</label>
                    <select value={newMatch.player1_id || ""} onChange={e => setNewMatch({ ...newMatch, player1_id: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white">
                      <option value="">Select Player...</option>
                      {approvedUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.fc_name})</option>)}
                    </select>
                    <input type="text" placeholder="FC Team Name" value={newMatch.fc_team1} onChange={e => setNewMatch({ ...newMatch, fc_team1: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 mt-2 text-sm" />
                    <input type="number" placeholder="Score" value={newMatch.score1} onChange={e => setNewMatch({ ...newMatch, score1: parseInt(e.target.value) || 0 })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 mt-2 text-sm" />
                  </div>

                  <div className="space-y-1 lg:col-span-2">
                    <label className="text-xs text-gray-400 uppercase text-red-500">Player 2</label>
                    <select value={newMatch.player2_id || ""} onChange={e => setNewMatch({ ...newMatch, player2_id: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-white">
                      <option value="">Select Player...</option>
                      {approvedUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.fc_name})</option>)}
                    </select>
                    <input type="text" placeholder="FC Team Name" value={newMatch.fc_team2} onChange={e => setNewMatch({ ...newMatch, fc_team2: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 mt-2 text-sm" />
                    <input type="number" placeholder="Score" value={newMatch.score2} onChange={e => setNewMatch({ ...newMatch, score2: parseInt(e.target.value) || 0 })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 mt-2 text-sm" />
                  </div>
                </div>
                <button onClick={() => saveBracket(newMatch)} disabled={!newMatch.player1_id || !newMatch.player2_id} className="w-full py-3 bg-fc-green text-black font-bold uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 mt-4">
                  Add Match
                </button>
              </div>

              <div className="space-y-4">
                {brackets.map(bracket => {
                  const isEditing = editingBracketId === bracket.id;
                  
                  if (isEditing) {
                    return (
                      <div key={bracket.id} className="bg-gray-950/80 p-4 rounded-xl border border-fc-green/50 space-y-4">
                         <div className="flex justify-between items-center mb-2">
                            <input type="text" value={bracket.round} onChange={e => setBrackets(brackets.map(b => b.id === bracket.id ? { ...b, round: e.target.value } : b))} className="bg-black border border-white/10 rounded px-2 py-1 text-sm outline-none" />
                            <button onClick={() => saveBracket(bracket)} className="flex items-center gap-1 text-sm text-black bg-fc-green px-3 py-1 rounded"><Save className="w-4 h-4"/> Save</button>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <select value={bracket.player1_id || ""} onChange={e => setBrackets(brackets.map(b => b.id === bracket.id ? { ...b, player1_id: e.target.value } : b))} className="w-full bg-black border border-white/10 rounded px-2 py-1 mb-2 text-sm">
                                  {approvedUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                               </select>
                               <input type="text" value={bracket.fc_team1} onChange={e => setBrackets(brackets.map(b => b.id === bracket.id ? { ...b, fc_team1: e.target.value } : b))} className="w-full bg-black border border-white/10 rounded px-2 py-1 mb-2 text-sm" placeholder="Team" />
                               <input type="number" value={bracket.score1} onChange={e => setBrackets(brackets.map(b => b.id === bracket.id ? { ...b, score1: parseInt(e.target.value) || 0 } : b))} className="w-full bg-black border border-white/10 rounded px-2 py-1 mb-2 text-sm" placeholder="Score" />
                            </div>
                            <div>
                               <select value={bracket.player2_id || ""} onChange={e => setBrackets(brackets.map(b => b.id === bracket.id ? { ...b, player2_id: e.target.value } : b))} className="w-full bg-black border border-white/10 rounded px-2 py-1 mb-2 text-sm">
                                  {approvedUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                               </select>
                               <input type="text" value={bracket.fc_team2} onChange={e => setBrackets(brackets.map(b => b.id === bracket.id ? { ...b, fc_team2: e.target.value } : b))} className="w-full bg-black border border-white/10 rounded px-2 py-1 mb-2 text-sm" placeholder="Team" />
                               <input type="number" value={bracket.score2} onChange={e => setBrackets(brackets.map(b => b.id === bracket.id ? { ...b, score2: parseInt(e.target.value) || 0 } : b))} className="w-full bg-black border border-white/10 rounded px-2 py-1 mb-2 text-sm" placeholder="Score" />
                            </div>
                         </div>
                      </div>
                    );
                  }

                  return (
                    <div key={bracket.id} className="group bg-gray-950/30 p-4 rounded-xl border border-white/5 flex items-center justify-between hover:bg-gray-950/60 transition-colors">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold font-display">{bracket.round}</p>
                        <div className="flex items-center gap-6">
                          <div className={cn("flex flex-col", bracket.winner_id === bracket.player1_id ? "text-fc-green font-bold" : "text-gray-300")}>
                            <span>{getUserName(bracket.player1_id)}</span>
                            <span className="text-xs opacity-60">{bracket.fc_team1 || 'TBA'}</span>
                          </div>
                          
                          <div className="bg-black/80 px-4 py-2 rounded-lg border border-white/10 font-mono font-bold text-lg">
                            {bracket.score1} - {bracket.score2}
                          </div>

                          <div className={cn("flex flex-col text-right", bracket.winner_id === bracket.player2_id ? "text-fc-green font-bold" : "text-gray-300")}>
                            <span>{getUserName(bracket.player2_id)}</span>
                            <span className="text-xs opacity-60">{bracket.fc_team2 || 'TBA'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="pl-4 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                         <button onClick={() => setEditingBracketId(bracket.id || null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                           <Edit2 className="w-4 h-4"/>
                         </button>
                         <button onClick={() => deleteBracket(bracket.id!)} className="p-2 bg-white/5 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors">
                           <Trash2 className="w-4 h-4"/>
                         </button>
                      </div>
                    </div>
                  );
                })}
                {brackets.length === 0 && <p className="text-gray-500 text-center py-8">No brackets matches created yet.</p>}
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
