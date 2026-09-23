import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Tabs, Table, Card, DatePicker, Button, Row, Col, message,
  Select, InputNumber, Tag, Input, Alert, Spin, Tooltip as AntTooltip
} from 'antd';
import {
  Download, Search, FileSpreadsheet, Wallet, Users, FileText,
  PieChart as PieChartIcon, TrendingUp, Calculator, Calendar,
  CheckCircle, AlertTriangle, Building2, Filter, RefreshCw, BarChart2
} from 'lucide-react';
import {
  getDebtors, getReportAbonents, exportAbonents, exportDebtors,
  getMonthlyLedger, exportMonthlyLedger, getDistrictAnalytics,
  getCollectorVedomost, exportCollectorVedomost
} from '../../services/reportService';
import { getMahallas, getStreets } from '../../services/addressService';
import {
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, XAxis, YAxis,
  CartesianGrid, Legend, ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import TaxReports from './TaxReports';
import GovernmentReports from './GovernmentReports';

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

const DONUT_COLORS_METERS = ['#10B981', '#F59E0B'];
const DONUT_COLORS_PAYERS = ['#0EA5E9', '#EF4444'];

const Reports: React.FC = () => {
  const { t } = useLanguage();
  const { role } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('monthly');

  // Common Metadata
  const [mahallas, setMahallas] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);

  useEffect(() => {
    getMahallas().then(setMahallas).catch(console.error);
  }, []);

  // -------------------------------------------------------------
  // TAB 1: OYMA-OY TUSHUM VEDOMOSTI
  // -------------------------------------------------------------
  const [monthlyYear, setMonthlyYear] = useState<number>(dayjs().year());
  const [monthlyMahallaId, setMonthlyMahallaId] = useState<string | undefined>(undefined);
  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(false);
  const [monthlyExporting, setMonthlyExporting] = useState<boolean>(false);
  const [monthlyData, setMonthlyData] = useState<any>({ months: [], summary: {} });

  const fetchMonthly = useCallback(async (year = monthlyYear, mahallaId = monthlyMahallaId) => {
    setMonthlyLoading(true);
    try {
      const res = await getMonthlyLedger({ year, mahallaId });
      setMonthlyData(res);
    } catch (e) {
      console.error(e);
      message.error("Oyma-oy tushum ma'lumotlarini yuklashda xatolik");
    } finally {
      setMonthlyLoading(false);
    }
  }, [monthlyYear, monthlyMahallaId]);

  const handleExportMonthly = async () => {
    setMonthlyExporting(true);
    try {
      const blob = await exportMonthlyLedger({ year: monthlyYear, mahallaId: monthlyMahallaId });
      downloadBlob(blob, `oyma_oy_tushum_${monthlyYear}.xlsx`);
      message.success("Oylik vedomost Excel formatida yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik");
    } finally {
      setMonthlyExporting(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: PUL YIG'UVCHILAR (NAZORATCHILAR) VEDOMOSTI
  // -------------------------------------------------------------
  const [collectorPeriodType, setCollectorPeriodType] = useState<'daily' | 'monthly' | 'range'>('daily');
  const [collectorDate, setCollectorDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [collectorMonth, setCollectorMonth] = useState<dayjs.Dayjs | null>(dayjs());
  const [collectorRange, setCollectorRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().startOf('month'), dayjs()
  ]);
  const [collectorMahallaId, setCollectorMahallaId] = useState<string | undefined>(undefined);
  const [selectedCollectorId, setSelectedCollectorId] = useState<string | undefined>(undefined);
  const [collectorsLoading, setCollectorsLoading] = useState<boolean>(false);
  const [collectorsExporting, setCollectorsExporting] = useState<boolean>(false);
  const [collectorsData, setCollectorsData] = useState<any>({ collectors: [], summary: {} });

  const fetchCollectors = useCallback(async () => {
    setCollectorsLoading(true);
    try {
      const params: any = {
        periodType: collectorPeriodType,
        mahallaId: collectorMahallaId,
        collectorId: selectedCollectorId
      };
      if (collectorPeriodType === 'daily' && collectorDate) {
        params.date = collectorDate.format('YYYY-MM-DD');
      } else if (collectorPeriodType === 'monthly' && collectorMonth) {
        params.month = collectorMonth.format('YYYY-MM');
      } else if (collectorPeriodType === 'range' && collectorRange) {
        params.startDate = collectorRange[0].format('YYYY-MM-DD');
        params.endDate = collectorRange[1].format('YYYY-MM-DD');
      }
      const res = await getCollectorVedomost(params);
      setCollectorsData(res);
    } catch (e) {
      console.error(e);
      message.error("Nazoratchilar vedomostini yuklashda xatolik");
    } finally {
      setCollectorsLoading(false);
    }
  }, [collectorPeriodType, collectorDate, collectorMonth, collectorRange, collectorMahallaId, selectedCollectorId]);

  const handleExportCollectors = async () => {
    setCollectorsExporting(true);
    try {
      const params: any = {
        periodType: collectorPeriodType,
        mahallaId: collectorMahallaId,
        collectorId: selectedCollectorId
      };
      if (collectorPeriodType === 'daily' && collectorDate) {
        params.date = collectorDate.format('YYYY-MM-DD');
      } else if (collectorPeriodType === 'monthly' && collectorMonth) {
        params.month = collectorMonth.format('YYYY-MM');
      } else if (collectorPeriodType === 'range' && collectorRange) {
        params.startDate = collectorRange[0].format('YYYY-MM-DD');
        params.endDate = collectorRange[1].format('YYYY-MM-DD');
      }
      const blob = await exportCollectorVedomost(params);
      downloadBlob(blob, `nazoratchilar_vedomosti_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      message.success("Nazoratchilar vedomosti Excel formatida yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik");
    } finally {
      setCollectorsExporting(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: ABONENTLAR REYESTRI (BAZA EKSPORTI)
  // -------------------------------------------------------------
  const [abonentsReport, setAbonentsReport] = useState<any[]>([]);
  const [abonentsTotal, setAbonentsTotal] = useState(0);
  const [loadingAbonents, setLoadingAbonents] = useState(false);
  const [exportingAbonents, setExportingAbonents] = useState(false);
  const [abonentFilters, setAbonentFilters] = useState<{
    mahallaId?: string;
    streetId?: string;
    type?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    pageSize: number;
  }>({
    mahallaId: undefined,
    streetId: undefined,
    type: undefined,
    status: undefined,
    search: undefined,
    startDate: undefined,
    endDate: undefined,
    page: 1,
    pageSize: 20
  });

  const fetchAbonentsReport = useCallback(async (filters = abonentFilters) => {
    setLoadingAbonents(true);
    try {
      const queryFilters: any = {
        take: String(filters.pageSize),
        skip: String((filters.page - 1) * filters.pageSize)
      };
      if (filters.mahallaId) queryFilters.mahallaId = filters.mahallaId;
      if (filters.streetId) queryFilters.streetId = filters.streetId;
      if (filters.type) queryFilters.type = filters.type;
      if (filters.status) queryFilters.status = filters.status;
      if (filters.search) queryFilters.search = filters.search;
      if (filters.startDate) queryFilters.startDate = filters.startDate;
      if (filters.endDate) queryFilters.endDate = filters.endDate;
      const result = await getReportAbonents(queryFilters);
      setAbonentsReport(result.data || []);
      setAbonentsTotal(result.total || 0);
    } catch (error) {
      message.error("Abonentlar bazasini yuklashda xatolik");
    } finally {
      setLoadingAbonents(false);
    }
  }, [abonentFilters]);

  const handleExportAbonents = async () => {
    setExportingAbonents(true);
    try {
      const blob = await exportAbonents(abonentFilters);
      downloadBlob(blob, `abonentlar_to'liq_baza_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      message.success("To'liq abonentlar bazasi Excel formatida yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik");
    } finally {
      setExportingAbonents(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: QARZDORLIK VEDOMOSTI
  // -------------------------------------------------------------
  const [debtors, setDebtors] = useState<any[]>([]);
  const [loadingDebtors, setLoadingDebtors] = useState(false);
  const [exportingDebtors, setExportingDebtors] = useState(false);
  const [debtorFilters, setDebtorFilters] = useState<{
    mahallaId?: string;
    streetId?: string;
    minDebt?: number | null;
    monthsUnpaid?: number | null;
  }>({
    mahallaId: undefined,
    streetId: undefined,
    minDebt: undefined,
    monthsUnpaid: undefined
  });

  const fetchDebtors = async () => {
    setLoadingDebtors(true);
    try {
      const data = await getDebtors(debtorFilters);
      setDebtors(data || []);
    } catch (error) {
      message.error("Qarzdorlarni yuklashda xatolik");
    } finally {
      setLoadingDebtors(false);
    }
  };

  const handleExportDebtors = async () => {
    setExportingDebtors(true);
    try {
      const blob = await exportDebtors(debtorFilters);
      downloadBlob(blob, `qarzdorlar_vedomosti_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      message.success("Qarzdorlar vedomosti Excel formatida yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik");
    } finally {
      setExportingDebtors(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 5: RASMIY SHAKLLAR & SOLIQ
  // -------------------------------------------------------------
  const [govSubTab, setGovSubTab] = useState<'forms' | 'tax'>('forms');

  // -------------------------------------------------------------
  // TAB 6: TUMAN UMUMIY GRAFIGI & TAHLILI
  // -------------------------------------------------------------
  const [districtYear, setDistrictYear] = useState<number>(dayjs().year());
  const [districtLoading, setDistrictLoading] = useState<boolean>(false);
  const [districtData, setDistrictData] = useState<any>({
    totalAbonents: 0,
    activeAbonents: 0,
    meteredCount: 0,
    normativeCount: 0,
    meteredPercent: 0,
    normativePercent: 0,
    debtorsCount: 0,
    debtorsPercent: 0,
    payingCount: 0,
    payingPercent: 0,
    totalDebt: 0,
    totalPrepayment: 0,
    totalYearlyCollection: 0,
    paymentMethods: {},
    mahallaAnalytics: []
  });

  const fetchDistrict = useCallback(async (year = districtYear) => {
    setDistrictLoading(true);
    try {
      const res = await getDistrictAnalytics({ year });
      setDistrictData(res);
    } catch (e) {
      console.error(e);
      message.error("Tuman umumiy ko'rsatkichlarini yuklashda xatolik");
    } finally {
      setDistrictLoading(false);
    }
  }, [districtYear]);

  // Tab change handler
  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthly();
    } else if (activeTab === 'collectors') {
      fetchCollectors();
    } else if (activeTab === 'abonents') {
      fetchAbonentsReport();
    } else if (activeTab === 'debtors') {
      fetchDebtors();
    } else if (activeTab === 'district') {
      fetchDistrict();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mahalla change helper for streets
  const handleMahallaChange = (mahallaId?: string) => {
    if (mahallaId) {
      getStreets(mahallaId).then(setStreets).catch(console.error);
    } else {
      setStreets([]);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto pt-2 pb-8 flex flex-col min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" size={26} />
            Hisobotlar Markazi
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Billing operatorlari va buxgalteriya uchun oylik vedomostlar, kassa hisobotlari va tuman umumiy tahlili
          </p>
        </div>
      </div>

      {/* Main Container with 6 Top Tabs */}
      <div className="flex flex-col bg-white rounded-lg shadow-xs border border-slate-200 flex-1 overflow-hidden">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          className="custom-top-tabs [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-tab]:px-4 [&_.ant-tabs-tab]:py-2 [&_.ant-tabs-tab]:rounded-md [&_.ant-tabs-tab]:border-transparent [&_.ant-tabs-tab]:bg-white [&_.ant-tabs-tab]:shadow-xs [&_.ant-tabs-tab-active]:bg-sky-600 [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-white [&_.ant-tabs-nav-list]:gap-1.5 p-2.5 bg-slate-50 border-b border-slate-200"
          items={[
            {
              key: 'monthly',
              label: (
                <div className="flex items-center gap-2 font-semibold text-[14px]">
                  <TrendingUp size={16} />
                  1. Oyma-oy Tushum
                </div>
              ),
            },
            {
              key: 'collectors',
              label: (
                <div className="flex items-center gap-2 font-semibold text-[14px]">
                  <Wallet size={16} />
                  2. Pul Yig'uvchilar
                </div>
              ),
            },
            {
              key: 'abonents',
              label: (
                <div className="flex items-center gap-2 font-semibold text-[14px]">
                  <Users size={16} />
                  3. Abonentlar Reyestri
                </div>
              ),
            },
            {
              key: 'debtors',
              label: (
                <div className="flex items-center gap-2 font-semibold text-[14px]">
                  <AlertTriangle size={16} />
                  4. Qarzdorlik Vedomosti
                </div>
              ),
            },
            {
              key: 'gov',
              label: (
                <div className="flex items-center gap-2 font-semibold text-[14px]">
                  <Building2 size={16} />
                  5. Rasmiy Shakllar
                </div>
              ),
            },
            {
              key: 'district',
              label: (
                <div className="flex items-center gap-2 font-semibold text-[14px]">
                  <BarChart2 size={16} />
                  6. Tuman Umumiy Grafigi
                </div>
              ),
            },
          ]}
        />

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto bg-white p-5">
          {/* ============================================================= */}
          {/* TAB 1: OYMA-OY TUSHUM VEDOMOSTI */}
          {/* ============================================================= */}
          {activeTab === 'monthly' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Filter Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-xs text-slate-700 uppercase tracking-wide">Yil:</span>
                  <Select
                    value={monthlyYear}
                    onChange={(y) => { setMonthlyYear(y); fetchMonthly(y, monthlyMahallaId); }}
                    className="w-32"
                  >
                    {[2026, 2025, 2024, 2023].map(y => (
                      <Select.Option key={y} value={y}>{y}-yil</Select.Option>
                    ))}
                  </Select>

                  <span className="font-semibold text-xs text-slate-700 uppercase tracking-wide ml-2">Mahalla:</span>
                  <Select
                    placeholder="Barcha mahallalar"
                    allowClear
                    className="w-56"
                    value={monthlyMahallaId}
                    onChange={(m) => { setMonthlyMahallaId(m); fetchMonthly(monthlyYear, m); }}
                    showSearch
                    optionFilterProp="children"
                  >
                    {mahallas.map(m => (
                      <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>
                    ))}
                  </Select>

                  <Button
                    icon={<RefreshCw size={14} />}
                    onClick={() => fetchMonthly()}
                    loading={monthlyLoading}
                  >
                    Yangilash
                  </Button>
                </div>

                <Button
                  type="primary"
                  icon={<FileSpreadsheet size={16} />}
                  onClick={handleExportMonthly}
                  loading={monthlyExporting}
                  className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 font-semibold shadow-sm"
                >
                  Excelga Yuklash (Barcha oylar)
                </Button>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Yillik Jami Tushum</span>
                  <span className="text-2xl font-black text-blue-700">
                    {(monthlyData.summary?.totalIncome || 0).toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-500">UZS</span>
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">Jami to'lovlar soni: {monthlyData.summary?.totalPaymentCount || 0} ta</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Aholi Naqd Kassa</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {(monthlyData.summary?.totalCashAholi || 0).toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-500">UZS</span>
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">Kassirlar va nazoratchilar orqali</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Aholi Onlayn (Click/Payme)</span>
                  <span className="text-2xl font-black text-indigo-600">
                    {(monthlyData.summary?.totalOnlineAholi || 0).toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-500">UZS</span>
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">Mobil ilovalar va elektron tizim</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Yillik Reja Bajarilishi</span>
                  <span className="text-2xl font-black text-slate-800">
                    {monthlyData.summary?.overallCompletionPercent || 0}%
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">
                    Reja: {(monthlyData.summary?.totalTarget || 0).toLocaleString('uz-UZ')} UZS
                  </span>
                </div>
              </div>

              {/* Financial Ledger Table (Excel-Style) */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <Table
                  dataSource={monthlyData.months || []}
                  rowKey="month"
                  loading={monthlyLoading}
                  pagination={false}
                  size="small"
                  bordered
                  columns={[
                    {
                      title: 'Oy',
                      dataIndex: 'monthName',
                      key: 'monthName',
                      width: 130,
                      render: (v: string, r: any) => (
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Calendar size={14} className="text-blue-500" />
                          {v}
                        </span>
                      )
                    },
                    {
                      title: 'Aholi naqd kassa (UZS)',
                      dataIndex: 'cashAholi',
                      key: 'cashAholi',
                      align: 'right',
                      render: (v: number) => <span className="font-mono text-slate-700">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'Aholi Click/Payme (UZS)',
                      dataIndex: 'onlineAholi',
                      key: 'onlineAholi',
                      align: 'right',
                      render: (v: number) => <span className="font-mono text-slate-700">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'Aholi bank (UZS)',
                      dataIndex: 'bankAholi',
                      key: 'bankAholi',
                      align: 'right',
                      render: (v: number) => <span className="font-mono text-slate-700">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'Yuridik tushum (UZS)',
                      dataIndex: 'legalIncome',
                      key: 'legalIncome',
                      align: 'right',
                      render: (v: number) => <span className="font-mono text-slate-700">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'JAMI TUSHUM (UZS)',
                      dataIndex: 'totalIncome',
                      key: 'totalIncome',
                      align: 'right',
                      className: 'bg-blue-50/50 font-bold',
                      render: (v: number) => <span className="font-mono font-bold text-blue-800">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'Oylik Reja (UZS)',
                      dataIndex: 'target',
                      key: 'target',
                      align: 'right',
                      render: (v: number) => <span className="font-mono text-slate-500">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'Bajarilish %',
                      dataIndex: 'completionPercent',
                      key: 'completionPercent',
                      align: 'center',
                      width: 110,
                      render: (v: number) => (
                        <Tag color={v >= 100 ? 'green' : v >= 80 ? 'blue' : v >= 50 ? 'orange' : 'red'} className="font-bold">
                          {v}%
                        </Tag>
                      )
                    },
                    {
                      title: 'Farq (+/-)',
                      dataIndex: 'difference',
                      key: 'difference',
                      align: 'right',
                      render: (v: number) => (
                        <span className={`font-mono font-semibold ${v < 0 ? 'text-red-600' : v > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {v > 0 ? `+${v.toLocaleString('uz-UZ')}` : v.toLocaleString('uz-UZ')}
                        </span>
                      )
                    },
                  ]}
                  summary={() => {
                    const s = monthlyData.summary || {};
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                          <Table.Summary.Cell index={0} className="font-black text-slate-900">
                            JAMI / YAKUNIY
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right" className="font-mono font-bold">
                            {(s.totalCashAholi || 0).toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right" className="font-mono font-bold">
                            {(s.totalOnlineAholi || 0).toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right" className="font-mono font-bold">
                            {(s.totalBankAholi || 0).toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right" className="font-mono font-bold">
                            {(s.totalLegalIncome || 0).toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right" className="font-mono font-black text-blue-900 bg-blue-100/50">
                            {(s.totalIncome || 0).toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right" className="font-mono font-bold text-slate-600">
                            {(s.totalTarget || 0).toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={7} align="center" className="font-bold">
                            <Tag color="blue" className="font-black">{s.overallCompletionPercent || 0}%</Tag>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={8} align="right" className={`font-mono font-bold ${(s.totalDifference || 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {(s.totalDifference || 0) > 0 ? `+${(s.totalDifference || 0).toLocaleString('uz-UZ')}` : (s.totalDifference || 0).toLocaleString('uz-UZ')}
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
          {/* TAB 2: PUL YIG'UVCHILAR (NAZORATCHILAR) VEDOMOSTI */}
          {/* ============================================================= */}
          {activeTab === 'collectors' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Filter Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Period Switcher Pills */}
                  <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
                    <button
                      onClick={() => { setCollectorPeriodType('daily'); }}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${collectorPeriodType === 'daily' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Kunlik Hisobot
                    </button>
                    <button
                      onClick={() => { setCollectorPeriodType('monthly'); }}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${collectorPeriodType === 'monthly' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Oylik Hisobot
                    </button>
                    <button
                      onClick={() => { setCollectorPeriodType('range'); }}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${collectorPeriodType === 'range' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Oraliq tanlash
                    </button>
                  </div>

                  {/* Date Picker depending on periodType */}
                  {collectorPeriodType === 'daily' && (
                    <DatePicker
                      value={collectorDate}
                      onChange={(d) => setCollectorDate(d)}
                      allowClear={false}
                      className="w-40"
                    />
                  )}
                  {collectorPeriodType === 'monthly' && (
                    <DatePicker
                      picker="month"
                      value={collectorMonth}
                      onChange={(d) => setCollectorMonth(d)}
                      allowClear={false}
                      className="w-40"
                    />
                  )}
                  {collectorPeriodType === 'range' && (
                    <RangePicker
                      value={collectorRange}
                      onChange={(r) => setCollectorRange(r as any)}
                      format="DD.MM.YYYY"
                      className="w-64"
                    />
                  )}

                  <Select
                    placeholder="Barcha mahallalar"
                    allowClear
                    className="w-48"
                    value={collectorMahallaId}
                    onChange={(m) => setCollectorMahallaId(m)}
                    showSearch
                    optionFilterProp="children"
                  >
                    {mahallas.map(m => (
                      <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>
                    ))}
                  </Select>

                  <Button
                    type="primary"
                    onClick={fetchCollectors}
                    loading={collectorsLoading}
                    className="bg-slate-900 hover:bg-slate-800"
                  >
                    Shakllantirish
                  </Button>
                </div>

                <Button
                  type="primary"
                  icon={<FileSpreadsheet size={16} />}
                  onClick={handleExportCollectors}
                  loading={collectorsExporting}
                  className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 font-semibold shadow-sm"
                >
                  Excelga Yuklash (Nazoratchilar)
                </Button>
              </div>

              {/* Collector KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Jami Yig'ilgan Summa</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {(collectorsData.summary?.totalAmount || 0).toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-500">UZS</span>
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">Faol nazoratchilar soni: {collectorsData.summary?.activeCollectors || 0} ta</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Naqd Kassa Tushumi</span>
                  <span className="text-2xl font-black text-blue-700">
                    {(collectorsData.summary?.totalCash || 0).toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-500">UZS</span>
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">Onlayn to'lovlar: {(collectorsData.summary?.totalOnline || 0).toLocaleString('uz-UZ')} UZS</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Jami Kvitansiyalar Soni</span>
                  <span className="text-2xl font-black text-slate-800">
                    {(collectorsData.summary?.totalReceipts || 0).toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-500">ta chek</span>
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">Barcha tasdiqlangan to'lovlar</span>
                </div>
              </div>

              {/* Collector Table with Expandable Drill-Down Receipts */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <Table
                  dataSource={collectorsData.collectors || []}
                  rowKey="id"
                  loading={collectorsLoading}
                  pagination={false}
                  size="middle"
                  bordered
                  expandable={{
                    expandedRowRender: (record: any) => {
                      if (!record.payments || record.payments.length === 0) {
                        return <div className="p-4 text-center text-slate-400 text-xs">Ushbu davrda kvitansiyalar mavjud emas</div>;
                      }
                      return (
                        <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700">
                              {record.fullName} — qabul qilingan cheklar ro'yxati ({record.payments.length} ta)
                            </span>
                          </div>
                          <Table
                            dataSource={record.payments}
                            rowKey="id"
                            size="small"
                            pagination={{ pageSize: 10 }}
                            columns={[
                              { title: '#', dataIndex: 'tr', width: 50, align: 'center' },
                              { title: 'Chek No', dataIndex: 'receiptNumber', render: (v: string) => <Tag color="blue">{v}</Tag> },
                              { title: 'Abonent No', dataIndex: 'abonentNumber', className: 'font-mono' },
                              { title: 'F.I.Sh', dataIndex: 'fullName', className: 'font-medium' },
                              { title: 'Mahalla', dataIndex: 'mahallaName' },
                              { title: 'Summa (UZS)', dataIndex: 'amount', align: 'right', render: (v: number) => <span className="font-mono font-bold text-emerald-600">{v.toLocaleString('uz-UZ')}</span> },
                              { title: 'To\'lov turi', dataIndex: 'paymentMethod', render: (v: string) => <Tag color={v === 'CASH' ? 'green' : 'blue'}>{v}</Tag> },
                              { title: 'Sana va Vaqt', dataIndex: 'date', render: (v: string) => dayjs(v).format('DD.MM.YYYY HH:mm') },
                            ]}
                          />
                        </div>
                      );
                    }
                  }}
                  columns={[
                    { title: 'T/R', dataIndex: 'tr', width: 60, align: 'center' },
                    {
                      title: 'Nazoratchi F.I.Sh',
                      dataIndex: 'fullName',
                      render: (v: string) => (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {v ? v.substring(0, 2).toUpperCase() : 'NZ'}
                          </div>
                          <span className="font-bold text-slate-800">{v}</span>
                        </div>
                      )
                    },
                    { title: 'Telefon', dataIndex: 'phone', className: 'font-mono text-slate-600' },
                    { title: 'Biriktirilgan hududlar', dataIndex: 'mahallas', className: 'text-slate-600' },
                    {
                      title: 'Naqd kassa (UZS)',
                      dataIndex: 'cashAmount',
                      align: 'right',
                      render: (v: number) => <span className="font-mono text-slate-700">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'Onlayn to\'lovlar (UZS)',
                      dataIndex: 'onlineAmount',
                      align: 'right',
                      render: (v: number) => <span className="font-mono text-slate-700">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'JAMI TUSHUM (UZS)',
                      dataIndex: 'totalAmount',
                      align: 'right',
                      className: 'bg-emerald-50/40 font-bold',
                      render: (v: number) => <span className="font-mono font-bold text-emerald-700">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'Kvitansiyalar',
                      dataIndex: 'receiptCount',
                      align: 'center',
                      width: 120,
                      render: (v: number) => <Tag color="geekblue" className="font-bold">{v} ta</Tag>
                    },
                  ]}
                  summary={() => {
                    const s = collectorsData.summary || {};
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                          <Table.Summary.Cell index={0} colSpan={4} className="font-black text-slate-900">
                            JAMI / YAKUNIY
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right" className="font-mono font-bold">
                            {(s.totalCash || 0).toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right" className="font-mono font-bold">
                            {(s.totalOnline || 0).toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right" className="font-mono font-black text-emerald-900 bg-emerald-100/50">
                            {(s.totalAmount || 0).toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={7} align="center" className="font-black">
                            <Tag color="purple" className="font-black">{s.totalReceipts || 0} ta</Tag>
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
          {/* TAB 3: ABONENTLAR REYESTRI (BAZA EKSPORTI) */}
          {/* ============================================================= */}
          {activeTab === 'abonents' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Prominent Action Bar */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 m-0">To'liq Abonentlar Bazasini Yuklab Olish</h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Tizimdagi barcha abonentlarning to'liq rekvizitlari, hisoblagichlari va joriy balanslari bilan Excel fayl
                  </p>
                </div>
                <Button
                  type="primary"
                  icon={<FileSpreadsheet size={16} />}
                  onClick={handleExportAbonents}
                  loading={exportingAbonents}
                  className="bg-emerald-600 hover:bg-emerald-700 font-medium text-xs rounded px-4 h-9"
                >
                  Excel yuklab olish
                </Button>
              </div>

              {/* Filters */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
                <Input
                  placeholder="Qidiruv (L/S, F.I.Sh, Telefon)..."
                  className="w-64"
                  prefix={<Search size={15} className="text-slate-400" />}
                  value={abonentFilters.search}
                  onChange={(e) => setAbonentFilters(p => ({ ...p, search: e.target.value }))}
                  onPressEnter={() => fetchAbonentsReport(abonentFilters)}
                />

                <Select
                  placeholder="Mahalla"
                  allowClear
                  className="w-48"
                  value={abonentFilters.mahallaId}
                  onChange={(val) => {
                    handleMahallaChange(val);
                    const f = { ...abonentFilters, mahallaId: val, streetId: undefined, page: 1 };
                    setAbonentFilters(f);
                    fetchAbonentsReport(f);
                  }}
                  showSearch
                  optionFilterProp="children"
                >
                  {mahallas.map(m => <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>)}
                </Select>

                <Select
                  placeholder="Ko'cha"
                  allowClear
                  className="w-44"
                  disabled={!abonentFilters.mahallaId}
                  value={abonentFilters.streetId}
                  onChange={(val) => {
                    const f = { ...abonentFilters, streetId: val, page: 1 };
                    setAbonentFilters(f);
                    fetchAbonentsReport(f);
                  }}
                  showSearch
                  optionFilterProp="children"
                >
                  {streets.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                </Select>

                <Select
                  placeholder="Toifa"
                  allowClear
                  className="w-36"
                  value={abonentFilters.type}
                  onChange={(val) => {
                    const f = { ...abonentFilters, type: val, page: 1 };
                    setAbonentFilters(f);
                    fetchAbonentsReport(f);
                  }}
                >
                  <Select.Option value="PHYSICAL">Aholi</Select.Option>
                  <Select.Option value="LEGAL">Yuridik</Select.Option>
                </Select>

                <Select
                  placeholder="Holat"
                  allowClear
                  className="w-36"
                  value={abonentFilters.status}
                  onChange={(val) => {
                    const f = { ...abonentFilters, status: val, page: 1 };
                    setAbonentFilters(f);
                    fetchAbonentsReport(f);
                  }}
                >
                  <Select.Option value="ACTIVE">Faol</Select.Option>
                  <Select.Option value="PENDING">Kutishda</Select.Option>
                  <Select.Option value="SUSPENDED">To'xtatilgan</Select.Option>
                  <Select.Option value="DISCONNECTED">Uzilgan</Select.Option>
                  <Select.Option value="ARCHIVED">Arxiv</Select.Option>
                </Select>

                <Button
                  type="primary"
                  onClick={() => fetchAbonentsReport(abonentFilters)}
                  className="bg-slate-900 hover:bg-slate-800 ml-auto"
                >
                  Filtrlash
                </Button>
              </div>

              {/* Live Abonent Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <Table
                  dataSource={abonentsReport}
                  rowKey="id"
                  loading={loadingAbonents}
                  size="middle"
                  bordered
                  pagination={{
                    current: abonentFilters.page,
                    pageSize: abonentFilters.pageSize,
                    total: abonentsTotal,
                    showSizeChanger: true,
                    pageSizeOptions: ['20', '50', '100'],
                    onChange: (page, pageSize) => {
                      const f = { ...abonentFilters, page, pageSize };
                      setAbonentFilters(f);
                      fetchAbonentsReport(f);
                    }
                  }}
                  columns={[
                    { title: 'Abonent No', dataIndex: 'abonentNumber', key: 'abonentNumber', width: 140, className: 'font-mono font-bold text-slate-800' },
                    { title: 'F.I.Sh', dataIndex: 'fullName', key: 'fullName', className: 'font-semibold' },
                    {
                      title: 'Manzil',
                      key: 'address',
                      render: (_, r: any) => `${r.mahalla?.name || ''}, ${r.street?.name || ''}, ${r.house || ''}`
                    },
                    {
                      title: 'Hisoblagich',
                      key: 'meter',
                      width: 140,
                      render: (_, r: any) => (
                        r.Meters && r.Meters.length > 0
                          ? <Tag color="green">№ {r.Meters[0].number || '-'}</Tag>
                          : <Tag color="default">Normativ</Tag>
                      )
                    },
                    {
                      title: 'Tarif',
                      key: 'tariff',
                      width: 150,
                      render: (_, r: any) => r.tariff ? `${r.tariff.category}` : '-'
                    },
                    {
                      title: 'Holat',
                      dataIndex: 'status',
                      width: 120,
                      render: (v: string) => (
                        <Tag color={v === 'ACTIVE' ? 'green' : v === 'SUSPENDED' ? 'orange' : v === 'ARCHIVED' ? 'default' : 'red'}>
                          {v === 'ACTIVE' ? 'Faol' : v === 'SUSPENDED' ? 'To\'xtatilgan' : v === 'ARCHIVED' ? 'Arxiv' : v === 'DISCONNECTED' ? 'Uzilgan' : v}
                        </Tag>
                      )
                    },
                    {
                      title: 'Balans',
                      dataIndex: 'balance',
                      align: 'right',
                      width: 150,
                      render: (v: number) => {
                        const num = Number(v) || 0;
                        if (num > 0) {
                          return <span className="text-red-600 font-mono font-bold">+{num.toLocaleString('uz-UZ')} (Qarz)</span>;
                        } else if (num < 0) {
                          return <span className="text-emerald-600 font-mono font-bold">{num.toLocaleString('uz-UZ')} (Haq)</span>;
                        }
                        return <span className="text-slate-400 font-mono font-medium">0 UZS</span>;
                      }
                    }
                  ]}
                />
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 4: QARZDORLIK VEDOMOSTI */}
          {/* ============================================================= */}
          {activeTab === 'debtors' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Filter Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    placeholder="Mahalla"
                    allowClear
                    className="w-48"
                    value={debtorFilters.mahallaId}
                    onChange={(val) => {
                      handleMahallaChange(val);
                      setDebtorFilters(p => ({ ...p, mahallaId: val, streetId: undefined }));
                    }}
                    showSearch
                    optionFilterProp="children"
                  >
                    {mahallas.map(m => <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>)}
                  </Select>

                  <Select
                    placeholder="Ko'cha"
                    allowClear
                    className="w-44"
                    disabled={!debtorFilters.mahallaId}
                    value={debtorFilters.streetId}
                    onChange={(val) => setDebtorFilters(p => ({ ...p, streetId: val }))}
                    showSearch
                    optionFilterProp="children"
                  >
                    {streets.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                  </Select>

                  <InputNumber
                    placeholder="Min qarz miqdori"
                    className="w-40"
                    value={debtorFilters.minDebt}
                    onChange={(val) => setDebtorFilters(p => ({ ...p, minDebt: val }))}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />

                  <Select
                    placeholder="To'lanmagan oylar"
                    allowClear
                    className="w-44"
                    value={debtorFilters.monthsUnpaid}
                    onChange={(val) => setDebtorFilters(p => ({ ...p, monthsUnpaid: val ? Number(val) : null }))}
                  >
                    <Select.Option value={1}>1+ oy to'lanmagan</Select.Option>
                    <Select.Option value={2}>2+ oy to'lanmagan</Select.Option>
                    <Select.Option value={3}>3+ oy to'lanmagan</Select.Option>
                    <Select.Option value={6}>6+ oy to'lanmagan</Select.Option>
                    <Select.Option value={12}>12+ oy to'lanmagan</Select.Option>
                  </Select>

                  <Button
                    type="primary"
                    onClick={fetchDebtors}
                    loading={loadingDebtors}
                    className="bg-slate-900 hover:bg-slate-800"
                  >
                    Filtrlash
                  </Button>
                </div>

                <Button
                  type="primary"
                  icon={<FileSpreadsheet size={16} />}
                  onClick={handleExportDebtors}
                  loading={exportingDebtors}
                  className="bg-rose-600 hover:bg-rose-700 border-rose-600 font-semibold shadow-sm"
                >
                  Qarzdorlar Vedomostini Excelga Yuklash
                </Button>
              </div>

              {/* Alert Info Banner */}
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-sm text-red-800">
                <span className="flex items-center gap-2 font-medium">
                  <AlertTriangle size={18} className="text-red-600" />
                  Ro'yxatdagi qarzdorlar soni: <strong className="font-bold">{debtors.length} ta xonadon</strong>
                </span>
                <span className="font-bold">
                  Jami qarz: {debtors.reduce((sum, d) => sum + (Number(d.balance) > 0 ? Number(d.balance) : 0), 0).toLocaleString('uz-UZ')} UZS
                </span>
              </div>

              {/* Debtors Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <Table
                  dataSource={debtors}
                  rowKey="id"
                  loading={loadingDebtors}
                  pagination={{ pageSize: 20 }}
                  size="middle"
                  bordered
                  columns={[
                    { title: 'Abonent No', dataIndex: 'abonentNumber', key: 'abonentNumber', width: 140, className: 'font-mono font-bold' },
                    { title: 'F.I.Sh', dataIndex: 'fullName', key: 'fullName', className: 'font-semibold' },
                    {
                      title: 'Manzil',
                      key: 'address',
                      render: (_, r: any) => `${r.mahalla?.name || ''}, ${r.street?.name || ''}, ${r.house || ''}`
                    },
                    {
                      title: 'Qarz Miqdori (UZS)',
                      dataIndex: 'balance',
                      align: 'right',
                      width: 180,
                      render: (v: number) => (
                        <span className="font-mono font-black text-red-600 text-[15px]">
                          {Math.abs(v || 0).toLocaleString('uz-UZ')} UZS
                        </span>
                      )
                    },
                    {
                      title: 'Oxirgi to\'lov sanasi',
                      dataIndex: 'lastPaymentDate',
                      width: 160,
                      render: (v: string) => v ? dayjs(v).format('DD.MM.YYYY') : <span className="text-slate-400">To'lov yo'q</span>
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 5: RASMIY SHAKLLAR & SOLIQ */}
          {/* ============================================================= */}
          {activeTab === 'gov' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-2 gap-1">
                <button
                  onClick={() => setGovSubTab('forms')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${govSubTab === 'forms' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Davlat Standart Shakllari (Shakl-13, 14, 3)
                </button>
                <button
                  onClick={() => setGovSubTab('tax')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${govSubTab === 'tax' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Soliq Hisobotlari (Yalpi tushum, Debitorlar)
                </button>
              </div>

              {govSubTab === 'forms' ? <GovernmentReports /> : <TaxReports />}
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 6: TUMAN UMUMIY GRAFIGI & TAHLILI (AYNAN HISOBOTLAR ICHIDA) */}
          {/* ============================================================= */}
          {activeTab === 'district' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header with year filter */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800 m-0">Tuman Umumiy Grafigi & Tahlili</h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Mahallalar aro qarzlar, hisoblagichli/hisoblagichsiz xonadonlar va to'lov balansi
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={districtYear}
                    onChange={(y) => { setDistrictYear(y); fetchDistrict(y); }}
                    className="w-32"
                  >
                    {[2026, 2025, 2024, 2023].map(y => (
                      <Select.Option key={y} value={y}>{y}-yil</Select.Option>
                    ))}
                  </Select>
                  <Button icon={<RefreshCw size={14} />} onClick={() => fetchDistrict()} loading={districtLoading}>
                    Yangilash
                  </Button>
                </div>
              </div>

              {/* 4 Key KPI Metrics matching Mockup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Jami Abonentlar</span>
                  <span className="text-3xl font-black text-slate-900">
                    {(districtData.totalAbonents || 0).toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-500">ta</span>
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    Faol: {districtData.activeAbonents || 0} ta abonent
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Hisoblagichli & Hisoblagichsiz</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600">
                      {(districtData.meteredCount || 0).toLocaleString('uz-UZ')}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">({districtData.meteredPercent || 0}%)</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xl font-bold text-amber-600">
                      {(districtData.normativeCount || 0).toLocaleString('uz-UZ')}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">({districtData.normativePercent || 0}%)</span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-1">
                    Yashil: hisoblagichli | Sariq: normativ
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Qarzdorlar Soni</span>
                  <span className="text-3xl font-black text-rose-600">
                    {(districtData.debtorsCount || 0).toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-500">xonadon</span>
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    Jami abonentlarning {districtData.debtorsPercent || 0}% qismi
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Umumiy Qarzdorlik</span>
                  <span className="text-2xl font-black text-red-600">
                    {(districtData.totalDebt || 0).toLocaleString('uz-UZ')} <span className="text-xs font-semibold text-slate-500">UZS</span>
                  </span>
                  <span className="text-xs text-emerald-600 font-medium block mt-1">
                    Oldindan to'lov (Haq): {(districtData.totalPrepayment || 0).toLocaleString('uz-UZ')} UZS
                  </span>
                </div>
              </div>

              {/* Middle Section: Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 7 cols: Comparative Bar Chart for Mahallas */}
                <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800 m-0">Mahallalar Kesimida Qarzlar va Abonentlar Taqsimoti</h4>
                    <span className="text-xs text-slate-400">Eng ko'p qarzdor mahallalar</span>
                  </div>

                  <div className="h-[340px] w-full">
                    {districtData.mahallaAnalytics && districtData.mahallaAnalytics.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={districtData.mahallaAnalytics.slice(0, 10)}
                          margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#64748B' }}
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                          />
                          <YAxis
                            yAxisId="left"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#059669' }}
                            tickFormatter={(v) => `${v}`}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#DC2626' }}
                            tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                          />
                          <Tooltip
                            formatter={(val: any, name: any) => {
                              if (name === 'Abonentlar soni') return [`${val} ta`, name];
                              return [`${Number(val).toLocaleString('uz-UZ')} UZS`, name];
                            }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                          <Bar yAxisId="left" dataKey="totalAbonents" name="Abonentlar soni" fill="#10B981" radius={[4, 4, 0, 0]} />
                          <Bar yAxisId="right" dataKey="totalDebt" name="Qarzdorlik summasi (UZS)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                        Ma'lumotlar topilmadi
                      </div>
                    )}
                  </div>
                </div>

                {/* Right 4 cols: Two Donut Charts */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  {/* Donut 1: Metered vs Normative */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h5 className="text-xs font-bold text-slate-700 mb-2">Hisoblagichli vs Hisoblagichsiz Uylar</h5>
                    <div className="h-[140px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Hisoblagichli', value: districtData.meteredCount || 0 },
                              { name: 'Normativ (hisoblagichsiz)', value: districtData.normativeCount || 0 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            <Cell fill="#10B981" />
                            <Cell fill="#F59E0B" />
                          </Pie>
                          <Tooltip formatter={(v: any) => `${Number(v).toLocaleString('uz-UZ')} ta`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-xs font-semibold mt-1">
                      <span className="text-emerald-600 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                        Hisoblagichli: {districtData.meteredPercent || 0}%
                      </span>
                      <span className="text-amber-600 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                        Normativ: {districtData.normativePercent || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Donut 2: Paying vs Debtors */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h5 className="text-xs font-bold text-slate-700 mb-2">Abonentlar Balansi (To'lov intizomi)</h5>
                    <div className="h-[140px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'To\'lovchi / Haqdor', value: districtData.payingCount || 0 },
                              { name: 'Qarzdor', value: districtData.debtorsCount || 0 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            <Cell fill="#0EA5E9" />
                            <Cell fill="#EF4444" />
                          </Pie>
                          <Tooltip formatter={(v: any) => `${Number(v).toLocaleString('uz-UZ')} ta`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-xs font-semibold mt-1">
                      <span className="text-sky-600 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                        To'lovchi: {districtData.payingPercent || 0}%
                      </span>
                      <span className="text-red-600 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                        Qarzdor: {districtData.debtorsPercent || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Detailed Mahalla Breakdown Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 m-0">Mahallalar Bo'yicha Batafsil Tahlil Jadvali</h4>
                  <span className="text-xs text-slate-500">Jami {districtData.mahallaAnalytics?.length || 0} ta mahalla</span>
                </div>

                <Table
                  dataSource={districtData.mahallaAnalytics || []}
                  rowKey="id"
                  loading={districtLoading}
                  pagination={false}
                  size="small"
                  bordered
                  columns={[
                    { title: 'T/R', width: 50, align: 'center', render: (_, __, i) => i + 1 },
                    { title: 'Mahalla nomi', dataIndex: 'name', key: 'name', className: 'font-bold text-slate-800' },
                    { title: 'Jami abonent', dataIndex: 'totalAbonents', align: 'center', render: (v: number) => <span className="font-semibold">{v}</span> },
                    { title: 'Hisoblagichli', dataIndex: 'meteredCount', align: 'center', render: (v: number) => <Tag color="green">{v}</Tag> },
                    { title: 'Hisoblagichsiz', dataIndex: 'normativeCount', align: 'center', render: (v: number) => <Tag color="orange">{v}</Tag> },
                    { title: 'Qarzdorlar soni', dataIndex: 'debtorsCount', align: 'center', render: (v: number) => <Tag color="red">{v} ta</Tag> },
                    {
                      title: 'Qarzdorlik summasi (UZS)',
                      dataIndex: 'totalDebt',
                      align: 'right',
                      render: (v: number) => <span className="font-mono font-bold text-red-600">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'Yillik Tushum (UZS)',
                      dataIndex: 'totalCollection',
                      align: 'right',
                      render: (v: number) => <span className="font-mono font-bold text-emerald-600">{v ? v.toLocaleString('uz-UZ') : '0'}</span>
                    },
                    {
                      title: 'Undiruv %',
                      dataIndex: 'undiruvFoizi',
                      align: 'center',
                      width: 100,
                      render: (v: number) => (
                        <Tag color={v >= 80 ? 'green' : v >= 50 ? 'blue' : 'orange'} className="font-bold">
                          {v}%
                        </Tag>
                      )
                    },
                  ]}
                  summary={() => {
                    const list = districtData.mahallaAnalytics || [];
                    const totalAbs = list.reduce((s: number, m: any) => s + m.totalAbonents, 0);
                    const totalMet = list.reduce((s: number, m: any) => s + m.meteredCount, 0);
                    const totalNorm = list.reduce((s: number, m: any) => s + m.normativeCount, 0);
                    const totalDebtors = list.reduce((s: number, m: any) => s + m.debtorsCount, 0);
                    const totalDebtSum = list.reduce((s: number, m: any) => s + m.totalDebt, 0);
                    const totalCollSum = list.reduce((s: number, m: any) => s + m.totalCollection, 0);

                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                          <Table.Summary.Cell index={0} colSpan={2} className="font-black text-slate-900">
                            TUMAN BO'YICHA JAMI
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="center" className="font-black">
                            {totalAbs.toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="center" className="font-bold text-emerald-700">
                            {totalMet.toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="center" className="font-bold text-amber-700">
                            {totalNorm.toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="center" className="font-bold text-red-700">
                            {totalDebtors.toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right" className="font-mono font-black text-red-700 bg-red-50/50">
                            {totalDebtSum.toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={7} align="right" className="font-mono font-black text-emerald-700 bg-emerald-50/50">
                            {totalCollSum.toLocaleString('uz-UZ')}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={8} align="center" className="font-black">
                            -
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
