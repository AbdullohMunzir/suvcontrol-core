import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Button, Row, Col, message, DatePicker,
  Tag, Input, Progress, Pagination, Select
} from 'antd';
import {
  FileSpreadsheet, RefreshCw, Calendar, Users,
  TrendingUp, Wallet, Search, ArrowUpRight, ArrowDownRight,
  CheckCircle2, BarChart3, Filter
} from 'lucide-react';
import dayjs from 'dayjs';
import {
  getTaxRevenue, exportTaxRevenue,
  getTaxDebtors, exportTaxDebtors,
  getTaxStatistics, exportTaxStatistics,
  getTaxAbonentPayments, exportTaxAbonentPayments
} from '../../services/reportService';

const { RangePicker } = DatePicker;

const downloadBlob = (blob: any, filename: string) => {
  const url = window.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const formatNumber = (num: number | string | undefined | null) => {
  if (num === undefined || num === null || isNaN(Number(num))) return '0';
  return Math.round(Number(num)).toLocaleString('uz-UZ');
};

const formatCurrency = (num: number | string | undefined | null) => {
  return `${formatNumber(num)} UZS`;
};

const TaxReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'debtors' | 'statistics' | 'payments'>('revenue');

  // =============================================================
  // TAB 1: YALPI TUSHUM (SOLIQ BAZASI)
  // =============================================================
  const [revenueRange, setRevenueRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'), dayjs()
  ]);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueExporting, setRevenueExporting] = useState(false);
  const [revenueData, setRevenueData] = useState<any>(null);

  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const start = revenueRange[0].format('YYYY-MM-DD');
      const end = revenueRange[1].format('YYYY-MM-DD');
      const res = await getTaxRevenue(start, end);
      setRevenueData(res);
    } catch (e: any) {
      console.error(e);
      message.error("Yalpi tushum hisobotini yuklashda xatolik yuz berdi");
    } finally {
      setRevenueLoading(false);
    }
  }, [revenueRange]);

  const exportRevenue = async () => {
    setRevenueExporting(true);
    try {
      const start = revenueRange[0].format('YYYY-MM-DD');
      const end = revenueRange[1].format('YYYY-MM-DD');
      const blob = await exportTaxRevenue(start, end);
      downloadBlob(blob, `1_yalpi_tushum_${start}_dan_${end}_gacha.xlsx`);
      message.success("Yalpi tushum hisoboti Excel formatida yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik yuz berdi");
    } finally {
      setRevenueExporting(false);
    }
  };

  // =============================================================
  // TAB 2: DEBITOR QARZDORLAR (TARIXIY HOLAT)
  // =============================================================
  const [debtorsDate, setDebtorsDate] = useState<dayjs.Dayjs>(dayjs());
  const [debtorsSearch, setDebtorsSearch] = useState('');
  const [debtorsMahalla, setDebtorsMahalla] = useState<string>('ALL');
  const [debtorsSort, setDebtorsSort] = useState<'desc' | 'asc'>('desc');
  const [debtorsPage, setDebtorsPage] = useState<number>(1);
  const [debtorsPageSize, setDebtorsPageSize] = useState<number>(20);
  const [debtorsLoading, setDebtorsLoading] = useState(false);
  const [debtorsExporting, setDebtorsExporting] = useState(false);
  const [debtorsData, setDebtorsData] = useState<any>(null);

  const fetchDebtors = useCallback(async () => {
    setDebtorsLoading(true);
    try {
      const end = debtorsDate.format('YYYY-MM-DD');
      const res = await getTaxDebtors(end);
      setDebtorsData(res);
      setDebtorsPage(1);
    } catch (e: any) {
      console.error(e);
      message.error("Debitor qarzdorlar hisobotini yuklashda xatolik yuz berdi");
    } finally {
      setDebtorsLoading(false);
    }
  }, [debtorsDate]);

  const exportDebtors = async () => {
    setDebtorsExporting(true);
    try {
      const end = debtorsDate.format('YYYY-MM-DD');
      const blob = await exportTaxDebtors(end);
      downloadBlob(blob, `2_debitorlar_tarixiy_${end}.xlsx`);
      message.success("Debitorlar hisoboti Excel formatida yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik yuz berdi");
    } finally {
      setDebtorsExporting(false);
    }
  };

  const uniqueMahallas = useMemo(() => {
    if (!debtorsData?.details) return [];
    const set = new Set<string>();
    debtorsData.details.forEach((d: any) => {
      if (d.mahalla) set.add(d.mahalla);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [debtorsData]);

  const filteredDebtors = useMemo(() => {
    if (!debtorsData?.details) return [];
    let list = [...debtorsData.details];

    if (debtorsMahalla !== 'ALL') {
      list = list.filter((d: any) => d.mahalla === debtorsMahalla);
    }

    if (debtorsSearch.trim()) {
      const q = debtorsSearch.trim().toLowerCase();
      list = list.filter((d: any) =>
        (d.fullName && d.fullName.toLowerCase().includes(q)) ||
        (d.abonentNumber && d.abonentNumber.toLowerCase().includes(q)) ||
        (d.mahalla && d.mahalla.toLowerCase().includes(q))
      );
    }

    list.sort((a: any, b: any) => {
      const bA = Number(a.balance || 0);
      const bB = Number(b.balance || 0);
      return debtorsSort === 'desc' ? bB - bA : bA - bB;
    });

    return list;
  }, [debtorsData, debtorsMahalla, debtorsSearch, debtorsSort]);

  const paginatedDebtors = useMemo(() => {
    const start = (debtorsPage - 1) * debtorsPageSize;
    return filteredDebtors.slice(start, start + debtorsPageSize);
  }, [filteredDebtors, debtorsPage, debtorsPageSize]);

  const filteredDebtorsTotalDebt = useMemo(() => {
    return filteredDebtors.reduce((acc: number, d: any) => acc + Number(d.balance || 0), 0);
  }, [filteredDebtors]);

  // =============================================================
  // TAB 3: ABONENTLAR STATISTIKASI
  // =============================================================
  const [statsRange, setStatsRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'), dayjs()
  ]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsExporting, setStatsExporting] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const start = statsRange[0].format('YYYY-MM-DD');
      const end = statsRange[1].format('YYYY-MM-DD');
      const res = await getTaxStatistics(start, end);
      setStatsData(res);
    } catch (e: any) {
      console.error(e);
      message.error("Abonentlar statistikasini yuklashda xatolik yuz berdi");
    } finally {
      setStatsLoading(false);
    }
  }, [statsRange]);

  const exportStats = async () => {
    setStatsExporting(true);
    try {
      const start = statsRange[0].format('YYYY-MM-DD');
      const end = statsRange[1].format('YYYY-MM-DD');
      const blob = await exportTaxStatistics(start, end);
      downloadBlob(blob, `3_abonent_statistikasi_${start}_dan_${end}_gacha.xlsx`);
      message.success("Abonentlar statistikasi Excel formatida yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik yuz berdi");
    } finally {
      setStatsExporting(false);
    }
  };

  // =============================================================
  // TAB 4: ABONENTLAR TUSHUMLARI (OYMA-OY MATRITSA)
  // =============================================================
  const [paymentsRange, setPaymentsRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'), dayjs()
  ]);
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsPage, setPaymentsPage] = useState<number>(1);
  const [paymentsPageSize, setPaymentsPageSize] = useState<number>(20);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsExporting, setPaymentsExporting] = useState(false);
  const [paymentsData, setPaymentsData] = useState<any>(null);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const start = paymentsRange[0].format('YYYY-MM-DD');
      const end = paymentsRange[1].format('YYYY-MM-DD');
      const res = await getTaxAbonentPayments(start, end);
      setPaymentsData(res);
      setPaymentsPage(1);
    } catch (e: any) {
      console.error(e);
      message.error("Abonent tushumlarini yuklashda xatolik yuz berdi");
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentsRange]);

  const exportPayments = async () => {
    setPaymentsExporting(true);
    try {
      const start = paymentsRange[0].format('YYYY-MM-DD');
      const end = paymentsRange[1].format('YYYY-MM-DD');
      const blob = await exportTaxAbonentPayments(start, end);
      downloadBlob(blob, `4_abonentlar_tushumi_${start}_dan_${end}_gacha.xlsx`);
      message.success("Abonentlar tushumi Excel formatida yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik yuz berdi");
    } finally {
      setPaymentsExporting(false);
    }
  };

  const filteredAbonentPayments = useMemo(() => {
    if (!paymentsData?.abonents) return [];
    let list = [...paymentsData.abonents];

    if (paymentsSearch.trim()) {
      const q = paymentsSearch.trim().toLowerCase();
      list = list.filter((a: any) =>
        (a.fullName && a.fullName.toLowerCase().includes(q)) ||
        (a.abonentNumber && a.abonentNumber.toLowerCase().includes(q))
      );
    }
    return list;
  }, [paymentsData, paymentsSearch]);

  const paginatedAbonentPayments = useMemo(() => {
    const start = (paymentsPage - 1) * paymentsPageSize;
    return filteredAbonentPayments.slice(start, start + paymentsPageSize);
  }, [filteredAbonentPayments, paymentsPage, paymentsPageSize]);

  useEffect(() => {
    if (activeTab === 'revenue' && !revenueData) fetchRevenue();
    if (activeTab === 'debtors' && !debtorsData) fetchDebtors();
    if (activeTab === 'statistics' && !statsData) fetchStats();
    if (activeTab === 'payments' && !paymentsData) fetchPayments();
  }, [activeTab]);

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-tab Switcher Header */}
      <div className="bg-white p-1 rounded-lg flex flex-wrap items-center gap-1 border border-slate-200 shadow-xs">
        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'revenue'
              ? 'bg-sky-50 text-sky-700 border border-sky-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <Wallet size={15} className={activeTab === 'revenue' ? 'text-sky-600' : 'text-slate-400'} />
          1. Yalpi Tushum (Soliq bazasi)
        </button>

        <button
          onClick={() => setActiveTab('debtors')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'debtors'
              ? 'bg-sky-50 text-sky-700 border border-sky-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <TrendingUp size={15} className={activeTab === 'debtors' ? 'text-sky-600' : 'text-slate-400'} />
          2. Debitor Qarzdorlar (Tarixiy)
        </button>

        <button
          onClick={() => setActiveTab('statistics')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'statistics'
              ? 'bg-sky-50 text-sky-700 border border-sky-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <Users size={15} className={activeTab === 'statistics' ? 'text-sky-600' : 'text-slate-400'} />
          3. Abonentlar Statistikasi
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-sky-50 text-sky-700 border border-sky-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <FileSpreadsheet size={15} className={activeTab === 'payments' ? 'text-sky-600' : 'text-slate-400'} />
          4. Abonentlar Tushumlari Matritsasi
        </button>
      </div>

      {/* ============================================================= */}
      {/* 1. YALPI TUSHUM (SOLIQ BAZASI) TAB */}
      {/* ============================================================= */}
      {activeTab === 'revenue' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-lg shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Davr:</span>
                <RangePicker
                  value={revenueRange}
                  onChange={(d) => d && d[0] && d[1] && setRevenueRange([d[0], d[1]])}
                  format="YYYY-MM-DD"
                  allowClear={false}
                  size="small"
                  className="border-none shadow-none bg-transparent text-xs"
                />
              </div>

              <Button
                icon={<RefreshCw size={13} className={revenueLoading ? 'animate-spin' : ''} />}
                onClick={fetchRevenue}
                loading={revenueLoading}
                type="primary"
                size="small"
                className="rounded font-medium text-xs"
              >
                Yangilash
              </Button>
            </div>

            <Button
              icon={<FileSpreadsheet size={14} />}
              onClick={exportRevenue}
              loading={revenueExporting}
              size="small"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs border-none shadow-xs flex items-center gap-1.5"
            >
              Excel yuklab olish
            </Button>
          </div>

          {/* KPI Summary Cards */}
          {revenueData && (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Hisoblangan (Soliq bazasi)</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                      {formatNumber(revenueData.totalInvoiced)} <span className="text-xs font-normal text-slate-500">UZS</span>
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Davr davomida barcha fakturalar</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
                    <Wallet size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Undirilgan (Tushum)</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1 block">
                      {formatNumber(revenueData.totalCollected)} <span className="text-xs font-normal text-emerald-600">UZS</span>
                    </span>
                    <span className="text-[11px] text-emerald-600 mt-0.5 block">Faktik qabul qilingan to'lovlar</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Qoldiq / Farq</span>
                    <span className={`text-xl font-bold font-mono tabular-nums mt-1 block ${revenueData.difference > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatNumber(revenueData.difference)} <span className="text-xs font-normal text-slate-500">UZS</span>
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Hisoblangan va to'lov farqi</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                    <TrendingUp size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div className="flex-1 pr-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Undiruv darajasi</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                        {revenueData.totalInvoiced > 0
                          ? ((revenueData.totalCollected / revenueData.totalInvoiced) * 100).toFixed(1)
                          : '0.0'}%
                      </span>
                    </div>
                    <Progress
                      percent={revenueData.totalInvoiced > 0 ? Math.min(100, Math.round((revenueData.totalCollected / revenueData.totalInvoiced) * 100)) : 0}
                      size="small"
                      status="active"
                      strokeColor="#0284c7"
                      showInfo={false}
                      className="mt-1"
                    />
                  </div>
                  <div className="w-9 h-9 rounded bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
                    <BarChart3 size={18} />
                  </div>
                </div>
              </Col>
            </Row>
          )}

          {/* Detailed Monthly Table */}
          <div className="bg-white rounded-lg shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">Oyma-oy yalpi tushum va soliq bazasi vedomosti</h4>
                <p className="text-xs text-slate-500 m-0 mt-0.5">Tanlangan davrdagi oylik fakturalar, tushumlar va o'rtadagi qoldiq farq</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Jami {revenueData?.dailyBreakdown?.length || 0} oy
              </span>
            </div>

            <Table
              dataSource={revenueData?.dailyBreakdown || []}
              rowKey="date"
              loading={revenueLoading}
              pagination={false}
              size="middle"
              className="dense-billing-table"
              columns={[
                {
                  title: '#',
                  key: 'index',
                  width: 60,
                  align: 'center',
                  render: (_: any, __: any, index: number) => <span className="text-xs font-bold text-slate-400">{index + 1}</span>
                },
                {
                  title: 'Davr (Oy)',
                  dataIndex: 'date',
                  key: 'date',
                  width: 150,
                  render: (val: string) => (
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-800">{val}</span>
                    </div>
                  )
                },
                {
                  title: 'Hisoblangan summa (UZS)',
                  dataIndex: 'invoiced',
                  key: 'invoiced',
                  align: 'right',
                  render: (val: number) => (
                    <span className="text-xs font-semibold text-slate-800 font-mono">
                      {formatNumber(val)}
                    </span>
                  )
                },
                {
                  title: 'Undirilgan tushum (UZS)',
                  dataIndex: 'collected',
                  key: 'collected',
                  align: 'right',
                  render: (val: number) => (
                    <span className="text-xs font-bold text-emerald-700 font-mono">
                      {formatNumber(val)}
                    </span>
                  )
                },
                {
                  title: 'Farq / Qoldiq (UZS)',
                  dataIndex: 'difference',
                  key: 'difference',
                  align: 'right',
                  render: (val: number) => (
                    <span className={`text-xs font-bold font-mono ${val > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {val > 0 ? `+${formatNumber(val)}` : formatNumber(val)}
                    </span>
                  )
                },
                {
                  title: "Undiruv ko'rsatkichi",
                  key: 'ratio',
                  width: 180,
                  align: 'center',
                  render: (_: any, record: any) => {
                    const ratio = record.invoiced > 0 ? (record.collected / record.invoiced) * 100 : (record.collected > 0 ? 100 : 0);
                    const color = ratio >= 80 ? 'green' : ratio >= 50 ? 'orange' : 'volcano';
                    return (
                      <div className="flex items-center justify-center gap-2">
                        <Tag color={color} className="font-bold text-xs m-0">
                          {ratio.toFixed(1)}%
                        </Tag>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${ratio >= 80 ? 'bg-emerald-500' : ratio >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, ratio)}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                }
              ]}
              summary={() => {
                if (!revenueData) return null;
                const grandRatio = revenueData.totalInvoiced > 0
                  ? ((revenueData.totalCollected / revenueData.totalInvoiced) * 100).toFixed(1)
                  : '0.0';
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                      <Table.Summary.Cell index={0} align="center">
                        <span className="text-xs text-slate-700 uppercase">JAMI</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <span className="text-xs text-slate-800 font-bold">Barcha davrlar jamlanmasi</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <span className="text-xs text-slate-900 font-bold font-mono">
                          {formatNumber(revenueData.totalInvoiced)} UZS
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <span className="text-xs text-emerald-700 font-bold font-mono">
                          {formatNumber(revenueData.totalCollected)} UZS
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        <span className="text-xs text-rose-600 font-bold font-mono">
                          {formatNumber(revenueData.difference)} UZS
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="center">
                        <Tag color="blue" className="font-bold text-xs m-0">
                          {grandRatio}%
                        </Tag>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. DEBITOR QARZDORLAR (TARIXIY HOLAT) TAB */}
      {/* ============================================================= */}
      {activeTab === 'debtors' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-lg shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Holat sanasi:</span>
                <DatePicker
                  value={debtorsDate}
                  onChange={(d) => d && setDebtorsDate(d)}
                  format="YYYY-MM-DD"
                  allowClear={false}
                  size="small"
                  className="border-none shadow-none bg-transparent text-xs"
                />
              </div>

              <div className="w-52">
                <Input
                  prefix={<Search size={13} className="text-slate-400 mr-1" />}
                  placeholder="F.I.SH. yoki L/S qidirish..."
                  value={debtorsSearch}
                  onChange={(e) => {
                    setDebtorsSearch(e.target.value);
                    setDebtorsPage(1);
                  }}
                  allowClear
                  size="small"
                  className="rounded text-xs"
                />
              </div>

              <Select
                value={debtorsMahalla}
                onChange={(val) => {
                  setDebtorsMahalla(val);
                  setDebtorsPage(1);
                }}
                size="small"
                className="w-44 text-xs"
                placeholder="Mahalla bo'yicha"
              >
                <Select.Option value="ALL">Barcha mahallalar</Select.Option>
                {uniqueMahallas.map((m) => (
                  <Select.Option key={m} value={m}>{m}</Select.Option>
                ))}
              </Select>

              <Select
                value={debtorsSort}
                onChange={(val) => setDebtorsSort(val)}
                size="small"
                className="w-44 text-xs"
              >
                <Select.Option value="desc">Qarz kamayish tartibida</Select.Option>
                <Select.Option value="asc">Qarz o'sish tartibida</Select.Option>
              </Select>

              <Button
                icon={<RefreshCw size={13} className={debtorsLoading ? 'animate-spin' : ''} />}
                onClick={fetchDebtors}
                loading={debtorsLoading}
                type="primary"
                size="small"
                className="rounded font-medium text-xs"
              >
                Yangilash
              </Button>
            </div>

            <Button
              icon={<FileSpreadsheet size={14} />}
              onClick={exportDebtors}
              loading={debtorsExporting}
              size="small"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs border-none shadow-xs flex items-center gap-1.5"
            >
              Excel yuklab olish
            </Button>
          </div>

          {/* KPI Summary Cards */}
          {debtorsData && (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Jami Qarzdorlar soni</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-1 block">
                      {formatNumber(debtorsData.totalDebtors)} <span className="text-xs font-normal text-slate-500">ta abonent</span>
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{debtorsDate.format('DD.MM.YYYY')} holatiga</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Jami Debitorlik Qarzi</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-1 block">
                      {formatNumber(debtorsData.totalDebt)} <span className="text-xs font-normal text-slate-500">UZS</span>
                    </span>
                    <span className="text-[11px] text-rose-600 mt-0.5 block">Umumiy yig'ilgan qarz</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                    <TrendingUp size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">O'rtacha Qarzdorlik</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-1 block">
                      {debtorsData.totalDebtors > 0
                        ? formatNumber(Math.round(debtorsData.totalDebt / debtorsData.totalDebtors))
                        : '0'} <span className="text-xs font-normal text-slate-500">UZS</span>
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Bitta xonadonga to'g'ri keluvchi</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                    <Wallet size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Filtrlangan Qarz</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-sky-700 mt-1 block">
                      {formatNumber(filteredDebtorsTotalDebt)} <span className="text-xs font-normal text-slate-500">UZS</span>
                    </span>
                    <span className="text-[11px] text-sky-600 mt-0.5 block">
                      {filteredDebtors.length} ta filtrlangan abonent
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
                    <Filter size={18} />
                  </div>
                </div>
              </Col>
            </Row>
          )}

          {/* Debtors List Table */}
          <div className="bg-white rounded-lg shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800 m-0">Debitor abonentlar reyestri</h4>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  {debtorsDate.format('YYYY-MM-DD')} holatiga debitorlik qarziga ega abonentlar ro'yxati
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  {filteredDebtors.length} ta natijadan {(debtorsPage - 1) * debtorsPageSize + 1}-
                  {Math.min(debtorsPage * debtorsPageSize, filteredDebtors.length)} ko'rsatilmoqda
                </span>
              </div>
            </div>

            <Table
              dataSource={paginatedDebtors}
              rowKey="id"
              loading={debtorsLoading}
              pagination={false}
              size="middle"
              className="dense-billing-table"
              columns={[
                {
                  title: '#',
                  key: 'index',
                  width: 60,
                  align: 'center',
                  render: (_: any, __: any, index: number) => (
                    <span className="text-xs font-bold text-slate-400">
                      {(debtorsPage - 1) * debtorsPageSize + index + 1}
                    </span>
                  )
                },
                {
                  title: 'Hisob raqam (L/S)',
                  dataIndex: 'abonentNumber',
                  key: 'abonentNumber',
                  width: 150,
                  render: (val: string) => (
                    <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-800">
                      {val}
                    </span>
                  )
                },
                {
                  title: 'Abonent F.I.SH.',
                  dataIndex: 'fullName',
                  key: 'fullName',
                  render: (val: string) => (
                    <span className="text-xs font-bold text-slate-900 block">
                      {val}
                    </span>
                  )
                },
                {
                  title: 'Mahalla',
                  dataIndex: 'mahalla',
                  key: 'mahalla',
                  width: 180,
                  render: (val: string) => (
                    <Tag color="cyan" className="text-xs font-semibold m-0">
                      {val || "Noma'lum"}
                    </Tag>
                  )
                },
                {
                  title: 'Debitorlik qarzi (UZS)',
                  dataIndex: 'balance',
                  key: 'balance',
                  align: 'right',
                  render: (val: number) => (
                    <span className="text-xs font-extrabold text-rose-600 font-mono">
                      {formatNumber(val)} UZS
                    </span>
                  )
                },
                {
                  title: 'Holat',
                  key: 'status',
                  width: 110,
                  align: 'center',
                  render: () => (
                    <Tag color="error" className="font-bold text-xs m-0">
                      Qarzdor
                    </Tag>
                  )
                }
              ]}
              summary={() => {
                if (filteredDebtors.length === 0) return null;
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                      <Table.Summary.Cell index={0} align="center">
                        <span className="text-xs text-slate-700 uppercase">JAMI</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <span className="text-xs text-slate-800 font-bold">{filteredDebtors.length} ta qarzdor</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <span className="text-xs text-slate-500 font-medium">Filtrlangan qarzdorlar jamlanmasi</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} />
                      <Table.Summary.Cell index={4} align="right">
                        <span className="text-xs text-rose-700 font-black font-mono">
                          {formatNumber(filteredDebtorsTotalDebt)} UZS
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} />
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Jami {filteredDebtors.length} ta yozuv
              </span>
              <Pagination
                current={debtorsPage}
                pageSize={debtorsPageSize}
                total={filteredDebtors.length}
                onChange={(page, pageSize) => {
                  setDebtorsPage(page);
                  setDebtorsPageSize(pageSize);
                }}
                showSizeChanger
                pageSizeOptions={['10', '20', '50', '100']}
                size="small"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. ABONENTLAR STATISTIKASI TAB */}
      {/* ============================================================= */}
      {activeTab === 'statistics' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-lg shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Davr:</span>
                <RangePicker
                  value={statsRange}
                  onChange={(d) => d && d[0] && d[1] && setStatsRange([d[0], d[1]])}
                  format="YYYY-MM-DD"
                  allowClear={false}
                  size="small"
                  className="border-none shadow-none bg-transparent text-xs"
                />
              </div>

              <Button
                icon={<RefreshCw size={13} className={statsLoading ? 'animate-spin' : ''} />}
                onClick={fetchStats}
                loading={statsLoading}
                type="primary"
                size="small"
                className="rounded font-medium text-xs"
              >
                Yangilash
              </Button>
            </div>

            <Button
              icon={<FileSpreadsheet size={14} />}
              onClick={exportStats}
              loading={statsExporting}
              size="small"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs border-none shadow-xs flex items-center gap-1.5"
            >
              Excel yuklab olish
            </Button>
          </div>

          {/* KPI Summary Cards */}
          {statsData && (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Davr Boshiga</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                      {formatNumber(statsData.startTotal)} <span className="text-xs font-normal text-slate-500">ta abonent</span>
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{statsRange[0].format('DD.MM.YYYY')} holatiga</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Yangi Ulanganlar</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-sky-700 mt-1 block">
                      +{formatNumber(statsData.newlyAdded)} <span className="text-xs font-normal text-slate-500">ta</span>
                    </span>
                    <span className="text-[11px] text-sky-600 mt-0.5 block">Davr mobaynida qo'shilgan</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
                    <ArrowUpRight size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Uzilgan / Arxivlangan</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-rose-600 mt-1 block">
                      -{formatNumber(statsData.disconnected)} <span className="text-xs font-normal text-slate-500">ta</span>
                    </span>
                    <span className="text-[11px] text-rose-500 mt-0.5 block">Faoliyati to'xtatilgan</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                    <ArrowDownRight size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Davr Oxiriga (Hozirgi)</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1 block">
                      {formatNumber(statsData.endTotal)} <span className="text-xs font-normal text-slate-500">ta abonent</span>
                    </span>
                    <span className="text-[11px] text-emerald-600 mt-0.5 block">{statsRange[1].format('DD.MM.YYYY')} holatiga</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
              </Col>
            </Row>
          )}

          {/* Detailed Statistics Panels */}
          {statsData && (
            <Row gutter={[16, 16]}>
              {/* Panel A: Standart Statistika Jadvali */}
              <Col xs={24} lg={14}>
                <div className="bg-white rounded-lg shadow-xs border border-slate-200 overflow-hidden h-full">
                  <div className="p-3.5 border-b border-slate-200">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">Soliq va Statistika organlari uchun standart jadval</h4>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">Abonentlar oqimi va strukturasining to'liq ko'rsatkichlari</p>
                  </div>

                  <Table
                    dataSource={[
                      { key: '1', name: 'Davr boshiga jami abonentlar', unit: 'dona', count: statsData.startTotal, share: '-' },
                      { key: '2', name: 'Davr davomida yangi ro\'yxatdan o\'tganlar', unit: 'dona', count: statsData.newlyAdded, share: '-' },
                      { key: '3', name: 'Davr davomida tarmoqdan uzilgan / arxivlanganlar', unit: 'dona', count: statsData.disconnected, share: '-' },
                      { key: '4', name: 'Davr oxiriga jami faol abonentlar (Baza)', unit: 'dona', count: statsData.endTotal, share: '100.0%' },
                      { key: '5', name: '— Jismoniy shaxslar (Aholi xonadonlari)', unit: 'dona', count: statsData.breakdown?.physical || 0, share: statsData.endTotal > 0 ? `${(((statsData.breakdown?.physical || 0) / statsData.endTotal) * 100).toFixed(1)}%` : '0%' },
                      { key: '6', name: '— Yuridik shaxslar (Korxona va tashkilotlar)', unit: 'dona', count: statsData.breakdown?.legal || 0, share: statsData.endTotal > 0 ? `${(((statsData.breakdown?.legal || 0) / statsData.endTotal) * 100).toFixed(1)}%` : '0%' },
                      { key: '7', name: '— Hisoblagich (vodomer) o\'rnatilgan abonentlar', unit: 'dona', count: statsData.breakdown?.metered || 0, share: statsData.endTotal > 0 ? `${(((statsData.breakdown?.metered || 0) / statsData.endTotal) * 100).toFixed(1)}%` : '0%' },
                      { key: '8', name: '— Normativ (hisoblagichsiz) abonentlar', unit: 'dona', count: statsData.breakdown?.normative || 0, share: statsData.endTotal > 0 ? `${(((statsData.breakdown?.normative || 0) / statsData.endTotal) * 100).toFixed(1)}%` : '0%' },
                    ]}
                    pagination={false}
                    size="middle"
                    className="dense-billing-table"
                    columns={[
                      {
                        title: '№',
                        dataIndex: 'key',
                        width: 50,
                        align: 'center',
                        render: (val: string) => <span className="text-xs font-bold text-slate-400">{val}</span>
                      },
                      {
                        title: 'Ko\'rsatkich nomi',
                        dataIndex: 'name',
                        render: (val: string) => {
                          const isBold = val.startsWith('Davr oxiriga') || val.startsWith('Davr boshiga');
                          return (
                            <span className={`text-xs ${isBold ? 'font-black text-slate-900' : 'font-medium text-slate-700'}`}>
                              {val}
                            </span>
                          );
                        }
                      },
                      {
                        title: 'Birligi',
                        dataIndex: 'unit',
                        width: 80,
                        align: 'center',
                        render: (val: string) => <span className="text-xs text-slate-500">{val}</span>
                      },
                      {
                        title: 'Abonentlar soni',
                        dataIndex: 'count',
                        width: 140,
                        align: 'right',
                        render: (val: number) => (
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {formatNumber(val)} ta
                          </span>
                        )
                      },
                      {
                        title: 'Ulushi (%)',
                        dataIndex: 'share',
                        width: 110,
                        align: 'center',
                        render: (val: string) => (
                          val === '-' ? <span className="text-xs text-slate-400">-</span> : (
                            <Tag color="blue" className="font-bold text-xs m-0">
                              {val}
                            </Tag>
                          )
                        )
                      }
                    ]}
                  />
                </div>
              </Col>

              {/* Panel B: Strukturaviy Vizual Taqsimot */}
              <Col xs={24} lg={10}>
                <div className="bg-white rounded-lg shadow-xs border border-slate-200 p-4 space-y-5 h-full flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0 mb-1">Abonentlar bazasi tarkibi va tahlili</h4>
                    <p className="text-xs text-slate-500 m-0">Suv hisoblagich bilan ta'minlanganlik va toifalar proporsiyasi</p>

                    <div className="space-y-4 mt-4">
                      {/* Metered Coverage */}
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                            Hisoblagichli xonadonlar (Vodomer):
                          </span>
                          <span className="text-xs font-extrabold text-emerald-700">
                            {statsData.endTotal > 0
                              ? ((statsData.breakdown?.metered / statsData.endTotal) * 100).toFixed(1)
                              : 0}% ({formatNumber(statsData.breakdown?.metered)} ta)
                          </span>
                        </div>
                        <Progress
                          percent={statsData.endTotal > 0 ? Math.round((statsData.breakdown?.metered / statsData.endTotal) * 100) : 0}
                          status="active"
                          strokeColor="#10b981"
                        />
                      </div>

                      {/* Normative Coverage */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                            Normativ bo'yicha (Hisoblagichsiz):
                          </span>
                          <span className="text-xs font-extrabold text-amber-700">
                            {statsData.endTotal > 0
                              ? ((statsData.breakdown?.normative / statsData.endTotal) * 100).toFixed(1)
                              : 0}% ({formatNumber(statsData.breakdown?.normative)} ta)
                          </span>
                        </div>
                        <Progress
                          percent={statsData.endTotal > 0 ? Math.round((statsData.breakdown?.normative / statsData.endTotal) * 100) : 0}
                          strokeColor="#f59e0b"
                        />
                      </div>

                      {/* Physical vs Legal */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                            Aholi (Jismoniy) vs Tashkilotlar:
                          </span>
                          <span className="text-xs font-extrabold text-blue-700">
                            {statsData.breakdown?.physical || 0} / {statsData.breakdown?.legal || 0}
                          </span>
                        </div>
                        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-200">
                          <div
                            className="bg-blue-600 h-full"
                            style={{
                              width: `${statsData.endTotal > 0 ? ((statsData.breakdown?.physical || 0) / statsData.endTotal) * 100 : 100}%`
                            }}
                          />
                          <div
                            className="bg-indigo-600 h-full"
                            style={{
                              width: `${statsData.endTotal > 0 ? ((statsData.breakdown?.legal || 0) / statsData.endTotal) * 100 : 0}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                          <span>Aholi: {statsData.breakdown?.physical || 0} ta</span>
                          <span>Yuridik: {statsData.breakdown?.legal || 0} ta</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net growth note */}
                  <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <div>
                        <span className="text-xs font-bold text-emerald-900 block">Sof abonent o'sishi (Net growth):</span>
                        <span className="text-[11px] text-emerald-700">Yangi ulanganlar va uzilganlar farqi</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-emerald-700 font-mono">
                      +{formatNumber((statsData.newlyAdded || 0) - (statsData.disconnected || 0))} ta
                    </span>
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 4. ABONENTLAR TUSHUMLARI (OYMA-OY MATRITSA) TAB */}
      {/* ============================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-lg shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-600">Davr:</span>
                <RangePicker
                  value={paymentsRange}
                  onChange={(d) => d && d[0] && d[1] && setPaymentsRange([d[0], d[1]])}
                  format="YYYY-MM-DD"
                  allowClear={false}
                  size="small"
                  className="border-none shadow-none bg-transparent text-xs"
                />
              </div>

              <div className="w-60">
                <Input
                  prefix={<Search size={13} className="text-slate-400 mr-1" />}
                  placeholder="F.I.SH. yoki L/S qidirish..."
                  value={paymentsSearch}
                  onChange={(e) => {
                    setPaymentsSearch(e.target.value);
                    setPaymentsPage(1);
                  }}
                  allowClear
                  size="small"
                  className="rounded text-xs"
                />
              </div>

              <Button
                icon={<RefreshCw size={13} className={paymentsLoading ? 'animate-spin' : ''} />}
                onClick={fetchPayments}
                loading={paymentsLoading}
                type="primary"
                size="small"
                className="rounded font-medium text-xs"
              >
                Yangilash
              </Button>
            </div>

            <Button
              icon={<FileSpreadsheet size={14} />}
              onClick={exportPayments}
              loading={paymentsExporting}
              size="small"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs border-none shadow-xs flex items-center gap-1.5"
            >
              Excel yuklab olish
            </Button>
          </div>

          {/* KPI Summary Cards */}
          {paymentsData && (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={8}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">To'lov qilgan abonentlar</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-sky-700 mt-1 block">
                      {formatNumber(paymentsData.totalAbonents)} <span className="text-xs font-normal text-slate-500">ta</span>
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">Davrda to'lov amalga oshirganlar</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Jami Undirilgan To'lovlar</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1 block">
                      {formatNumber(paymentsData.totalCollected)} <span className="text-xs font-normal text-emerald-600">UZS</span>
                    </span>
                    <span className="text-[11px] text-emerald-600 mt-0.5 block">Kassa, bank va onlayn to'lovlar</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">O'rtacha Bitta Abonent To'lovi</span>
                    <span className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                      {paymentsData.totalAbonents > 0
                        ? formatNumber(Math.round(paymentsData.totalCollected / paymentsData.totalAbonents))
                        : '0'} <span className="text-xs font-normal text-slate-500">UZS</span>
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">O'rtacha to'lov ko'rsatkichi</span>
                  </div>
                  <div className="w-9 h-9 rounded bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Wallet size={18} />
                  </div>
                </div>
              </Col>
            </Row>
          )}

          {/* Matrix Table */}
          <div className="bg-white rounded-lg shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-800 m-0">Abonentlar kesimida oylik to'lovlar matritsasi</h4>
                <p className="text-xs text-slate-500 m-0 mt-0.5">Har bir abonentning oylar bo'yicha to'lagan summalari va jamlanmasi</p>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {filteredAbonentPayments.length} ta abonentdan {(paymentsPage - 1) * paymentsPageSize + 1}-
                {Math.min(paymentsPage * paymentsPageSize, filteredAbonentPayments.length)} ko'rsatilmoqda
              </span>
            </div>

            <Table
              dataSource={paginatedAbonentPayments}
              rowKey="id"
              loading={paymentsLoading}
              pagination={false}
              size="middle"
              scroll={{ x: 'max-content' }}
              className="dense-billing-table"
              columns={[
                {
                  title: '#',
                  key: 'index',
                  width: 60,
                  align: 'center',
                  fixed: 'left',
                  render: (_: any, __: any, index: number) => (
                    <span className="text-xs font-bold text-slate-400">
                      {(paymentsPage - 1) * paymentsPageSize + index + 1}
                    </span>
                  )
                },
                {
                  title: 'Hisob raqam',
                  dataIndex: 'abonentNumber',
                  key: 'abonentNumber',
                  width: 140,
                  fixed: 'left',
                  render: (val: string) => (
                    <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-800">
                      {val}
                    </span>
                  )
                },
                {
                  title: 'Abonent F.I.SH.',
                  dataIndex: 'fullName',
                  key: 'fullName',
                  width: 220,
                  fixed: 'left',
                  render: (val: string) => (
                    <span className="text-xs font-bold text-slate-900 block truncate" title={val}>
                      {val}
                    </span>
                  )
                },
                // Dynamic Month Columns
                ...(paymentsData?.months || []).map((m: string) => ({
                  title: m,
                  key: `m_${m}`,
                  width: 130,
                  align: 'right' as const,
                  render: (_: any, record: any) => {
                    const amt = record.months?.[m] || 0;
                    return (
                      <span className={`text-xs font-mono ${amt > 0 ? 'font-bold text-emerald-700' : 'text-slate-300'}`}>
                        {amt > 0 ? formatNumber(amt) : '-'}
                      </span>
                    );
                  }
                })),
                {
                  title: 'Jami to\'lov (UZS)',
                  dataIndex: 'total',
                  key: 'total',
                  width: 160,
                  align: 'right',
                  fixed: 'right',
                  render: (val: number) => (
                    <span className="text-xs font-black text-indigo-700 font-mono">
                      {formatNumber(val)} UZS
                    </span>
                  )
                }
              ]}
              summary={() => {
                if (!paymentsData?.monthlyTotals) return null;
                const monthlyMap = new Map<string, number>(paymentsData.monthlyTotals.map((mt: any) => [mt.month, Number(mt.total || 0)]));
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                      <Table.Summary.Cell index={0} align="center">
                        <span className="text-xs text-slate-700 uppercase">JAMI</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <span className="text-xs text-slate-800 font-bold">{paymentsData.totalAbonents} ta</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <span className="text-xs text-slate-600 font-semibold">Oylik tushumlar jamlanmasi</span>
                      </Table.Summary.Cell>
                      {(paymentsData.months || []).map((m: string, idx: number) => (
                        <Table.Summary.Cell key={m} index={3 + idx} align="right">
                          <span className="text-xs text-emerald-800 font-black font-mono">
                            {formatNumber(monthlyMap.get(m) ?? 0)}
                          </span>
                        </Table.Summary.Cell>
                      ))}
                      <Table.Summary.Cell index={3 + (paymentsData.months?.length || 0)} align="right">
                        <span className="text-xs text-indigo-800 font-black font-mono">
                          {formatNumber(paymentsData.totalCollected)} UZS
                        </span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Jami {filteredAbonentPayments.length} ta yozuv
              </span>
              <Pagination
                current={paymentsPage}
                pageSize={paymentsPageSize}
                total={filteredAbonentPayments.length}
                onChange={(page, pageSize) => {
                  setPaymentsPage(page);
                  setPaymentsPageSize(pageSize);
                }}
                showSizeChanger
                pageSizeOptions={['10', '20', '50', '100']}
                size="small"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReports;
