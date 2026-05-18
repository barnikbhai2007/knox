import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trophy, Users, Edit3, X, Check } from 'lucide-react';

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabase) {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase!.from('users').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await supabase!.from('users').update({ status }).eq('id', id);
    fetchUsers();
  };

  if (!supabase) {
    return <div className="p-8 text-white">Supabase not configured.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-emerald-500" />
          <h1 className="text-3xl font-black tracking-tight">Tournament Admin</h1>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-gray-400"/> Registrations</h2>
            <div className="text-sm font-medium bg-gray-800 px-3 py-1 rounded-full">{users.length} Total</div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-950/50 text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Player</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">FC Info</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Assets</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-base">{u.name}</div>
                      <div className="text-gray-400 text-xs mt-0.5">{u.email} • {u.mobile} • Age {u.age}</div>
                      <div className="text-gray-500 text-[10px] mt-1 font-mono">{u.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-emerald-400">{u.fc_name} <span className="text-gray-400">(OVR: {u.fc_ovr})</span></div>
                      <div className="text-gray-400 text-xs mt-0.5">UID: {u.fc_uid} • {u.fc_experience}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {u.photo_url ? <a href={u.photo_url} target="_blank" rel="noreferrer" className="text-xs font-medium bg-gray-800 text-gray-300 px-2 py-1 rounded hover:bg-gray-700 transition">Photo</a> : <span className="text-xs text-gray-600">No Photo</span>}
                        {u.payment_proof_url ? <a href={u.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs font-medium bg-gray-800 text-gray-300 px-2 py-1 rounded hover:bg-gray-700 transition">Payment</a> : <span className="text-xs text-gray-600">No Payment</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${u.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : u.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {u.status !== 'approved' && (
                        <button onClick={() => handleUpdateStatus(u.id, 'approved')} className="text-sm font-bold bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5">
                          <Check className="w-4 h-4"/> Approve
                        </button>
                      )}
                      {u.status !== 'rejected' && (
                        <button onClick={() => handleUpdateStatus(u.id, 'rejected')} className="text-sm font-bold bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5">
                          <X className="w-4 h-4"/> Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">No registrations received yet.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">Loading participants...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
