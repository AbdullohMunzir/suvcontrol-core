import React, { useEffect, useState, useMemo } from 'react';
import { Table, Button, Form, Input, Select, InputNumber, message, Tag, Spin, Modal, DatePicker, Popconfirm, Tooltip, Alert, Checkbox } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  Printer, Check, Wallet, Receipt, Search, RotateCcw, 
  Download, Plus, CheckSquare, XCircle, AlertCircle, ArrowUpRight, 
  CreditCard, Smartphone, Banknote, UserCheck, RefreshCw, Calendar
} from 'lucide-react';
import { getPayments, createPayment, updatePaymentStatus, cancelPayment, bulkUpdatePaymentStatus } from '../../services/paymentService';
import { getAbonents } from '../../services/abonentService';
import api from '../../services/api';
import ReceiptPrint from '../../components/ReceiptPrint';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { utils, writeFile } from 'xlsx';
import { useLanguage } from '../../contexts/LanguageContext';

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;

interface PaymentItem {
  id: string;
  amount: number | string;
  date: string;
  receiptNumber: string;
  comment?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  paymentMethod: 'CASH' | 'CLICK' | 'PAYME' | 'BANK' | string;
  collector?: {
    id: string;
    fullName: string;
    phone?: string;
  };
  abonent?: {
    id?: string;
    fullName: string;
    abonentNumber: string;
    contractNumber?: string;
    balance?: number | string;
    mahalla?: { name: string };
    street?: { name: string };
    house?: string;
    apartment?: string;
  };
}

const Payments: React.FC = () => {
  const { t } = useLanguage();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [abonents, setAbonents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Selection and Bulk Actions
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'ALL'>('PENDING');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollector, setSelectedCollector] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [dateFilterType, setDateFilterType] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<dayjs.Dayjs | null>(null);
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // POS Payment Modal State
  const [isPosModalVisible, setIsPosModalVisible] = useState(false);
  const [posSelectedAbonent, setPosSelectedAbonent] = useState<any>(null);
  const [posForm] = Form.useForm();
  const [receivedCashAmount, setReceivedCashAmount] = useState<number | null>(null);
  const [posPaymentAmount, setPosPaymentAmount] = useState<number>(0);

  // Storno Modal State
  const [stornoModalVisible, setStornoModalVisible] = useState(false);
  const [stornoPaymentId, setStornoPaymentId] = useState<string | null>(null);
  const [stornoReason, setStornoReason] = useState('');
  const [stornoLoading, setStornoLoading] = useState(false);
  const [isBulkStorno, setIsBulkStorno] = useState(false);

  // Receipt Print State
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await getPayments();
      setPayments(data);
    } catch (error) {
      message.error("To'lovlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectors = async () => {
    try {
      const res = await api.get('/collectors');
      setCollectors(res.data || []);
    } catch (e) {
      console.error('Failed to load collectors', e);
    }
  };

  const fetchAbonents = async (search = '') => {
    try {
      const res = await getAbonents({ page: 1, limit: 30, search, status: 'ACTIVE,SUSPENDED,DISCONNECTED' });
      setAbonents(res.data || []);
    } catch (error) {
      console.error('Failed to search abonents', error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchCollectors();
    fetchAbonents();
  }, []);

  // Filtered Payments computation
  const filteredPayments = useMemo(() => {
    return payments.filter(item => {
      // 1. Tab filter
      if (activeTab === 'PENDING' && item.status !== 'PENDING') return false;
      if (activeTab === 'ACCEPTED' && item.status !== 'ACCEPTED') return false;
      if (activeTab === 'CANCELLED' && item.status !== 'CANCELLED' && item.status !== 'REJECTED') return false;

      // 2. Collector filter
      if (selectedCollector !== 'ALL' && item.collector?.id !== selectedCollector) return false;

      // 3. Payment Method filter
      if (selectedMethod !== 'ALL' && item.paymentMethod !== selectedMethod) return false;

      // 4. Date filter
      const paymentDate = dayjs(item.date);
      const now = dayjs();
      if (dateFilterType === 'today') {
        if (!paymentDate.isSame(now, 'day')) return false;
      } else if (dateFilterType === 'yesterday') {
        if (!paymentDate.isSame(now.subtract(1, 'day'), 'day')) return false;
      } else if (dateFilterType === 'week') {
        if (paymentDate.isBefore(now.subtract(7, 'day').startOf('day'))) return false;
      } else if (dateFilterType === 'month') {
        if (!paymentDate.isSame(now, 'month')) return false;
      } else if (dateFilterType === 'custom') {
        if (selectedSpecificDate) {
          if (!paymentDate.isSame(selectedSpecificDate, 'day')) return false;
        } else if (customDateRange) {
          if (!paymentDate.isBetween(customDateRange[0].startOf('day'), customDateRange[1].endOf('day'), null, '[]')) {
            return false;
          }
        }
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const abonentNum = item.abonent?.abonentNumber?.toLowerCase() || '';
        const abonentName = item.abonent?.fullName?.toLowerCase() || '';
        const receipt = item.receiptNumber?.toLowerCase() || '';
        const collectorName = item.collector?.fullName?.toLowerCase() || '';
        if (!abonentNum.includes(q) && !abonentName.includes(q) && !receipt.includes(q) && !collectorName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, activeTab, selectedCollector, selectedMethod, dateFilterType, selectedSpecificDate, customDateRange, searchQuery]);

  // Financial KPI Metrics (computed for the current date scope)
  const metrics = useMemo(() => {
    const today = dayjs();
    const todayPayments = payments.filter(p => dayjs(p.date).isSame(today, 'day'));
    
    const todayTotal = todayPayments
      .filter(p => p.status === 'ACCEPTED')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const cashAccepted = todayPayments
      .filter(p => p.status === 'ACCEPTED' && p.paymentMethod === 'CASH')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const pendingCash = payments
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const onlineTotal = todayPayments
      .filter(p => p.status === 'ACCEPTED' && p.paymentMethod !== 'CASH')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const pendingCount = payments.filter(p => p.status === 'PENDING').length;
    const acceptedCount = payments.filter(p => p.status === 'ACCEPTED').length;
    const cancelledCount = payments.filter(p => p.status === 'CANCELLED' || p.status === 'REJECTED').length;

    return {
      todayTotal,
      cashAccepted,
      pendingCash,
      onlineTotal,
      pendingCount,
      acceptedCount,
      cancelledCount,
      todayCount: todayPayments.filter(p => p.status === 'ACCEPTED').length
    };
  }, [payments]);

  // Selected Total Amount for Batch Toolbar
  const selectedPayments = useMemo(() => {
    return payments.filter(p => selectedRowKeys.includes(p.id));
  }, [payments, selectedRowKeys]);

  const selectedTotalAmount = useMemo(() => {
    return selectedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [selectedPayments]);

  // Bulk Approval Handler
  const handleBulkApprove = async () => {
    if (selectedRowKeys.length === 0) return;
    setBulkActionLoading(true);
    try {
      const ids = selectedRowKeys as string[];
      await bulkUpdatePaymentStatus(ids, 'ACCEPTED');
      message.success(`${ids.length} ta to'lov muvaffaqiyatli qabul qilindi va kassa balansiga kiritildi`);
      setSelectedRowKeys([]);
      await fetchPayments();
    } catch (e: any) {
      message.error(e.response?.data?.message || "Guruhlab tasdiqlashda xatolik yuz berdi");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk / Single Storno Execution
  const handleExecuteStorno = async () => {
    if (!stornoReason.trim()) {
      message.error("Iltimos, bekor qilish sababini yozing");
      return;
    }
    setStornoLoading(true);
    try {
      if (isBulkStorno) {
        const ids = selectedRowKeys as string[];
        await bulkUpdatePaymentStatus(ids, 'CANCELLED');
        message.success(`${ids.length} ta to'lov bekor qilindi (Storno)`);
        setSelectedRowKeys([]);
      } else if (stornoPaymentId) {
        await cancelPayment(stornoPaymentId, stornoReason);
        message.success("To'lov muvaffaqiyatli bekor qilindi (Storno)");
      }
      setStornoModalVisible(false);
      setStornoPaymentId(null);
      setStornoReason('');
      setIsBulkStorno(false);
      await fetchPayments();
    } catch (err: any) {
      message.error(err.response?.data?.message || "To'lovni bekor qilishda xatolik yuz berdi");
    } finally {
      setStornoLoading(false);
    }
  };

  // POS Payment Modal Submission
  const handlePosSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const receiptNo = values.receiptNumber || `KAS-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        abonentId: values.abonentId,
        amount: values.amount,
        receiptNumber: receiptNo,
        comment: values.comment || 'Kassa orqali qabul qilindi',
      };
      
      const created = await createPayment(payload);
      let acceptSuccess = false;
      
      // If cashier chose instant accept, approve immediately
      if (values.directAccept && created?.id) {
        try {
          await updatePaymentStatus(created.id, 'ACCEPTED');
          acceptSuccess = true;
          message.success("To'lov kassa orqali qabul qilindi va tasdiqlandi!");
        } catch (e: any) {
          console.error("Direct accept fallback error", e);
          message.warning(e?.response?.data?.message || "To'lov saqlandi, ammo to'g'ridan-to'g'ri tasdiqlashda xatolik yuz berdi. Iltimos, uni kutilayotganlar ro'yxatidan tasdiqlang");
        }
      } else {
        message.success("To'lov kassa orqali muvaffaqiyatli saqlandi!");
      }

      if (values.printAfterSave && created?.id) {
        setSelectedPayment({
          ...created,
          abonent: posSelectedAbonent,
          amount: values.amount,
          receiptNumber: receiptNo,
          date: new Date().toISOString(),
          status: (values.directAccept && acceptSuccess) ? 'ACCEPTED' : 'PENDING'
        });
        setPrintModalVisible(true);
      }


      setIsPosModalVisible(false);
      posForm.resetFields();
      setPosSelectedAbonent(null);
      setReceivedCashAmount(null);
      setPosPaymentAmount(0);
      await fetchPayments();
    } catch (error: any) {
      message.error(error.response?.data?.message || "To'lovni qabul qilishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  // Open POS Modal
  const openPosModal = () => {
    posForm.resetFields();
    const defaultReceipt = `KAS-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`;
    posForm.setFieldsValue({
      receiptNumber: defaultReceipt,
      paymentMethod: 'CASH',
      directAccept: true,
      printAfterSave: false
    });
    setPosSelectedAbonent(null);
    setReceivedCashAmount(null);
    setPosPaymentAmount(0);
    setIsPosModalVisible(true);
  };

  // Print Receipt
  const handlePrintReceipt = (record: PaymentItem) => {
    setSelectedPayment(record);
    setPrintModalVisible(true);
  };

  // Export Daily Cash Ledger to Excel
  const handleExportExcel = () => {
    if (filteredPayments.length === 0) {
      message.warning("Eksport qilish uchun ma'lumot yo'q");
      return;
    }

    const rows = filteredPayments.map((p, idx) => ({
      "T/r": idx + 1,
      "Sana va Vaqt": dayjs(p.date).format('DD.MM.YYYY HH:mm'),
      "Kvitansiya": p.receiptNumber,
      "Hisob Raqam": p.abonent?.abonentNumber || '-',
      "F.I.SH (Abonent)": p.abonent?.fullName || '-',
      "Mahalla / Manzil": `${p.abonent?.mahalla?.name || ''} ${p.abonent?.street?.name || ''}`.trim() || '-',
      "Nazoratchi / Kassa": p.collector?.fullName || 'Kassa (Buxgalter)',
      "To'lov Turi": p.paymentMethod,
      "Summa (UZS)": Number(p.amount || 0),
      "Holati": p.status === 'ACCEPTED' ? 'Tasdiqlangan' : (p.status === 'PENDING' ? 'Kutilmoqda' : 'Bekor qilingan'),
      "Izoh": p.comment || ''
    }));

    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Kassa_Kitobi");
    let dateLabel = 'Barcha_davr';
    if (dateFilterType === 'today') dateLabel = dayjs().format('YYYY-MM-DD');
    else if (dateFilterType === 'yesterday') dateLabel = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    else if (dateFilterType === 'week') dateLabel = 'Oxirgi_7_kun';
    else if (dateFilterType === 'month') dateLabel = dayjs().format('YYYY-MM');
    else if (dateFilterType === 'custom' && selectedSpecificDate) dateLabel = selectedSpecificDate.format('YYYY-MM-DD');
    else if (dateFilterType === 'custom' && customDateRange) dateLabel = `${customDateRange[0].format('YYYY-MM-DD')}_${customDateRange[1].format('YYYY-MM-DD')}`;
    writeFile(wb, `Kassa_Tolovlar_Kitobi_${dateLabel}.xlsx`);
    message.success("Kassa kitobi Excel formatida muvaffaqiyatli yuklandi");
  };

  // Table Columns Definition
  const columns: ColumnsType<PaymentItem> = [
    {
      title: "Vaqt / Sana",
      dataIndex: 'date',
      key: 'date',
      width: 140,
      render: (val: string) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-[13px]">{dayjs(val).format('HH:mm')}</span>
          <span className="text-[11px] text-slate-400">{dayjs(val).format('DD.MM.YYYY')}</span>
        </div>
      )
    },
    {
      title: "Kvitansiya",
      dataIndex: 'receiptNumber',
      key: 'receiptNumber',
      width: 150,
      render: (val: string) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200/70 px-2.5 py-1 rounded-md">
          {val}
        </span>
      )
    },
    {
      title: "Abonent & Manzil",
      key: 'abonent',
      render: (_: any, record: PaymentItem) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm hover:text-sky-600 cursor-pointer transition-colors">
              {record.abonent?.fullName || "Noma'lum abonent"}
            </span>
            {record.abonent?.abonentNumber && (
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono font-semibold">
                {record.abonent.abonentNumber}
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-slate-500 truncate max-w-[280px]">
            {record.abonent?.mahalla?.name ? `${record.abonent.mahalla.name}, ` : ''}
            {record.abonent?.street?.name ? `${record.abonent.street.name}` : ''}
            {record.abonent?.house ? ` uy ${record.abonent.house}` : ''}
          </div>
        </div>
      )
    },
    {
      title: "Pul Yig'uvchi / Operator",
      key: 'collector',
      width: 200,
      render: (_: any, record: PaymentItem) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <UserCheck size={13} />
          </div>
          <span className="text-xs font-medium text-slate-700">
            {record.collector?.fullName || 'Kassa (Buxgalteriya)'}
          </span>
        </div>
      )
    },
    {
      title: "To'lov Turi",
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 130,
      render: (val: string) => {
        if (val === 'CASH') {
          return <Tag color="green" className="rounded-md font-semibold text-xs border-0 bg-emerald-50 text-emerald-700 py-0.5 px-2">Naqd pul</Tag>;
        }
        if (val === 'CLICK') {
          return <Tag color="blue" className="rounded-md font-semibold text-xs border-0 bg-sky-50 text-sky-700 py-0.5 px-2">Click</Tag>;
        }
        if (val === 'PAYME') {
          return <Tag color="cyan" className="rounded-md font-semibold text-xs border-0 bg-cyan-50 text-cyan-700 py-0.5 px-2">Payme</Tag>;
        }
        if (val === 'BANK') {
          return <Tag color="purple" className="rounded-md font-semibold text-xs border-0 bg-purple-50 text-purple-700 py-0.5 px-2">Bank / O'tkazma</Tag>;
        }
        return <Tag className="rounded-md font-medium text-xs">{val}</Tag>;
      }
    },
    {
      title: "Summa (UZS)",
      dataIndex: 'amount',
      key: 'amount',
      width: 170,
      align: 'right',
      render: (val: any, record: PaymentItem) => (
        <span className={`font-mono text-[15px] font-extrabold ${
          record.status === 'ACCEPTED' ? 'text-emerald-600' : (record.status === 'PENDING' ? 'text-amber-600' : 'text-slate-400 line-through')
        }`}>
          {Number(val || 0).toLocaleString()} UZS
        </span>
      )
    },
    {
      title: "Holati",
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center',
      render: (val: string) => {
        if (val === 'PENDING') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Kutilmoqda
            </span>
          );
        }
        if (val === 'ACCEPTED') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check size={13} className="text-emerald-600" />
              Tasdiqlangan
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={13} className="text-rose-500" />
            Bekor qilingan
          </span>
        );
      }
    },
    {
      title: "",
      key: 'actions',
      width: 90,
      align: 'right',
      render: (_: any, record: PaymentItem) => (
        <div className="flex items-center justify-end gap-1">
          {record.status === 'ACCEPTED' && (
            <>
              <Tooltip title="Kvitansiya chop etish">
                <Button 
                  type="text" 
                  size="small"
                  className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg p-1.5"
                  icon={<Printer size={16} />} 
                  onClick={() => handlePrintReceipt(record)}
                />
              </Tooltip>
              <Tooltip title="To'lovni bekor qilish (Storno)">
                <Button 
                  type="text" 
                  size="small"
                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5"
                  icon={<RotateCcw size={15} />} 
                  onClick={() => {
                    setStornoPaymentId(record.id);
                    setStornoReason('');
                    setIsBulkStorno(false);
                    setStornoModalVisible(true);
                  }}
                />
              </Tooltip>
            </>
          )}
        </div>
      )
    }
  ];

  // Row Selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    // Only allow selection on PENDING items when in PENDING tab
    getCheckboxProps: (record: PaymentItem) => ({
      disabled: activeTab === 'CANCELLED',
      name: record.id,
    }),
  };

  return (
    <div className="w-full space-y-5">
      
      {/* 1. TOP HEADER & OPERATIONAL BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">To'lovlar</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Kassa operatsiyalari, tushumlar va to'lovlar jurnali
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={fetchPayments} 
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} 
            className="h-9 px-3 rounded-md text-xs font-medium text-slate-700"
          >
            Yangilash
          </Button>
          <Button 
            onClick={handleExportExcel}
            icon={<Download size={14} />} 
            className="h-9 px-3.5 rounded-md text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          >
            Kassa kitobi (Excel)
          </Button>
          <Button 
            type="primary"
            onClick={openPosModal}
            icon={<Plus size={14} />} 
            className="h-9 px-4 rounded-md text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white"
          >
            Yangi to'lov qabul qilish
          </Button>
        </div>
      </div>

      {/* 2. 4 FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Bugungi Jami Tushum */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Bugungi jami tushum</span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
              BUGUN
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {metrics.todayTotal.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-[11px] text-emerald-600 font-medium">
              <ArrowUpRight size={13} />
              <span>{metrics.todayCount} ta muvaffaqiyatli to'lov</span>
            </div>
          </div>
        </div>

        {/* Card 2: Kassadagi Naqd Pul (Tasdiqlangan) */}
        <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-800">Kassadagi naqd pul</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              TASDIQLANGAN
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 tracking-tight">
              {metrics.cashAccepted.toLocaleString()} <span className="text-xs font-normal text-emerald-600">UZS</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Kassaga rasman qabul qilingan</span>
            </div>
          </div>
        </div>

        {/* Card 3: Tasdiqlash Kutilmoqda (Naqd pul) */}
        <div className={`p-4 rounded-lg border shadow-xs flex flex-col justify-between ${
          metrics.pendingCount > 0 
            ? 'bg-amber-50/40 border-amber-200' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-800">Tasdiq kutilmoqda</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${metrics.pendingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
              {metrics.pendingCount} ta
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono tabular-nums text-amber-700 tracking-tight">
              {metrics.pendingCash.toLocaleString()} <span className="text-xs font-normal text-amber-600">UZS</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>Topshirilishi kutilayotgan summa</span>
            </div>
          </div>
        </div>

        {/* Card 4: Onlayn Tushum (Click/Payme/Bank) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Onlayn & Bank tushumi</span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              ELEKTRON
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
              {metrics.onlineTotal.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
              <CreditCard size={13} className="text-slate-400" />
              <span>Click, Payme va bank o'tkazmalari</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. CONTROLS, TABS & FILTERS BAR */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3.5">
        
        {/* Subtabs for Pending, Accepted, All */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setActiveTab('PENDING');
                setSelectedRowKeys([]);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertCircle size={13} />
              <span>Kutilmoqda</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                activeTab === 'PENDING' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {metrics.pendingCount}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('ACCEPTED');
                setSelectedRowKeys([]);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'ACCEPTED'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Check size={13} />
              <span>Tasdiqlangan</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                activeTab === 'ACCEPTED' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {metrics.acceptedCount}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('CANCELLED');
                setSelectedRowKeys([]);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'CANCELLED'
                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <RotateCcw size={13} />
              <span>Bekor qilingan</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                activeTab === 'CANCELLED' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {metrics.cancelledCount}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('ALL');
                setSelectedRowKeys([]);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Barchasi</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                {payments.length}
              </span>
            </button>
          </div>

          {/* Date Filter Pills & Specific Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-xs">
              <button
                onClick={() => {
                  setDateFilterType('today');
                  setSelectedSpecificDate(null);
                  setCustomDateRange(null);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  dateFilterType === 'today' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bugun ({dayjs().format('DD.MM')})
              </button>
              <button
                onClick={() => {
                  setDateFilterType('yesterday');
                  setSelectedSpecificDate(null);
                  setCustomDateRange(null);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  dateFilterType === 'yesterday' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kecha
              </button>
              <button
                onClick={() => {
                  setDateFilterType('week');
                  setSelectedSpecificDate(null);
                  setCustomDateRange(null);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  dateFilterType === 'week' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 kun
              </button>
              <button
                onClick={() => {
                  setDateFilterType('month');
                  setSelectedSpecificDate(null);
                  setCustomDateRange(null);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  dateFilterType === 'month' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Shu oy
              </button>
              <button
                onClick={() => {
                  setDateFilterType('all');
                  setSelectedSpecificDate(null);
                  setCustomDateRange(null);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  dateFilterType === 'all' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Barchasi
              </button>
            </div>

            {/* Exact Calendar DatePicker */}
            <div className="flex items-center gap-1.5">
              <DatePicker
                placeholder="Aniq sana..."
                value={selectedSpecificDate}
                onChange={(date) => {
                  if (date) {
                    setSelectedSpecificDate(date);
                    setCustomDateRange(null);
                    setDateFilterType('custom');
                  } else {
                    setSelectedSpecificDate(null);
                    setDateFilterType('today');
                  }
                }}
                format="DD.MM.YYYY"
                allowClear
                size="small"
                className="rounded-md text-xs font-medium h-7"
              />
              {dateFilterType === 'custom' && selectedSpecificDate && (
                <span className="text-[11px] text-sky-700 font-semibold bg-sky-50 border border-sky-200 px-2 py-0.5 rounded flex items-center gap-1 shrink-0 font-mono">
                  <Calendar size={11} className="text-sky-600" />
                  <span>{selectedSpecificDate.format('DD.MM.YYYY')}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          
          {/* Universal Search */}
          <div className="lg:col-span-5">
            <Input
              placeholder="Abonent F.I.SH, hisob raqami, kvitansiya..."
              prefix={<Search size={14} className="text-slate-400 mr-1" />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              allowClear
              className="rounded-md text-xs"
            />
          </div>

          {/* Collector Dropdown */}
          <div className="lg:col-span-3">
            <Select
              value={selectedCollector}
              onChange={setSelectedCollector}
              className="w-full rounded-md text-xs"
              options={[
                { value: 'ALL', label: "Barcha pul yig'uvchilar" },
                ...collectors.map(c => ({ value: c.id, label: `${c.fullName} (${c.phone || '-'})` }))
              ]}
            />
          </div>

          {/* Payment Method Dropdown */}
          <div className="lg:col-span-2">
            <Select
              value={selectedMethod}
              onChange={setSelectedMethod}
              className="w-full rounded-md text-xs"
              options={[
                { value: 'ALL', label: "Barcha usullar" },
                { value: 'CASH', label: "Naqd pul" },
                { value: 'CLICK', label: "Click" },
                { value: 'PAYME', label: "Payme" },
                { value: 'BANK', label: "Bank o'tkazma" },
              ]}
            />
          </div>

          {/* Custom Date Range Picker (if active) */}
          <div className="lg:col-span-2">
            {dateFilterType === 'custom' ? (
              <RangePicker
                className="w-full rounded-md text-xs"
                value={customDateRange}
                onChange={(dates: any) => setCustomDateRange(dates)}
              />
            ) : (
              <div className="text-xs text-slate-500 font-mono px-2 py-1.5 bg-slate-50 rounded-md text-center border border-slate-200">
                {dateFilterType === 'today' && `Sana: ${dayjs().format('DD.MM.YYYY')}`}
                {dateFilterType === 'yesterday' && `Sana: ${dayjs().subtract(1, 'day').format('DD.MM.YYYY')}`}
                {dateFilterType === 'month' && `Davr: ${dayjs().format('MMMM YYYY')}`}
                {dateFilterType === 'week' && 'Oxirgi 7 kun'}
                {dateFilterType === 'all' && 'Barcha to\'lovlar'}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 4. TOP BATCH ACTION TOOLBAR (When rows are selected via checkboxes) */}
      {selectedRowKeys.length > 0 && (
        <div className="sticky top-20 z-30 bg-sky-50/95 backdrop-blur-md text-slate-900 p-3 sm:p-3.5 rounded-xl shadow-sm border border-sky-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <CheckSquare size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>{selectedRowKeys.length} ta to'lov tanlandi</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-200/60 text-sky-800 font-semibold">Guruhli amal</span>
              </div>
              <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                Umumiy summa: <span className="text-emerald-700 font-bold font-mono text-xs">{selectedTotalAmount.toLocaleString()} UZS</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              onClick={() => setSelectedRowKeys([])}
              className="h-8 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs"
            >
              Bekor qilish
            </Button>

            {activeTab === 'PENDING' && (
              <Popconfirm
                title="Guruhlab tasdiqlash"
                description={`Tanlangan ${selectedRowKeys.length} ta to'lovni (${selectedTotalAmount.toLocaleString()} UZS) kassaga qabul qilishni tasdiqlaysizmi?`}
                onConfirm={handleBulkApprove}
                okText="Ha, tasdiqlash"
                cancelText="Bekor qilish"
              >
                <Button
                  type="primary"
                  loading={bulkActionLoading}
                  className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 border-0 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Check size={14} />
                  Tasdiqlash ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}

            <Button
              danger
              type="primary"
              className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              onClick={() => {
                setIsBulkStorno(true);
                setStornoReason('');
                setStornoModalVisible(true);
              }}
            >
              <RotateCcw size={13} />
              Storno
            </Button>
          </div>

        </div>
      )}

      {/* 5. MAIN DENSE PAYMENTS TABLE */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        
        <Table<PaymentItem>
          columns={columns}
          dataSource={filteredPayments}
          rowKey="id"
          rowSelection={rowSelection}
          loading={{
            indicator: <Spin size="default" />,
            spinning: loading
          }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['15', '30', '50', '100'],
            showTotal: (tot, range) => `${tot} ta to'lovdan ${range[0]}-${range[1]} ko'rsatilmoqda`,
            className: "p-3"
          }}
          locale={{
            emptyText: (
              <div className="py-12 text-center">
                <Wallet size={40} className="text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-slate-600 font-semibold text-sm">To'lovlar topilmadi</p>
                <p className="text-slate-400 text-xs mt-0.5">Tanlangan filtrlar bo'yicha hech qanday to'lov mavjud emas</p>
              </div>
            )
          }}
          className="payments-dense-table"
          size="small"
        />

      </div>

      {/* 6. POS CASH PAYMENT MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <Receipt size={18} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">Yangi to'lov qabul qilish (POS Kassa)</div>
              <div className="text-xs text-slate-500 font-normal">Kassaga naqd pul yoki elektron to'lovni kiritish</div>
            </div>
          </div>
        }
        open={isPosModalVisible}
        onCancel={() => {
          setIsPosModalVisible(false);
          posForm.resetFields();
          setPosSelectedAbonent(null);
          setReceivedCashAmount(null);
          setPosPaymentAmount(0);
        }}
        footer={null}
        width={640}
        destroyOnClose
        className="pos-payment-modal"
      >
        <Form form={posForm} layout="vertical" onFinish={handlePosSubmit} className="pt-2 space-y-3.5">
          
          {/* Abonent tanlash */}
          <Form.Item
            name="abonentId"
            label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Abonentni tanlang</span>}
            rules={[{ required: true, message: 'Iltimos, abonentni tanlang' }]}
          >
            <Select
              showSearch
              placeholder="Abonent F.I.SH, hisob raqami yoki manzili bo'yicha qidiring..."
              onSearch={fetchAbonents}
              filterOption={false}
              className="w-full rounded-md"
              onChange={val => {
                const found = abonents.find(a => a.id === val);
                setPosSelectedAbonent(found);
                const debt = Number(found?.balance || 0);
                if (debt > 0) {
                  posForm.setFieldsValue({ amount: debt });
                  setPosPaymentAmount(debt);
                }
              }}
              notFoundContent={<span className="text-slate-400 p-2 block text-xs">Abonent topilmadi</span>}
            >
              {abonents.map(a => (
                <Select.Option key={a.id} value={a.id}>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <span className="font-semibold text-slate-800 text-xs">{a.fullName}</span>
                      <span className="text-slate-400 text-xs font-mono ml-2">{a.abonentNumber}</span>
                      <div className="text-[11px] text-slate-400">
                        {a.mahalla?.name || ''} {a.street?.name || ''}
                      </div>
                    </div>
                    <div className="text-right">
                      {Number(a.balance || 0) > 0 ? (
                        <span className="text-rose-600 font-mono font-bold text-xs bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          Qarz: {Number(a.balance).toLocaleString()} UZS
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-mono font-bold text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Haqdor: {Math.abs(Number(a.balance || 0)).toLocaleString()} UZS
                        </span>
                      )}
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Abonent Balans va Manzil Vizual Kartasi */}
          {posSelectedAbonent && (
            <div className={`p-3 rounded-lg border ${
              Number(posSelectedAbonent.balance || 0) > 0 
                ? 'bg-rose-50/50 border-rose-200' 
                : 'bg-emerald-50/50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">{posSelectedAbonent.fullName}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hisob: <span className="font-mono font-semibold text-slate-700">{posSelectedAbonent.abonentNumber}</span> | 
                    Telefon: <span className="font-medium text-slate-700 font-mono">{posSelectedAbonent.phone || "Yo'q"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hozirgi balans</div>
                  <div className={`text-sm font-bold font-mono ${
                    Number(posSelectedAbonent.balance || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    {Number(posSelectedAbonent.balance || 0) > 0 
                      ? `Qarz: ${Number(posSelectedAbonent.balance).toLocaleString()} UZS`
                      : `Haqdor: +${Math.abs(Number(posSelectedAbonent.balance || 0)).toLocaleString()} UZS`
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tezkor Summa Tugmalari (Quick Presets) */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Tezkor summa tanlash</div>
            <div className="flex flex-wrap gap-1.5">
              {posSelectedAbonent && Number(posSelectedAbonent.balance || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const debt = Number(posSelectedAbonent.balance || 0);
                    posForm.setFieldsValue({ amount: debt });
                    setPosPaymentAmount(debt);
                  }}
                  className="px-2.5 py-1 rounded bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 font-semibold text-xs transition-colors cursor-pointer font-mono"
                >
                  Qarzni to'liq yopish ({Number(posSelectedAbonent.balance).toLocaleString()} UZS)
                </button>
              )}
              {[50000, 100000, 150000, 200000, 500000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    posForm.setFieldsValue({ amount: amt });
                    setPosPaymentAmount(amt);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer font-mono"
                >
                  +{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Summa va Kvitansiya */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="amount"
              label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">To'lov summasi (UZS)</span>}
              rules={[{ required: true, message: 'Summani kiriting' }]}
            >
              <InputNumber
                className="w-full text-base font-bold text-emerald-700 rounded-md font-mono"
                min={1}
                step={5000}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(value) => value!.replace(/\s?|(,*)/g, '') as any}
                onChange={(val) => setPosPaymentAmount(Number(val || 0))}
              />
            </Form.Item>

            <Form.Item
              name="receiptNumber"
              label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Kvitansiya / Chek raqami</span>}
              rules={[{ required: true, message: 'Kvitansiya raqami kerak' }]}
            >
              <Input className="rounded-md font-mono font-medium text-xs" />
            </Form.Item>
          </div>

          {/* Qaytim (Sdacha) Kalkulyatori */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Qaytim kalkulyatori</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="text-xs text-slate-600 block mb-1">Mijoz bergan naqd pul:</label>
                <InputNumber
                  className="w-full font-semibold text-slate-800 rounded-md font-mono"
                  placeholder="Masalan: 100 000"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  parser={(value) => value!.replace(/\s?|(,*)/g, '') as any}
                  value={receivedCashAmount}
                  onChange={(val) => setReceivedCashAmount(Number(val || 0))}
                />
              </div>

              <div className="bg-white p-2.5 rounded-md border border-slate-200 text-right">
                <div className="text-[11px] font-medium text-slate-400 uppercase">Mijozga qaytim:</div>
                <div className="text-lg font-bold font-mono text-sky-700">
                  {receivedCashAmount !== null && receivedCashAmount >= posPaymentAmount
                    ? `${(receivedCashAmount - posPaymentAmount).toLocaleString()} UZS`
                    : '0 UZS'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* To'lov usuli va To'g'ridan-to'g'ri qabul qilish */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item name="paymentMethod" label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">To'lov Usuli</span>}>
              <Select
                className="rounded-md"
                options={[
                  { value: 'CASH', label: "Naqd pul (Kassa)" },
                  { value: 'BANK', label: "Bank o'tkazmasi (Hisob raqam)" },
                  { value: 'CLICK', label: "Click" },
                  { value: 'PAYME', label: "Payme" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="directAccept"
              label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Kassa Statusi</span>}
            >
              <Select
                className="w-full rounded-md"
                options={[
                  { value: true, label: "To'g'ridan-to'g'ri tasdiqlash (Kassa)" },
                  { value: false, label: "Kutilmoqda (Keyin tasdiqlanadi)" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item name="comment" label={<span className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Izoh (Ixtiyoriy)</span>}>
            <Input.TextArea rows={2} className="rounded-md text-xs" placeholder="To'lov haqida qo'shimcha ma'lumot..." />
          </Form.Item>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Form.Item name="printAfterSave" valuePropName="checked" noStyle>
              <Checkbox className="text-xs text-slate-600">
                To'lovdan so'ng termoprinterda chek chiqarish
              </Checkbox>
            </Form.Item>

            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsPosModalVisible(false)} 
                className="h-9 px-4 rounded-md text-xs font-medium text-slate-600"
              >
                Bekor qilish
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={submitting}
                className="h-9 px-5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white"
              >
                To'lovni qabul qilish
              </Button>
            </div>
          </div>

        </Form>
      </Modal>

      {/* 7. STORNO (BEKOR QILISH) MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
            <RotateCcw size={18} />
            <span>To'lovni bekor qilish (Storno amali)</span>
          </div>
        }
        open={stornoModalVisible}
        onOk={handleExecuteStorno}
        onCancel={() => {
          setStornoModalVisible(false);
          setStornoPaymentId(null);
          setStornoReason('');
          setIsBulkStorno(false);
        }}
        confirmLoading={stornoLoading}
        okText="Ha, to'lovni bekor qilish"
        okButtonProps={{ danger: true }}
        cancelText="Yopish"
        destroyOnClose
      >
        <div className="py-3 space-y-3">
          <Alert
            type="warning"
            showIcon
            message="Diqqat: Storno operatsiyasi moliyaviy oqibatlarga ega"
            description="Ushbu to'lov bekor qilinganda, abonent balansiga to'langan summa qaytadan qarz sifatida tiklanadi va yopilgan schyotlar ochiladi."
          />
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Bekor qilish sababi (Majburiy):
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Masalan: Xato kiritilgan summa, mijozning qaytishi..."
              value={stornoReason}
              onChange={(e) => setStornoReason(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
      </Modal>

      {/* 8. RECEIPT PRINT MODAL */}
      <ReceiptPrint 
        visible={printModalVisible} 
        onClose={() => setPrintModalVisible(false)} 
        payment={selectedPayment} 
        abonent={selectedPayment?.abonent} 
      />

      {/* Dense Table Styles */}
      <style>{`
        .payments-dense-table .ant-table-thead > tr > th {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 12px 14px;
        }
        .payments-dense-table .ant-table-tbody > tr > td {
          border-bottom: 1px dashed #f1f5f9;
          padding: 12px 14px;
        }
        .payments-dense-table .ant-table-tbody > tr:hover > td {
          background-color: #f8fafc;
        }
      `}</style>

    </div>
  );
};

export default Payments;
