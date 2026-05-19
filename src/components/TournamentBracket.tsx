import React from 'react';
import { cn } from '../lib/utils';

export default function TournamentBracket({ brackets }: { brackets: any[] }) {
  const getRound = (round: string) => brackets.filter(b => b.round === round).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  const allRounds = ['Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'];
  const activeRounds = allRounds.map(r => ({ name: r, matches: getRound(r) })).filter(r => r.matches.length > 0);

  if (activeRounds.length === 0) return (
     <div className="flex flex-col items-center justify-center text-center opacity-60 h-32 text-sm text-gray-400">
        <p className="max-w-xs">The tournament bracket will be generated and managed by admins once all registrations are approved.</p>
     </div>
  );

  return (
    <div className="w-full flex overflow-x-auto pb-4 custom-scrollbar">
      <div className="flex bg-gray-950/50 p-6 rounded-2xl gap-8 relative items-stretch min-w-max border border-white/5 pt-12">
        {activeRounds.map((round) => (
          <div key={round.name} className="flex flex-col gap-4 justify-around w-64 shrink-0 relative">
            <div className="text-center font-display uppercase tracking-wider text-fc-green/80 text-sm mb-4 shrink-0 absolute -top-10 left-0 right-0">{round.name}</div>
            {round.matches.map((match) => (
              <div key={match.id} className="relative flex items-center bg-gray-900 border border-white/10 rounded-xl p-3 shadow-lg z-10 w-full hover:border-fc-green/50 transition-colors">
                <div className="flex flex-col gap-2 w-full">
                   <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-wider">
                      <span>{match.match_date || 'Date TBD'}</span>
                      {match.winner_id && <span className="text-fc-green tracking-widest font-bold">FT</span>}
                   </div>
                   <div className="flex justify-between items-center">
                      <span className={cn("text-sm truncate mr-2 font-medium", match.winner_id && match.winner_id === match.player1_id ? "text-fc-green font-bold" : "text-gray-200")}>
                        {match.player1?.name || match.fc_team1 || 'TBD'}
                      </span>
                      <span className="font-mono text-sm bg-black px-2 py-0.5 rounded text-gray-300 font-bold">{match.score1}</span>
                   </div>
                   <div className="h-px bg-white/5 my-0.5"></div>
                   <div className="flex justify-between items-center">
                      <span className={cn("text-sm truncate mr-2 font-medium", match.winner_id && match.winner_id === match.player2_id ? "text-fc-green font-bold" : "text-gray-200")}>
                        {match.player2?.name || match.fc_team2 || 'TBD'}
                      </span>
                      <span className="font-mono text-sm bg-black px-2 py-0.5 rounded text-gray-300 font-bold">{match.score2}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
