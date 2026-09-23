import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Table, Button, Row, Col, message, Select, DatePicker,
  Tag, Input, Spin, Alert, Switch
} from 'antd';
import {
  FileSpreadsheet, Filter, RefreshCw, Calendar, Users, Building2,
  CheckCircle, ChevronRight, Search, Wallet, ShieldCheck
} from 'lucide-react';
import {
  getGovForm3, getGovForm13, getGovForm14,
  exportGovForm3, exportGovForm13, exportGovForm14
} from '../../services/reportService';
import api from '../../services/api';
import dayjs from 'dayjs';

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

const GovernmentReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form13' | 'form14' | 'form3'>('form13');

  // Collectors cache for Shakl-14 dropdown
  const [collectors, setCollectors] = useState<any[]>([]);

  useEffect(() => {
    api.get('/collectors')
      .then(res => setCollectors(res.data || []))
      .catch(console.error);
  }, []);

  // =============================================================
  // SHAKL-13: TUSHUMLAR MANBALARI
  // =============================================================
  const [form13Range, setForm13Range] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'), dayjs()
  ]);
  const [form13SubMode, setForm13SubMode] = useState<'main' | 'date' | 'dtkt'>('main');
  const [form13Loading, setForm13Loading] = useState(false);
  const [form13Exporting, setForm13Exporting] = useState(false);
  const [form13Data, setForm13Data] = useState<any[]>([]);

  const fetchForm13 = useCallback(async () => {
    setForm13Loading(true);
    try {
      const payload: any = {
        startDate: form13Range[0].format('YYYY-MM-DD'),
        endDate: form13Range[1].format('YYYY-MM-DD'),
        tabType: form13SubMode === 'dtkt' ? 'dtkt' : 'main',
        groupDate: form13SubMode === 'date'
      };
      const res = await getGovForm13(payload);
      setForm13Data(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.error(e);
      message.error("Shakl-13 ma'lumotlarini yuklashda xatolik");
    } finally {
      setForm13Loading(false);
    }
  }, [form13Range, form13SubMode]);

  const exportForm13 = async () => {
    setForm13Exporting(true);
    try {
      const payload: any = {
        startDate: form13Range[0].format('YYYY-MM-DD'),
        endDate: form13Range[1].format('YYYY-MM-DD'),
        tabType: form13SubMode === 'dtkt' ? 'dtkt' : 'main',
        groupDate: form13SubMode === 'date'
      };
      const blob = await exportGovForm13(payload);
      downloadBlob(blob, `Shakl_13_Tushumlar_manbalari_${form13Range[0].format('YYYY-MM-DD')}_${form13Range[1].format('YYYY-MM-DD')}.xlsx`);
      message.success("Shakl-13 Excel formatida muvaffaqiyatli yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik yuz berdi");
    } finally {
      setForm13Exporting(false);
    }
  };

  // =============================================================
  // SHAKL-14: INSPEKTORLAR KESIMIDA
  // =============================================================
  const [form14Month, setForm14Month] = useState<dayjs.Dayjs>(dayjs());
  const [form14InspectorId, setForm14InspectorId] = useState<string | undefined>(undefined);
  const [form14WithAbonents, setForm14WithAbonents] = useState(false);
  const [form14Loading, setForm14Loading] = useState(false);
  const [form14Exporting, setForm14Exporting] = useState(false);
  const [form14Data, setForm14Data] = useState<any[]>([]);

  const fetchForm14 = useCallback(async () => {
    setForm14Loading(true);
    try {
      const payload: any = {
        date: form14Month.format('YYYY-MM-01'),
        inspectorId: form14InspectorId || undefined,
        withAbonentsList: form14WithAbonents
      };
      const res = await getGovForm14(payload);
      setForm14Data(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.error(e);
      message.error("Shakl-14 ma'lumotlarini yuklashda xatolik");
    } finally {
      setForm14Loading(false);
    }
  }, [form14Month, form14InspectorId, form14WithAbonents]);

  const exportForm14 = async () => {
    setForm14Exporting(true);
    try {
      const payload: any = {
        date: form14Month.format('YYYY-MM-01'),
        inspectorId: form14InspectorId || undefined,
        withAbonentsList: form14WithAbonents
      };
      const blob = await exportGovForm14(payload);
      downloadBlob(blob, `Shakl_14_Inspektorlar_${form14Month.format('YYYY-MM')}.xlsx`);
      message.success("Shakl-14 Excel formatida muvaffaqiyatli yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik");
    } finally {
      setForm14Exporting(false);
    }
  };

  // =============================================================
  // SHAKL-3: TUMANLAR VA MAHALLALAR KESIMIDA
  // =============================================================
  const [form3Range, setForm3Range] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'), dayjs()
  ]);
  const [form3Search, setForm3Search] = useState('');
  const [form3Loading, setForm3Loading] = useState(false);
  const [form3Exporting, setForm3Exporting] = useState(false);
  const [form3Data, setForm3Data] = useState<any[]>([]);

  const fetchForm3 = useCallback(async () => {
    setForm3Loading(true);
    try {
      const payload: any = {
        startDate: form3Range[0].format('YYYY-MM-DD'),
        endDate: form3Range[1].format('YYYY-MM-DD'),
      };
      const res = await getGovForm3(payload);
      setForm3Data(Array.isArray(res) ? res : []);
    } catch (e: any) {
      console.error(e);
      message.error("Shakl-3 ma'lumotlarini yuklashda xatolik");
    } finally {
      setForm3Loading(false);
    }
  }, [form3Range]);

  const exportForm3 = async () => {
    setForm3Exporting(true);
    try {
      const payload: any = {
        startDate: form3Range[0].format('YYYY-MM-DD'),
        endDate: form3Range[1].format('YYYY-MM-DD'),
      };
      const blob = await exportGovForm3(payload);
      downloadBlob(blob, `Shakl_3_Tumanlar_kesimida_${form3Range[0].format('YYYY-MM-DD')}_${form3Range[1].format('YYYY-MM-DD')}.xlsx`);
      message.success("Shakl-3 Excel formatida muvaffaqiyatli yuklandi");
    } catch (e) {
      console.error(e);
      message.error("Excel yuklashda xatolik");
    } finally {
      setForm3Exporting(false);
    }
  };

  // Auto-fetch on tab change
  useEffect(() => {
    if (activeTab === 'form13') fetchForm13();
    else if (activeTab === 'form14') fetchForm14();
    else if (activeTab === 'form3') fetchForm3();
  }, [activeTab, fetchForm13, fetchForm14, fetchForm3]);

  // Form 3 filtered list
  const filteredForm3 = useMemo(() => {
    if (!form3Search.trim()) return form3Data;
    const q = form3Search.toLowerCase();
    return form3Data.filter(d => String(d.region || '').toLowerCase().includes(q));
  }, [form3Data, form3Search]);

  // Form 13 summary totals
  const form13TotalAmount = useMemo(() => {
    if (form13SubMode === 'date') {
      return form13Data.reduce((s, d) => s + (Number(d.total) || 0), 0);
    }
    if (form13SubMode === 'dtkt') {
      return form13Data.reduce((s, d) => s + (Number(d.debit) || 0), 0);
    }
    return form13Data.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  }, [form13Data, form13SubMode]);

  // Form 14 summary totals
  const form14TotalCollected = useMemo(() => {
    return form14Data.reduce((s, d) => s + (Number(d.collected) || 0), 0);
  }, [form14Data]);

  // Form 3 summary totals
  const form3Summary = useMemo(() => {
    const totalAbonents = filteredForm3.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const totalWithMeter = filteredForm3.reduce((s, d) => s + (Number(d.withMeter) || 0), 0);
    const totalWithoutMeter = filteredForm3.reduce((s, d) => s + (Number(d.withoutMeter) || 0), 0);
    const totalDebt = filteredForm3.reduce((s, d) => s + (Number(d.debt) || 0), 0);
    const meterPercent = totalAbonents > 0 ? Math.round((totalWithMeter / totalAbonents) * 100) : 0;
    return { totalAbonents, totalWithMeter, totalWithoutMeter, totalDebt, meterPercent };
  }, [filteredForm3]);

  return (
    <div className="space-y-6">
      {/* 3 OFFICIAL FORMS SUB-NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('form13')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'form13'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet size={16} className={activeTab === 'form13' ? 'text-blue-600' : 'text-slate-400'} />
            Shakl-13 (Tushumlar Manbalari)
          </button>
          <button
            onClick={() => setActiveTab('form14')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'form14'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={16} className={activeTab === 'form14' ? 'text-blue-600' : 'text-slate-400'} />
            Shakl-14 (Inspektorlar Kesimida)
          </button>
          <button
            onClick={() => setActiveTab('form3')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'form3'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={16} className={activeTab === 'form3' ? 'text-blue-600' : 'text-slate-400'} />
            Shakl-3 (Tumanlar & Mahallalar)
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium hidden md:inline">
          O'zbekiston Respublikasi Kommunal Xo'jaligi Standart Hisobot Shakllari
        </span>
      </div>

      {/* ============================================================= */}
      {/* SHAKL-13: TUSHUMLAR MANBALARI BO'YICHA TAHLIL */}
      {/* ============================================================= */}
      {activeTab === 'form13' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Davr:</span>
              <RangePicker
                value={form13Range}
                onChange={(r) => { if (r && r[0] && r[1]) setForm13Range([r[0], r[1]]); }}
                format="DD.MM.YYYY"
                allowClear={false}
                className="w-64 rounded-lg"
              />

              {/* Sub-mode pills */}
              <div className="flex bg-slate-200/80 p-0.5 rounded-lg gap-1 ml-2">
                <button
                  onClick={() => setForm13SubMode('main')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    form13SubMode === 'main' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Manbalar Kesimida
                </button>
                <button
                  onClick={() => setForm13SubMode('date')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    form13SubMode === 'date' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Kunma-kun Yoyilma
                </button>
                <button
                  onClick={() => setForm13SubMode('dtkt')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    form13SubMode === 'dtkt' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Buxgalteriya (Dt-Kt)
                </button>
              </div>

              <Button
                icon={<RefreshCw size={14} />}
                onClick={fetchForm13}
                loading={form13Loading}
                className="ml-1"
              >
                Yangilash
              </Button>
            </div>

            <Button
              type="primary"
              icon={<FileSpreadsheet size={16} />}
              onClick={exportForm13}
              loading={form13Exporting}
              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 font-semibold shadow-sm"
            >
              Excelga Yuklash (Shakl-13)
            </Button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Jami Tushum (Davr bo'yicha)</span>
              <span className="text-2xl font-black text-emerald-600">
                {form13TotalAmount.toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-400">UZS</span>
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                {form13Range[0].format('DD.MM.YYYY')} — {form13Range[1].format('DD.MM.YYYY')}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tushum Manbalari Soni</span>
              <span className="text-2xl font-black text-blue-700">
                {form13Data.length} ta
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                {form13SubMode === 'main' ? 'Asosiy to\'lov kanallari' : form13SubMode === 'date' ? 'To\'lov o\'tgan kunlar' : 'Buxgalteriya hisob raqamlari'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">O'rtacha Kunlik Tushum</span>
              <span className="text-2xl font-black text-slate-800">
                {form13Range[1].diff(form13Range[0], 'day') > 0
                  ? Math.round(form13TotalAmount / (form13Range[1].diff(form13Range[0], 'day') + 1)).toLocaleString('uz-UZ')
                  : form13TotalAmount.toLocaleString('uz-UZ')}{' '}
                <span className="text-sm font-semibold text-slate-400">UZS</span>
              </span>
              <span className="text-xs text-slate-400 block mt-1">Davrdagi har bir kalendar kuniga</span>
            </div>
          </div>

          {/* Detailed Excel-Style Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {form13SubMode === 'main' && (
              <Table
                dataSource={form13Data}
                rowKey="id"
                loading={form13Loading}
                pagination={false}
                size="middle"
                bordered
                columns={[
                  { title: 'T/R', dataIndex: 'id', width: 70, align: 'center', className: 'font-mono text-slate-500' },
                  {
                    title: 'Tushum Turi / To\'lov Usuli',
                    dataIndex: 'type',
                    className: 'font-bold text-slate-800 text-[15px]',
                    render: (t: string) => (
                      <span className="flex items-center gap-2">
                        <Wallet size={16} className="text-blue-500" />
                        {t}
                      </span>
                    )
                  },
                  {
                    title: 'Summa (UZS)',
                    dataIndex: 'amount',
                    align: 'right',
                    width: 250,
                    render: (v: number) => (
                      <span className="font-mono font-bold text-emerald-600 text-[16px]">
                        {(Number(v) || 0).toLocaleString('uz-UZ')} UZS
                      </span>
                    )
                  },
                  {
                    title: 'Ulushi (%)',
                    key: 'share',
                    align: 'center',
                    width: 150,
                    render: (_, r: any) => {
                      const share = form13TotalAmount > 0 ? Math.round(((Number(r.amount) || 0) / form13TotalAmount) * 100) : 0;
                      return <Tag color="blue" className="font-bold text-xs">{share}%</Tag>;
                    }
                  }
                ]}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                      <Table.Summary.Cell index={0} colSpan={2} className="font-black text-slate-900 text-right">
                        JAMI / YAKUNIY TUSHUM:
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right" className="font-mono font-black text-emerald-700 text-[17px]">
                        {form13TotalAmount.toLocaleString('uz-UZ')} UZS
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="center">
                        <Tag color="green" className="font-black">100%</Tag>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            )}

            {form13SubMode === 'date' && (
              <Table
                dataSource={form13Data}
                rowKey="id"
                loading={form13Loading}
                pagination={false}
                size="middle"
                bordered
                columns={[
                  { title: 'T/R', dataIndex: 'id', width: 70, align: 'center', className: 'font-mono text-slate-500' },
                  {
                    title: 'Sana',
                    dataIndex: 'date',
                    className: 'font-bold font-mono text-slate-800',
                    render: (d: string) => dayjs(d).format('DD.MM.YYYY')
                  },
                  {
                    title: 'Kassa (Naqd pul)',
                    dataIndex: 'cash',
                    align: 'right',
                    render: (v: number) => <span className="font-mono font-semibold text-slate-700">{(Number(v) || 0).toLocaleString('uz-UZ')}</span>
                  },
                  {
                    title: 'Bank / Plastik karta',
                    dataIndex: 'bank',
                    align: 'right',
                    render: (v: number) => <span className="font-mono font-semibold text-slate-700">{(Number(v) || 0).toLocaleString('uz-UZ')}</span>
                  },
                  {
                    title: 'Paynet to\'lovlari',
                    dataIndex: 'paynet',
                    align: 'right',
                    render: (v: number) => <span className="font-mono font-semibold text-slate-700">{(Number(v) || 0).toLocaleString('uz-UZ')}</span>
                  },
                  {
                    title: 'Jami Kunlik (UZS)',
                    dataIndex: 'total',
                    align: 'right',
                    render: (v: number) => <span className="font-mono font-black text-blue-700">{(Number(v) || 0).toLocaleString('uz-UZ')}</span>
                  }
                ]}
                summary={() => {
                  const sumCash = form13Data.reduce((s, d) => s + (Number(d.cash) || 0), 0);
                  const sumBank = form13Data.reduce((s, d) => s + (Number(d.bank) || 0), 0);
                  const sumPaynet = form13Data.reduce((s, d) => s + (Number(d.paynet) || 0), 0);
                  const sumTotal = form13Data.reduce((s, d) => s + (Number(d.total) || 0), 0);
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                        <Table.Summary.Cell index={0} colSpan={2} className="font-black text-slate-900 text-right">
                          JAMI:
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right" className="font-mono font-bold text-slate-800">
                          {sumCash.toLocaleString('uz-UZ')}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right" className="font-mono font-bold text-slate-800">
                          {sumBank.toLocaleString('uz-UZ')}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right" className="font-mono font-bold text-slate-800">
                          {sumPaynet.toLocaleString('uz-UZ')}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5} align="right" className="font-mono font-black text-emerald-700 text-[16px]">
                          {sumTotal.toLocaleString('uz-UZ')} UZS
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            )}

            {form13SubMode === 'dtkt' && (
              <Table
                dataSource={form13Data}
                rowKey="id"
                loading={form13Loading}
                pagination={false}
                size="middle"
                bordered
                columns={[
                  { title: 'T/R', dataIndex: 'id', width: 70, align: 'center', className: 'font-mono text-slate-500' },
                  { title: 'Schyot Raqami', dataIndex: 'account', width: 150, className: 'font-mono font-black text-indigo-700' },
                  { title: 'Buxgalteriya Schyoti Nomi', dataIndex: 'name', className: 'font-semibold text-slate-800' },
                  {
                    title: 'Debet (UZS)',
                    dataIndex: 'debit',
                    align: 'right',
                    width: 200,
                    render: (v: number) => <span className="font-mono font-bold text-slate-900">{v ? Number(v).toLocaleString('uz-UZ') : '-'}</span>
                  },
                  {
                    title: 'Kredit (UZS)',
                    dataIndex: 'credit',
                    align: 'right',
                    width: 200,
                    render: (v: number) => <span className="font-mono font-bold text-slate-900">{v ? Number(v).toLocaleString('uz-UZ') : '-'}</span>
                  }
                ]}
                summary={() => {
                  const sumDebet = form13Data.reduce((s, d) => s + (Number(d.debit) || 0), 0);
                  const sumKredit = form13Data.reduce((s, d) => s + (Number(d.credit) || 0), 0);
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                        <Table.Summary.Cell index={0} colSpan={3} className="font-black text-slate-900 text-right">
                          BALANS YAKUNI:
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right" className="font-mono font-black text-slate-900">
                          {sumDebet.toLocaleString('uz-UZ')} UZS
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right" className="font-mono font-black text-slate-900">
                          {sumKredit.toLocaleString('uz-UZ')} UZS
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SHAKL-14: INSPEKTORLAR KESIMIDA YIG'MA HISOBOT */}
      {/* ============================================================= */}
      {activeTab === 'form14' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Hisobot Oyi:</span>
              <DatePicker
                picker="month"
                value={form14Month}
                onChange={(m) => { if (m) setForm14Month(m); }}
                allowClear={false}
                className="w-40 rounded-lg"
              />

              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-2">Inspektor:</span>
              <Select
                placeholder="Barcha inspektorlar"
                allowClear
                className="w-56"
                value={form14InspectorId}
                onChange={(val) => setForm14InspectorId(val)}
                showSearch
                optionFilterProp="children"
              >
                {collectors.map(c => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.fullName} ({c.phone || 'Tel yo\'q'})
                  </Select.Option>
                ))}
              </Select>

              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 ml-2">
                <Switch
                  checked={form14WithAbonents}
                  onChange={setForm14WithAbonents}
                  size="small"
                />
                <span className="text-xs font-semibold text-slate-700">Cheklar tafsiloti bilan</span>
              </div>

              <Button
                icon={<RefreshCw size={14} />}
                onClick={fetchForm14}
                loading={form14Loading}
                className="ml-1"
              >
                Yangilash
              </Button>
            </div>

            <Button
              type="primary"
              icon={<FileSpreadsheet size={16} />}
              onClick={exportForm14}
              loading={form14Exporting}
              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 font-semibold shadow-sm"
            >
              Excelga Yuklash (Shakl-14)
            </Button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Jami Yig'ilgan Summa</span>
              <span className="text-2xl font-black text-emerald-600">
                {form14TotalCollected.toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-400">UZS</span>
              </span>
              <span className="text-xs text-slate-400 block mt-1">{form14Month.format('MMMM YYYY')} oyi bo'yicha</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Faol Inspektorlar</span>
              <span className="text-2xl font-black text-blue-700">
                {form14Data.length} nafar
              </span>
              <span className="text-xs text-slate-400 block mt-1">Ushbu oyda to'lov qabul qilganlar</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">O'rtacha Bitta Inspektorga</span>
              <span className="text-2xl font-black text-slate-800">
                {form14Data.length > 0 ? Math.round(form14TotalCollected / form14Data.length).toLocaleString('uz-UZ') : 0}{' '}
                <span className="text-sm font-semibold text-slate-400">UZS</span>
              </span>
              <span className="text-xs text-slate-400 block mt-1">Inspektor boshiga o'rtacha tushum</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <Table
              dataSource={form14Data}
              rowKey="id"
              loading={form14Loading}
              pagination={false}
              size="middle"
              bordered
              expandable={form14WithAbonents ? {
                expandedRowRender: (record: any) => {
                  if (!record.abonents || record.abonents.length === 0) {
                    return <div className="p-4 text-center text-slate-400 text-xs">Ushbu inspektor bo'yicha cheklar topilmadi</div>;
                  }
                  return (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 m-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        {record.inspectorName} tomonidan qabul qilingan kvitansiyalar ({record.abonents.length} ta):
                      </h4>
                      <Table
                        dataSource={record.abonents}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        size="small"
                        bordered
                        columns={[
                          { title: '№', dataIndex: 'number', width: 50, align: 'center' },
                          { title: 'Abonent (L/S)', dataIndex: 'ls', width: 140, className: 'font-mono font-bold text-blue-700' },
                          { title: 'Abonent F.I.Sh', dataIndex: 'name', className: 'font-semibold text-slate-800' },
                          {
                            title: 'To\'lov Sanasi',
                            dataIndex: 'date',
                            width: 140,
                            render: (d: string) => dayjs(d).format('DD.MM.YYYY HH:mm')
                          },
                          {
                            title: 'Summa (UZS)',
                            dataIndex: 'amount',
                            align: 'right',
                            width: 160,
                            render: (v: number) => <span className="font-mono font-bold text-emerald-600">{(Number(v) || 0).toLocaleString('uz-UZ')} UZS</span>
                          }
                        ]}
                      />
                    </div>
                  );
                }
              } : undefined}
              columns={[
                { title: 'T/R', dataIndex: 'id', width: 70, align: 'center', render: (_, __, idx) => idx + 1 },
                {
                  title: 'Inspektor F.I.Sh',
                  dataIndex: 'inspectorName',
                  className: 'font-bold text-slate-800 text-[15px]',
                  render: (name: string) => (
                    <span className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-indigo-600" />
                      {name}
                    </span>
                  )
                },
                {
                  title: 'Yig\'ilgan Summa (UZS)',
                  dataIndex: 'collected',
                  align: 'right',
                  width: 250,
                  render: (v: number) => (
                    <span className="font-mono font-bold text-emerald-600 text-[16px]">
                      {(Number(v) || 0).toLocaleString('uz-UZ')} UZS
                    </span>
                  )
                },
                {
                  title: 'Oylik Reja (UZS)',
                  dataIndex: 'target',
                  align: 'right',
                  width: 200,
                  render: (v: number) => (
                    <span className="font-mono text-slate-500">
                      {v ? Number(v).toLocaleString('uz-UZ') : '-'}
                    </span>
                  )
                },
                {
                  title: 'Bajarilish',
                  key: 'progress',
                  align: 'center',
                  width: 130,
                  render: (_, r: any) => {
                    if (!r.target || r.target === 0) return <Tag color="default">Rejasiz</Tag>;
                    const pct = Math.round((Number(r.collected) / Number(r.target)) * 100);
                    return <Tag color={pct >= 100 ? 'green' : pct >= 70 ? 'blue' : 'orange'} className="font-bold">{pct}%</Tag>;
                  }
                }
              ]}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <Table.Summary.Cell index={0} colSpan={2} className="font-black text-slate-900 text-right">
                      JAMI / TUMAN YIG'INDISI:
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right" className="font-mono font-black text-emerald-700 text-[17px]">
                      {form14TotalCollected.toLocaleString('uz-UZ')} UZS
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} colSpan={2} align="center">
                      <Tag color="blue" className="font-bold">{form14Data.length} ta inspektor</Tag>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SHAKL-3: TUMANLAR VA MAHALLALAR KESIMIDA YIG'MA */}
      {/* ============================================================= */}
      {activeTab === 'form3' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Davr:</span>
              <RangePicker
                value={form3Range}
                onChange={(r) => { if (r && r[0] && r[1]) setForm3Range([r[0], r[1]]); }}
                format="DD.MM.YYYY"
                allowClear={false}
                className="w-64 rounded-lg"
              />

              <Input
                placeholder="Mahalla nomi bo'yicha qidirish..."
                prefix={<Search size={14} className="text-slate-400" />}
                value={form3Search}
                onChange={e => setForm3Search(e.target.value)}
                allowClear
                className="w-64 rounded-lg ml-2"
              />

              <Button
                icon={<RefreshCw size={14} />}
                onClick={fetchForm3}
                loading={form3Loading}
                className="ml-1"
              >
                Yangilash
              </Button>
            </div>

            <Button
              type="primary"
              icon={<FileSpreadsheet size={16} />}
              onClick={exportForm3}
              loading={form3Exporting}
              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 font-semibold shadow-sm"
            >
              Excelga Yuklash (Shakl-3)
            </Button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Jami Mahallalar</span>
              <span className="text-2xl font-black text-slate-800">
                {filteredForm3.length} ta
              </span>
              <span className="text-xs text-slate-400 block mt-1">Abonentlar mavjud bo'lgan hududlar</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Jami Abonentlar</span>
              <span className="text-2xl font-black text-blue-700">
                {form3Summary.totalAbonents.toLocaleString('uz-UZ')} ta
              </span>
              <span className="text-xs text-slate-400 block mt-1">Xonadonlar soni</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Hisoblagich Qamrovi</span>
              <span className="text-2xl font-black text-emerald-600">
                {form3Summary.meterPercent}%
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                {form3Summary.totalWithMeter.toLocaleString()} bor / {form3Summary.totalWithoutMeter.toLocaleString()} normativ
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Jami Debitorlik Qarzi</span>
              <span className="text-2xl font-black text-red-600">
                {form3Summary.totalDebt.toLocaleString('uz-UZ')} <span className="text-sm font-semibold text-slate-400">UZS</span>
              </span>
              <span className="text-xs text-slate-400 block mt-1">Abonentlarning muddati o'tgan qarzi</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <Table
              dataSource={filteredForm3}
              rowKey="id"
              loading={form3Loading}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              size="middle"
              bordered
              columns={[
                { title: 'T/R', dataIndex: 'id', width: 60, align: 'center', className: 'font-mono text-slate-500' },
                {
                  title: 'Hudud / Mahalla Nomi',
                  dataIndex: 'region',
                  className: 'font-bold text-slate-800 text-[15px]',
                  render: (m: string) => (
                    <span className="flex items-center gap-1.5">
                      <Building2 size={15} className="text-slate-400" />
                      {m}
                    </span>
                  )
                },
                {
                  title: 'Jami Abonentlar',
                  dataIndex: 'total',
                  align: 'right',
                  width: 150,
                  render: (v: number) => <span className="font-bold text-slate-900">{Number(v || 0).toLocaleString('uz-UZ')}</span>
                },
                {
                  title: 'Hisoblagichli (Bor)',
                  dataIndex: 'withMeter',
                  align: 'right',
                  width: 150,
                  render: (v: number) => <span className="font-mono font-bold text-emerald-600">{Number(v || 0).toLocaleString('uz-UZ')}</span>
                },
                {
                  title: 'Hisoblagichsiz (Normativ)',
                  dataIndex: 'withoutMeter',
                  align: 'right',
                  width: 160,
                  render: (v: number) => <span className="font-mono font-bold text-amber-600">{Number(v || 0).toLocaleString('uz-UZ')}</span>
                },
                {
                  title: 'Hisoblagich Ulushi',
                  key: 'ratio',
                  align: 'center',
                  width: 140,
                  render: (_, r: any) => {
                    const pct = r.total > 0 ? Math.round((Number(r.withMeter || 0) / Number(r.total)) * 100) : 0;
                    return <Tag color={pct >= 50 ? 'green' : pct >= 20 ? 'blue' : 'orange'} className="font-bold">{pct}%</Tag>;
                  }
                },
                {
                  title: 'Debitorlik Qarzi (UZS)',
                  dataIndex: 'debt',
                  align: 'right',
                  width: 200,
                  render: (v: number) => (
                    <span className="font-mono font-black text-red-600">
                      {Number(v || 0).toLocaleString('uz-UZ')} UZS
                    </span>
                  )
                }
              ]}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <Table.Summary.Cell index={0} colSpan={2} className="font-black text-slate-900 text-right">
                      JAMI / TUMAN BO'YICHA YAKUNIY:
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right" className="font-mono font-black text-slate-900">
                      {form3Summary.totalAbonents.toLocaleString('uz-UZ')}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right" className="font-mono font-black text-emerald-700">
                      {form3Summary.totalWithMeter.toLocaleString('uz-UZ')}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right" className="font-mono font-black text-amber-700">
                      {form3Summary.totalWithoutMeter.toLocaleString('uz-UZ')}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="center">
                      <Tag color="blue" className="font-black">{form3Summary.meterPercent}%</Tag>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right" className="font-mono font-black text-red-700 text-[16px]">
                      {form3Summary.totalDebt.toLocaleString('uz-UZ')} UZS
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernmentReports;
