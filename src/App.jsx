import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import { therapies } from './data/therapies';
import { therapists } from './data/therapists';

const EVENT_LABELS = {
  quiz_started: 'Quizzes iniciados',
  quiz_completed: 'Quizzes concluídos',
  result_shown: 'Resultados exibidos',
  content_click: 'Cliques em conteúdo',
  therapist_click: 'Cliques no terapeuta',
  whatsapp_click: 'Cliques no WhatsApp',
  share_click: 'Compartilhamentos',
};

function PasscodeGate({ onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const expected = import.meta.env.VITE_ADMIN_PASSCODE;

  const submit = (e) => {
    e.preventDefault();
    if (!expected || value === expected) {
      sessionStorage.setItem('ft_admin_unlocked', '1');
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf8ff] to-[#f0e8f8] flex items-center justify-center px-4">
      <form onSubmit={submit} className="bg-white/90 rounded-2xl p-8 border border-[#e0d0f5] shadow-sm w-full max-w-sm">
        <p className="text-[#7C16A7] font-bold text-xs tracking-widest uppercase text-center mb-1">Futuroterapia</p>
        <h1 className="text-[#2d1b4e] font-extrabold text-lg text-center mb-5">Dashboard de resultados</h1>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Senha de acesso"
          className="w-full border border-[#e0d0f5] rounded-xl px-4 py-2.5 text-sm mb-3 outline-none focus:border-[#7C16A7]"
        />
        {error && <p className="text-[#FF3F00] text-xs mb-3">Senha incorreta.</p>}
        <button className="w-full bg-[#7C16A7] hover:bg-[#6a1290] text-white font-bold text-sm py-2.5 rounded-xl cursor-pointer transition-colors">
          Entrar
        </button>
      </form>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="bg-white/80 rounded-2xl p-4 border border-[#e0d0f5] shadow-sm">
      <p className="text-[#9d7bb5] text-xs font-medium mb-1">{label}</p>
      <p className="text-[#2d1b4e] font-extrabold text-2xl">{value}</p>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('ft_admin_unlocked') === '1');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [therapyFilter, setTherapyFilter] = useState('all');
  const [therapistFilter, setTherapistFilter] = useState('all');

  useEffect(() => {
    if (!unlocked) return;
    if (!supabase) {
      setErrorMsg('Supabase não configurado — defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.');
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('quiz_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20000);
      if (!active) return;
      if (error) setErrorMsg(error.message);
      else setEvents(data || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [unlocked]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (therapyFilter !== 'all' && e.therapy_id !== therapyFilter) return false;
      if (therapistFilter !== 'all' && e.therapist_id !== therapistFilter) return false;
      return true;
    });
  }, [events, therapyFilter, therapistFilter]);

  const counts = useMemo(() => {
    const c = {};
    Object.keys(EVENT_LABELS).forEach(k => { c[k] = 0; });
    filtered.forEach(e => { c[e.event_type] = (c[e.event_type] || 0) + 1; });
    return c;
  }, [filtered]);

  const byTherapy = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      if (!e.therapy_id) return;
      if (!map[e.therapy_id]) {
        map[e.therapy_id] = {
          id: e.therapy_id,
          name: e.therapy_name || e.therapy_id,
          principal: 0, secundario: 0, conteudo: 0, terapeuta: 0, whatsapp: 0,
        };
      }
      const row = map[e.therapy_id];
      if (e.event_type === 'result_shown') row.principal += 1;
      if (e.event_type === 'content_click') row.conteudo += 1;
      if (e.event_type === 'therapist_click') row.terapeuta += 1;
      if (e.event_type === 'whatsapp_click') row.whatsapp += 1;
    });
    filtered.forEach(e => {
      if (e.event_type === 'result_shown' && e.secondary_therapy_id) {
        if (!map[e.secondary_therapy_id]) {
          map[e.secondary_therapy_id] = {
            id: e.secondary_therapy_id,
            name: e.secondary_therapy_name || e.secondary_therapy_id,
            principal: 0, secundario: 0, conteudo: 0, terapeuta: 0, whatsapp: 0,
          };
        }
        map[e.secondary_therapy_id].secundario += 1;
      }
    });
    return Object.values(map).sort((a, b) => b.principal - a.principal);
  }, [filtered]);

  const byTherapist = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      if (!e.therapist_id) return;
      if (!map[e.therapist_id]) {
        map[e.therapist_id] = { id: e.therapist_id, name: e.therapist_name || e.therapist_id, terapeuta: 0, whatsapp: 0 };
      }
      if (e.event_type === 'therapist_click') map[e.therapist_id].terapeuta += 1;
      if (e.event_type === 'whatsapp_click') map[e.therapist_id].whatsapp += 1;
    });
    return Object.values(map).sort((a, b) => b.whatsapp - a.whatsapp);
  }, [filtered]);

  const funnel = [
    { label: 'Iniciou', value: counts.quiz_started },
    { label: 'Concluiu', value: counts.quiz_completed },
    { label: 'Viu conteúdo', value: counts.content_click },
    { label: 'Clicou terapeuta', value: counts.therapist_click },
    { label: 'WhatsApp aberto', value: counts.whatsapp_click },
  ];

  if (!unlocked) return <PasscodeGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf8ff] to-[#f0e8f8] px-4 py-8">
      <div className="max-w-5xl mx-auto w-full">

        <div className="text-center mb-6">
          <p className="text-[#7C16A7] font-bold text-xs tracking-widest uppercase mb-1">Futuroterapia</p>
          <h1 className="text-[#2d1b4e] font-extrabold text-2xl">Dashboard de resultados do quiz</h1>
        </div>

        {errorMsg && (
          <div className="bg-[#FF3F00]/10 border border-[#FF3F00]/30 text-[#a02d00] text-sm rounded-2xl p-4 mb-5">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <p className="text-center text-[#9d7bb5] text-sm">Carregando dados...</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={therapyFilter}
                onChange={(e) => setTherapyFilter(e.target.value)}
                className="border border-[#e0d0f5] rounded-xl px-3 py-2 text-sm bg-white text-[#3d2b55]"
              >
                <option value="all">Todas as terapias</option>
                {therapies.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select
                value={therapistFilter}
                onChange={(e) => setTherapistFilter(e.target.value)}
                className="border border-[#e0d0f5] rounded-xl px-3 py-2 text-sm bg-white text-[#3d2b55]"
              >
                <option value="all">Todos os terapeutas</option>
                {therapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <KpiCard label="Quizzes iniciados" value={counts.quiz_started} />
              <KpiCard label="Quizzes concluídos" value={counts.quiz_completed} />
              <KpiCard label="Cliques em conteúdo" value={counts.content_click} />
              <KpiCard label="Cliques no WhatsApp" value={counts.whatsapp_click} />
            </div>

            <div className="bg-white/80 rounded-2xl p-5 mb-6 border border-[#e0d0f5] shadow-sm overflow-x-auto">
              <p className="text-[#3d2b55] font-semibold text-sm mb-3">Funil de conversão</p>
              <div className="flex items-center gap-2 min-w-max">
                {funnel.map((f, i) => (
                  <div key={f.label} className="flex items-center gap-2">
                    <div className="bg-[#f3e8ff] rounded-xl px-4 py-2 text-center">
                      <p className="text-[#9d7bb5] text-xs">{f.label}</p>
                      <p className="text-[#2d1b4e] font-bold text-sm">{f.value}</p>
                    </div>
                    {i < funnel.length - 1 && <span className="text-[#c4b5fd]">→</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 rounded-2xl p-5 mb-6 border border-[#e0d0f5] shadow-sm overflow-x-auto">
              <p className="text-[#3d2b55] font-semibold text-sm mb-3">Comparativo entre terapias</p>
              {byTherapy.length === 0 ? (
                <p className="text-[#9d7bb5] text-sm">Sem dados ainda para esse filtro.</p>
              ) : (
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="text-[#9d7bb5] text-left">
                      <th className="py-1.5 pr-2">Terapia</th>
                      <th className="py-1.5 pr-2 text-right">Principal</th>
                      <th className="py-1.5 pr-2 text-right">Secundário</th>
                      <th className="py-1.5 pr-2 text-right">Conteúdo</th>
                      <th className="py-1.5 pr-2 text-right">Terapeuta</th>
                      <th className="py-1.5 text-right">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byTherapy.map(row => (
                      <tr key={row.id} className="border-t border-[#f0e6fa]">
                        <td className="py-1.5 pr-2 text-[#2d1b4e] font-medium">{row.name}</td>
                        <td className="py-1.5 pr-2 text-right">{row.principal}</td>
                        <td className="py-1.5 pr-2 text-right">{row.secundario}</td>
                        <td className="py-1.5 pr-2 text-right">{row.conteudo}</td>
                        <td className="py-1.5 pr-2 text-right">{row.terapeuta}</td>
                        <td className="py-1.5 text-right">{row.whatsapp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white/80 rounded-2xl p-5 border border-[#e0d0f5] shadow-sm overflow-x-auto">
              <p className="text-[#3d2b55] font-semibold text-sm mb-3">Resultados por terapeuta</p>
              {byTherapist.length === 0 ? (
                <p className="text-[#9d7bb5] text-sm">Sem dados ainda para esse filtro.</p>
              ) : (
                <table className="w-full text-sm min-w-[360px]">
                  <thead>
                    <tr className="text-[#9d7bb5] text-left">
                      <th className="py-1.5 pr-2">Terapeuta</th>
                      <th className="py-1.5 pr-2 text-right">Cliques no perfil</th>
                      <th className="py-1.5 text-right">Cliques no WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byTherapist.map(row => (
                      <tr key={row.id} className="border-t border-[#f0e6fa]">
                        <td className="py-1.5 pr-2 text-[#2d1b4e] font-medium">{row.name}</td>
                        <td className="py-1.5 pr-2 text-right">{row.terapeuta}</td>
                        <td className="py-1.5 text-right">{row.whatsapp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
