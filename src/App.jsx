import { useEffect, useMemo, useState } from 'react';

const METRICS_URL = import.meta.env.VITE_METRICS_URL || 'https://descubra.futuroterapia.com/api/public/quiz-metrics';

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
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [therapyFilter, setTherapyFilter] = useState('all');
  const [therapistFilter, setTherapistFilter] = useState('all');

  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(METRICS_URL);
        if (!res.ok) throw new Error(`Falha ao buscar métricas (${res.status})`);
        const data = await res.json();
        if (!active) return;
        setMetrics(data);
      } catch (err) {
        if (active) setErrorMsg(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [unlocked]);

  const countByType = useMemo(() => {
    const c = {};
    (metrics?.by_type || []).forEach(row => { c[row.event_type] = row.count; });
    return c;
  }, [metrics]);

  const byTherapy = useMemo(() => {
    let rows = metrics?.by_therapy || [];
    if (therapistFilter !== 'all') rows = []; // filtro de terapeuta não se aplica à tabela de terapias
    return [...rows].sort((a, b) => (b.principal || 0) - (a.principal || 0));
  }, [metrics, therapistFilter]);

  const byTherapist = useMemo(() => {
    let rows = metrics?.by_therapist || [];
    if (therapyFilter !== 'all') rows = []; // filtro de terapia não se aplica à tabela de terapeutas
    return [...rows].sort((a, b) => (b.whatsapp || 0) - (a.whatsapp || 0));
  }, [metrics, therapyFilter]);

  const therapyOptions = metrics?.by_therapy || [];
  const therapistOptions = metrics?.by_therapist || [];

  const funnel = [
    { label: 'Iniciou', value: countByType.quiz_started || 0 },
    { label: 'Concluiu', value: countByType.quiz_completed || 0 },
    { label: 'Viu conteúdo', value: countByType.content_click || 0 },
    { label: 'Clicou terapeuta', value: countByType.therapist_click || 0 },
    { label: 'WhatsApp aberto', value: countByType.whatsapp_click || 0 },
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
                {therapyOptions.map(t => <option key={t.therapy_id} value={t.therapy_id}>{t.therapy_name}</option>)}
              </select>
              <select
                value={therapistFilter}
                onChange={(e) => setTherapistFilter(e.target.value)}
                className="border border-[#e0d0f5] rounded-xl px-3 py-2 text-sm bg-white text-[#3d2b55]"
              >
                <option value="all">Todos os terapeutas</option>
                {therapistOptions.map(t => <option key={t.therapist_id} value={t.therapist_id}>{t.therapist_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <KpiCard label="Quizzes iniciados" value={countByType.quiz_started || 0} />
              <KpiCard label="Quizzes concluídos" value={countByType.quiz_completed || 0} />
              <KpiCard label="Cliques em conteúdo" value={countByType.content_click || 0} />
              <KpiCard label="Cliques no WhatsApp" value={countByType.whatsapp_click || 0} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <KpiCard label="Total de eventos" value={metrics?.total_events || 0} />
              <KpiCard label="Sessões únicas" value={metrics?.unique_sessions || 0} />
              <KpiCard label="Eventos nas últimas 24h" value={metrics?.last_24h_events || 0} />
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
                <p className="text-[#9d7bb5] text-sm">Sem dados ainda{therapistFilter !== 'all' ? ' (limpe o filtro de terapeuta para ver esta tabela)' : ''}.</p>
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
                    {byTherapy
                      .filter(row => therapyFilter === 'all' || row.therapy_id === therapyFilter)
                      .map(row => (
                        <tr key={row.therapy_id} className="border-t border-[#f0e6fa]">
                          <td className="py-1.5 pr-2 text-[#2d1b4e] font-medium">{row.therapy_name}</td>
                          <td className="py-1.5 pr-2 text-right">{row.principal || 0}</td>
                          <td className="py-1.5 pr-2 text-right">{row.secundario || 0}</td>
                          <td className="py-1.5 pr-2 text-right">{row.conteudo || 0}</td>
                          <td className="py-1.5 pr-2 text-right">{row.terapeuta || 0}</td>
                          <td className="py-1.5 text-right">{row.whatsapp || 0}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-white/80 rounded-2xl p-5 border border-[#e0d0f5] shadow-sm overflow-x-auto">
              <p className="text-[#3d2b55] font-semibold text-sm mb-3">Resultados por terapeuta</p>
              {byTherapist.length === 0 ? (
                <p className="text-[#9d7bb5] text-sm">Sem dados ainda{therapyFilter !== 'all' ? ' (limpe o filtro de terapia para ver esta tabela)' : ''}.</p>
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
                    {byTherapist
                      .filter(row => therapistFilter === 'all' || row.therapist_id === therapistFilter)
                      .map(row => (
                        <tr key={row.therapist_id} className="border-t border-[#f0e6fa]">
                          <td className="py-1.5 pr-2 text-[#2d1b4e] font-medium">{row.therapist_name}</td>
                          <td className="py-1.5 pr-2 text-right">{row.terapeuta || 0}</td>
                          <td className="py-1.5 text-right">{row.whatsapp || 0}</td>
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
