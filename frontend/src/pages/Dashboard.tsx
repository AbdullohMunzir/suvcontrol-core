import React, { useEffect, useState } from 'react';
import { getDashboardStats, getWeeklyCash } from '../../services/reportService';
import { getAuditLogs } from '../../services/auditService';
import dayjs from 'dayjs';
import { 
  Users, Wallet, UserPlus, AlertTriangle, TrendingUp, Plus, 
  ArrowRight, Clock, ShieldCheck, CheckCircle2, 
  MapPin, UserCheck, CreditCard, BarChart3, RefreshCw, FileText
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Segmented } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

function parseLogDescription(method: string, desc: string): string {
  let cleanDesc = (desc || '').replace(/\.?\s*Sabab:.*$/i, '').trim();
  cleanDesc = cleanDesc.replace(/ID:\s*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '').trim();

  if (!cleanDesc.includes('/api/')) return cleanDesc;
  
  const url = cleanDesc;
  if (url.includes('/payments') && url.endsWith('/cancel')) return "To'lov bekor qilindi (Storno)";
  if (url.includes('/payments') && url.endsWith('/status')) return "To'lov holati o'zgartirildi";
  if (url.includes('/payments') && method === 'POST') return "Yangi to'lov qabul qilindi";
  if (url.includes('/meters/readings')) return "Ko'rsatkich kiritildi";
  if (url.includes('/meters/replace')) return "Hisoblagich almashtirildi";
  if (url.includes('/abonents/bulk-unarchive')) return "Abonentlar arxivdan chiqarildi";
  if (url.includes('/abonents/bulk-archive')) return "Abonentlar arxivlandi";
  if (url.includes('/abonents') && url.endsWith('/status')) return "Abonent holati o'zgartirildi";
  if (url.includes('/abonents') && method === 'POST') return "Yangi abonent qo'shildi";
  if (url.includes('/abonents') && method === 'PATCH') return "Abonent ma'lumotlari tahrirlandi";
  if (url.includes('/abonents') && method === 'DELETE') return "Abonent arxivlandi / o'chirildi";
  if (url.includes('/auth')) return "Tizimga kirish amali bajarildi";
  
  return cleanDesc;
}

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState('haftalik');
  const [currentTime, setCurrentTime] = useState(dayjs().format('DD.MM.YYYY, HH:mm'));

  const [stats, setStats] = useState({
    totalAbonents: 0,
    totalPhysicalAbonents: 0,
    totalLegalAbonents: 0,
    totalCash: 0,
    todayCashSum: 0,
    todayOnlineSum: 0,
    pendingPaymentsCount: 0,
    monthlyCash: 0,
    totalDebtors: 0,
    totalPhysicalDebtors: 0,
    totalLegalDebtors: 0,
    totalDebtSum: 0,
    activeCollectorsCount: 0,
    newAbonents: 0,
    topDebtorMahallas: [] as any[],
    recentAbonents: [] as any[],
  });
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep time updated
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('DD.MM.YYYY, HH:mm'));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dashboardStats = await getDashboardStats();
      
      setStats({
        totalAbonents: dashboardStats.totalAbonents || 0,
        totalPhysicalAbonents: dashboardStats.totalPhysicalAbonents || 0,
        totalLegalAbonents: dashboardStats.totalLegalAbonents || 0,
        totalCash: dashboardStats.totalCash || 0,
        todayCashSum: dashboardStats.todayCashSum || 0,
        todayOnlineSum: dashboardStats.todayOnlineSum || 0,
        pendingPaymentsCount: dashboardStats.pendingPaymentsCount || 0,
        monthlyCash: dashboardStats.monthlyCash || 0,
        totalDebtors: dashboardStats.totalDebtors || 0,
        totalPhysicalDebtors: dashboardStats.totalPhysicalDebtors || 0,
        totalLegalDebtors: dashboardStats.totalLegalDebtors || 0,
        totalDebtSum: dashboardStats.totalDebtSum || 0,
        activeCollectorsCount: dashboardStats.activeCollectorsCount || 0,
        newAbonents: dashboardStats.newAbonents || 0,
        topDebtorMahallas: dashboardStats.topDebtorMahallas || [],
        recentAbonents: dashboardStats.recentAbonents || [],
      });
      
      const weeklyCashData = await getWeeklyCash();
      setChartData(weeklyCashData || []);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    getAuditLogs(1, 8)
      .then(logsRes => setAuditLogs(logsRes.data || []))
      .catch(err => console.error("Failed to load audit logs", err));
  }, []);

  return (
    <div className="w-full space-y-5">
      {/* Header & Quick Action Shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Boshqaruv Paneli
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Rejim
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-2">
            <span>Suv ta'minoti korxonasining tezkor holati va moliyaviy tushumlar</span>
            <span className="text-slate-300">•</span>
            <span className="font-medium text-slate-700 font-mono text-[11px]">{currentTime}</span>
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => navigate('/app/payments')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md font-medium text-xs transition-colors shadow-xs"
          >
            <CreditCard size={14} />
            <span>Kassa / To'lov qabul qilish</span>
          </button>
          <button 
            onClick={() => navigate('/app/abonent-card')}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md font-medium text-xs transition-colors shadow-xs"
          >
            <Plus size={14} />
            <span>Yangi abonent</span>
          </button>
          <button 
            onClick={() => navigate('/app/reports')}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md font-medium text-xs transition-colors border border-slate-200"
          >
            <BarChart3 size={14} className="text-slate-400" />
            <span>Hisobotlar</span>
          </button>
          <button 
            onClick={fetchData}
            title="Yangilash"
            className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-md transition-colors border border-slate-200"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-sky-600" : ""} />
          </button>
        </div>
      </div>

      {/* 6 Primary Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Total Abonents */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Jami abonentlar</span>
              <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                +{stats.newAbonents}
              </span>
            </div>
            <h3 className="text-xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {loading ? '...' : stats.totalAbonents.toLocaleString()}
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between font-mono">
            <span>Aholi: <strong className="text-slate-700">{stats.totalPhysicalAbonents}</strong></span>
            <span>Yuridik: <strong className="text-slate-700">{stats.totalLegalAbonents}</strong></span>
          </div>
        </div>

        {/* KPI 2: Today Total Collection */}
        <div className="bg-white rounded-lg p-4 border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Bugungi tushum</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                BUGUN
              </span>
            </div>
            <h3 className="text-xl font-bold font-mono tabular-nums text-emerald-700 tracking-tight">
              {loading ? '...' : Math.round(Number(stats.totalCash || 0)).toLocaleString()} <span className="text-xs font-normal text-emerald-600">so'm</span>
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-100 text-[11px] flex items-center justify-between text-slate-600">
            <span className="font-mono text-slate-500">Naqd: <strong className="text-slate-800">{Math.round(Number(stats.todayCashSum || 0)).toLocaleString()}</strong></span>
            <Link to="/app/payments" className="text-emerald-700 font-semibold hover:underline flex items-center gap-0.5 text-[11px]">
              Kassa <ArrowRight size={10} />
            </Link>
          </div>
        </div>

        {/* KPI 3: Monthly Collection */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Oylik tushum</span>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                SHU OY
              </span>
            </div>
            <h3 className="text-xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {loading ? '...' : Math.round(Number(stats.monthlyCash || 0)).toLocaleString()} <span className="text-xs font-normal text-slate-400">so'm</span>
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Oy boshidan buyon</span>
            <span className="text-emerald-600 font-medium">Hisoblangan</span>
          </div>
        </div>

        {/* KPI 4: Total Debt */}
        <div className="bg-white rounded-lg p-4 border border-rose-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Qarzdorlik</span>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                {stats.totalDebtors} abonent
              </span>
            </div>
            <h3 className="text-xl font-bold font-mono tabular-nums text-rose-600 tracking-tight">
              {loading ? '...' : Math.round(Number(stats.totalDebtSum || 0)).toLocaleString()} <span className="text-xs font-normal text-rose-400">so'm</span>
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-rose-100 text-[11px] flex items-center justify-between text-slate-600 font-mono">
            <span>Aholi: {stats.totalPhysicalDebtors} | Yur: {stats.totalLegalDebtors}</span>
          </div>
        </div>

        {/* KPI 5: Pending Payments */}
        <div className={`p-4 rounded-lg border shadow-xs flex flex-col justify-between ${
          stats.pendingPaymentsCount > 0 ? 'bg-amber-50/30 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tasdiq kutilmoqda</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stats.pendingPaymentsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                {stats.pendingPaymentsCount > 0 ? `${stats.pendingPaymentsCount} ta` : '0'}
              </span>
            </div>
            <h3 className="text-xl font-bold font-mono tabular-nums text-amber-700 tracking-tight">
              {loading ? '...' : stats.pendingPaymentsCount} <span className="text-xs font-normal text-slate-400">ta to'lov</span>
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] flex items-center justify-between">
            <span className="text-slate-500">Kassir nazorati</span>
            <Link to="/app/payments" className="text-sky-700 font-semibold hover:underline flex items-center gap-0.5 text-[11px]">
              Tasdiqlash <ArrowRight size={10} />
            </Link>
          </div>
        </div>

        {/* KPI 6: Active Collectors */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nazoratchilar</span>
              <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                FAOL
              </span>
            </div>
            <h3 className="text-xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {loading ? '...' : stats.activeCollectorsCount} <span className="text-xs font-normal text-slate-400">nafar</span>
            </h3>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Hudud biriktirilgan</span>
            <Link to="/app/collectors" className="text-sky-700 font-semibold hover:underline flex items-center gap-0.5 text-[11px]">
              Ro'yxat <ArrowRight size={10} />
            </Link>
          </div>
        </div>
      </div>

      {/* Middle Visuals Section: Dynamic Charts & Top Debtor Mahallas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 cols: Collection Trends Dynamic Chart */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-sky-600" />
                Tushumlar Dinamikasi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Mablag'lar yig'ilishining vaqtlar kesimidagi ko'rsatkichi</p>
            </div>
            <Segmented 
              size="small"
              className="bg-slate-100 text-xs font-medium"
              options={[
                { label: 'Haftalik', value: 'haftalik' },
                { label: 'Oylik', value: 'oylik' }
              ]}
              value={chartPeriod}
              onChange={(val) => setChartPeriod(val as string)}
            />
          </div>
          
          <div className="h-[280px] w-full relative">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <BarChart3 size={32} className="text-slate-300 mb-2" />
                <p className="font-medium text-xs">Hozircha grafik ma'lumotlari mavjud emas</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorTushumSky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748B' }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748B' }} 
                    tickFormatter={(val) => {
                      if (val === 0) return '0';
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return val.toString();
                    }} 
                    dx={-5}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <RechartsTooltip 
                    cursor={{ stroke: '#0284c7', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{ 
                      borderRadius: '6px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                      padding: '8px 12px',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [`${Number(value || 0).toLocaleString()} so'm`, 'Tushum']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Tushum" 
                    stroke="#0284c7" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorTushumSky)" 
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff', fill: '#0284c7' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right 4 cols: Top Debtor Mahallas Ranking */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin size={15} className="text-rose-600" />
                  Eng Katta Qarzdor Mahallalar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">TOP-5 mahalla qarzdorlik balansi</p>
              </div>
              <Link to="/app/reports" className="text-xs font-semibold text-sky-700 hover:underline">
                Barchasi
              </Link>
            </div>

            <div className="space-y-2.5 mt-3">
              {stats.topDebtorMahallas.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Qarzdor mahallalar ma'lumoti topilmadi
                </div>
              ) : (
                stats.topDebtorMahallas.map((m, idx) => {
                  const maxDebt = stats.topDebtorMahallas[0]?.totalDebt || 1;
                  const percent = Math.min(100, Math.round((m.totalDebt / maxDebt) * 100));

                  return (
                    <div key={m.id || idx} className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                          <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                            {idx + 1}
                          </span>
                          <span className="truncate">{m.name}</span>
                        </span>
                        <span className="font-bold font-mono text-rose-600 shrink-0 ml-2">
                          {Math.round(m.totalDebt).toLocaleString()} so'm
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${idx === 0 ? 'bg-rose-600' : 'bg-rose-400'}`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                        <span>{m.debtorCount || 0} ta qarzdor</span>
                        <span>{percent}% ulush</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button 
              onClick={() => navigate('/app/reports')}
              className="w-full py-1.5 px-3 text-center text-xs font-medium text-slate-700 hover:text-sky-700 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors border border-slate-200 flex items-center justify-center gap-1.5"
            >
              <FileText size={13} />
              <span>To'liq mahalla hisobotiga o'tish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Operational Stream: Live Audit Stream & Recent Subscribers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 6 cols: Live Audit Stream */}
        <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-slate-700" />
                Operatsion Jurnal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Tizimda bajarilgan oxirgi harakatlar</p>
            </div>
            <Link 
              to="/app/abonent-card" 
              className="text-xs font-semibold text-sky-700 hover:underline flex items-center gap-1"
            >
              Jurnalga o'tish <ArrowRight size={11} />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Oxirgi harakatlar topilmadi
              </div>
            ) : (
              auditLogs.slice(0, 6).map((log) => {
                const desc = parseLogDescription(log.method, log.description || log.action);
                const isPayment = desc.includes("to'lov") || desc.includes("To'lov");
                const isAbonent = desc.includes("abonent") || desc.includes("Abonent");
                const isMeter = desc.includes("ko'rsatkich") || desc.includes("Hisoblagich") || desc.includes("Vodomer");

                return (
                  <div key={log.id} className="py-2 flex items-start justify-between gap-3 hover:bg-slate-50/80 px-1.5 rounded transition-colors">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                        isPayment ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        isAbonent ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        isMeter ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {isPayment ? <CreditCard size={12} /> : isAbonent ? <Users size={12} /> : isMeter ? <Clock size={12} /> : <ShieldCheck size={12} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate leading-snug">
                          {desc}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-600">@{log.userLogin || 'tizim'}</span>
                          <span>•</span>
                          <span>{dayjs(log.createdAt).format('HH:mm, DD.MM')}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                      {log.method || 'ACTION'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 6 cols: Recent Subscribers */}
        <div className="lg:col-span-6 bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <UserPlus size={16} className="text-slate-700" />
                Oxirgi Qo'shilgan Abonentlar
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Bazaga yangi kiritilgan mijozlar</p>
            </div>
            <Link 
              to="/app/abonent-card" 
              className="text-xs font-semibold text-sky-700 hover:underline flex items-center gap-1"
            >
              Barcha abonentlar <ArrowRight size={11} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-2">Abonent</th>
                  <th className="pb-2">Mahalla</th>
                  <th className="pb-2 text-right">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentAbonents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      Yangi abonentlar ro'yxati mavjud emas
                    </td>
                  </tr>
                ) : (
                  stats.recentAbonents.slice(0, 6).map((abonent) => (
                    <tr 
                      key={abonent.id} 
                      onClick={() => navigate(`/app/abonent/${abonent.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 pr-2">
                        <div className="font-semibold text-slate-800 leading-tight truncate max-w-[180px]">
                          {abonent.fullName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {abonent.abonentNumber}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-slate-600 font-medium truncate max-w-[140px]">
                        {abonent.mahalla?.name || '—'}
                      </td>
                      <td className="py-2 pl-2 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          abonent.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          abonent.status === 'DISCONNECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {abonent.status === 'ACTIVE' ? 'Faol' :
                           abonent.status === 'DISCONNECTED' ? 'Uzilgan' : 
                           abonent.status === 'PENDING' ? 'Kutilmoqda' : abonent.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
