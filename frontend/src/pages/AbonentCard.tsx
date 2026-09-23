import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Table, Button, Input, Modal, Form, Select, DatePicker, InputNumber, message, Steps, Popconfirm, Drawer, Tabs, Tag, Tooltip, Alert, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  Plus, Search, Eye, Download, Check, X, Trash2, Archive, Gauge, Filter, 
  Users, UserCheck, Edit3, RotateCcw, Clock, ShieldCheck, Activity, 
  RefreshCw, CheckCircle2, History, AlertCircle, FileText, User, MapPin, ArrowRight, Calendar, Phone,
  CreditCard, Hash, Home, Building, UserPlus, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash.debounce';
import { getAbonents, createAbonent, updateAbonentStatus, deleteAbonent, previewRetroactiveBilling } from '../../services/abonentService';
import { getAuditLogs } from '../../services/auditService';
import { useTableState } from '../../hooks/useTableState';
import api from '../../services/api';
import { getTariffs } from '../../services/tariffService';
import { getMahallas, getStreets } from '../../services/addressService';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { utils, writeFile } from 'xlsx';
import { useLanguage } from '../../contexts/LanguageContext';

dayjs.extend(isBetween);

const { Option } = Select;

interface AuditItem {
  id: string;
  tenantId?: string;
  actionType: string;
  description: string;
  action?: string;
  actor?: string;
  abonentId?: string | null;
  abonentNumber?: string | null;
  fullName?: string | null;
  address?: string | null;
  mahalla?: string | null;
  street?: string | null;
  phone?: string | null;
  details?: string | null;
  status?: string | null;
  createdAt: string;
}

function parseAddressParts(record: AuditItem): { mahalla: string; street: string } {
  if (record.mahalla || record.street) {
    return {
      mahalla: record.mahalla || '—',
      street: record.street || '—'
    };
  }
  const addr = record.address;
  if (!addr || addr === '—') {
    return { mahalla: '—', street: '—' };
  }
  const parts = addr.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    const mahalla = parts[0];
    const street = parts.slice(1).join(', ');
    return { mahalla, street };
  }
  return { mahalla: addr, street: '—' };
}

function parseLogAction(actionType: string, desc: string) {
  const cleanDesc = desc || '';
  if (cleanDesc.includes("Yangi abonent") || cleanDesc.includes("abonent qo'shildi")) {
    return { type: 'NEW', label: "Yangi Abonent", color: 'green', icon: Plus };
  }
  if (cleanDesc.includes("tahrirlandi") || cleanDesc.includes("o'zgartirildi") || cleanDesc.includes("yangilandi")) {
    return { type: 'EDIT', label: "Tahrirlandi", color: 'orange', icon: Edit3 };
  }
  if (cleanDesc.includes("almashtirildi") || cleanDesc.includes("Vodomer") || cleanDesc.includes("vodomer") || cleanDesc.includes("Hisoblagich")) {
    return { type: 'METER', label: "Vodomer Almashdi", color: 'blue', icon: Gauge };
  }
  if (cleanDesc.includes("arxivlandi") || cleanDesc.includes("o'chirildi")) {
    return { type: 'ARCHIVE', label: "Arxivlandi", color: 'red', icon: Archive };
  }
  if (cleanDesc.includes("To'lov") || cleanDesc.includes("to'lov")) {
    return { type: 'PAYMENT', label: "To'lov Amali", color: 'cyan', icon: FileText };
  }
  return { type: 'OTHER', label: "Tizim Harakati", color: 'default', icon: History };
}

function extractActor(desc: string): { actor: string; cleanText: string } {
  let text = desc || '';
  let actor = 'Operator';
  const match = text.match(/^\[(.*?)\]\s*(.*)$/);
  if (match) {
    actor = match[1];
    text = match[2];
  } else if (text.startsWith('Superadmin:')) {
    actor = 'Superadmin';
    text = text.replace(/^Superadmin:\s*/, '');
  }
  return { actor, cleanText: text };
}

const AbonentCard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Primary Subtab
  const [mainTab, setMainTab] = useState<'AUDIT' | 'ALL_ABONENTS'>('AUDIT');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditDateFilter, setAuditDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<dayjs.Dayjs | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // Subscribers Database State
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const { pagination, setPagination, handleTableChange } = useTableState('abonent_card_table');
  const currentPage = pagination.current || 1;
  
  // Creation Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [meterForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [retroactivePreview, setRetroactivePreview] = useState<{ count: number; amount: number } | null>(null);
  const [checkingRetroactive, setCheckingRetroactive] = useState(false);

  // Bulk Operations State
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isBulkArchiveVisible, setIsBulkArchiveVisible] = useState(false);
  const [isBulkUnarchiveVisible, setIsBulkUnarchiveVisible] = useState(false);
  const [isBulkReadingsVisible, setIsBulkReadingsVisible] = useState(false);
  const [bulkArchiveReason, setBulkArchiveReason] = useState('');
  const [bulkUnarchiveReason, setBulkUnarchiveReason] = useState('');
  const [bulkReadings, setBulkReadings] = useState<Record<string, number>>({});
  const [bulkDate, setBulkDate] = useState<dayjs.Dayjs>(dayjs());

  const [tariffs, setTariffs] = useState<any[]>([]);
  const [mahallas, setMahallas] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [selectedMahalla, setSelectedMahalla] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    mahallaId: undefined,
    streetId: undefined,
    hasDebt: undefined,
    tariffType: undefined,
    status: undefined,
    debtDuration: undefined,
    type: 'PHYSICAL',
  });
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchAuditLogs = async (customDate?: dayjs.Dayjs | null) => {
    setAuditLoading(true);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (customDate) {
        startDate = customDate.startOf('day').toISOString();
        endDate = customDate.endOf('day').toISOString();
      }
      const res = await getAuditLogs(1, 500, undefined, undefined, startDate, endDate);
      setAuditLogs(res.data || []);
    } catch (e) {
      console.error("Failed to load audit logs", e);
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchAbonentsRef = useRef<(page: number, search?: string) => Promise<void>>(null);

  const fetchAbonents = useCallback(async (page: number, searchKeyword = '') => {
    setLoading(true);
    try {
      const result = await getAbonents({ 
        page, 
        limit: 15, 
        search: searchKeyword,
        ...filtersRef.current
      });
      setData(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      message.error('Abonentlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  fetchAbonentsRef.current = fetchAbonents;

  const debouncedSearchRef = useRef(
    debounce((value: string) => {
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchAbonentsRef.current?.(1, value);
    }, 400)
  );

  useEffect(() => {
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    fetchAuditLogs();
    fetchAbonents(1, '');
    getTariffs().then(setTariffs).catch(console.error);
    getMahallas().then(setMahallas).catch(console.error);
  }, []);

  useEffect(() => {
    if (currentPage !== 1) {
      setPagination(prev => ({ ...prev, current: 1 }));
    } else {
      fetchAbonents(1, search);
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedMahalla) {
      getStreets(selectedMahalla).then(setStreets);
    } else {
      setStreets([]);
    }
  }, [selectedMahalla]);

  // Filtered Audit Logs (Strictly Abonent Lifecycle: Created, Edited, Meter Replaced, Archived)
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const desc = (log.description || '').toLowerCase();
      const action = (log.action || '').toLowerCase();

      // 1. Exclude payments, debt charges/adjustments, and billing calculations
      if (
        desc.includes("to'lov") || 
        desc.includes("to‘lov") || 
        desc.includes("to`lov") || 
        desc.includes("tolov") || 
        desc.includes("qarz") || 
        desc.includes("korrektirovka") || 
        desc.includes("hisoblandi") || 
        desc.includes("hisob-kitob") ||
        action.includes("to'lov") ||
        action.includes("qarz")
      ) {
        return false;
      }

      const actionMeta = parseLogAction(log.actionType, log.description);

      // 2. Only allow Abonent Lifecycle Events: NEW, EDIT, METER, ARCHIVE
      if (!['NEW', 'EDIT', 'METER', 'ARCHIVE'].includes(actionMeta.type)) {
        return false;
      }

      // 3. Must have abonent identification
      if (!log.abonentId && !log.abonentNumber && !log.fullName) {
        return false;
      }

      const logDate = dayjs(log.createdAt);
      const now = dayjs();
      if (auditDateFilter === 'today') {
        if (!logDate.isSame(now, 'day')) return false;
      } else if (auditDateFilter === 'yesterday') {
        if (!logDate.isSame(now.subtract(1, 'day'), 'day')) return false;
      } else if (auditDateFilter === 'week') {
        // Oxirgi 7 kun
        if (logDate.isBefore(now.subtract(7, 'day').startOf('day'))) return false;
      } else if (auditDateFilter === 'month') {
        if (!logDate.isSame(now, 'month')) return false;
      } else if (auditDateFilter === 'custom' && selectedSpecificDate) {
        if (!logDate.isSame(selectedSpecificDate, 'day')) return false;
      }

      if (auditActionFilter !== 'ALL' && actionMeta.type !== auditActionFilter) {
        return false;
      }

      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase().trim();
        const num = (log.abonentNumber || '').toLowerCase();
        const name = (log.fullName || '').toLowerCase();
        const addr = (log.address || '').toLowerCase();
        const mahalla = (log.mahalla || '').toLowerCase();
        const street = (log.street || '').toLowerCase();
        const phone = (log.phone || '').toLowerCase();
        const actor = (log.actor || '').toLowerCase();
        if (
          !desc.includes(q) &&
          !num.includes(q) &&
          !name.includes(q) &&
          !addr.includes(q) &&
          !mahalla.includes(q) &&
          !street.includes(q) &&
          !phone.includes(q) &&
          !actor.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, auditDateFilter, selectedSpecificDate, auditActionFilter, auditSearch]);

  const kpis = useMemo(() => {
    const today = dayjs();
    const todayLogs = auditLogs.filter(l => dayjs(l.createdAt).isSame(today, 'day'));
    
    const addedToday = todayLogs.filter(l => (l.description || '').includes("Yangi abonent qo'shildi") || (l.action || '').includes("Yangi abonent")).length;
    const editedToday = todayLogs.filter(l => (l.description || '').includes("tahrirlandi") || (l.description || '').includes("holati o'zgartirildi")).length;
    const meterReplacedToday = todayLogs.filter(l => (l.description || '').includes("almashtirildi") || (l.description || '').includes("Hisoblagich")).length;

    return {
      addedToday,
      editedToday,
      meterReplacedToday,
      totalAbonents: total
    };
  }, [auditLogs, total]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearchRef.current(value);
  };

  const showModal = () => {
    form.resetFields();
    meterForm.resetFields();
    setCurrentStep(0);
    setRetroactivePreview(null);
    setSelectedMahalla(null);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const selectedTariffId = Form.useWatch('tariffId', form);
  const selectedTariff = tariffs.find(t => t.id === selectedTariffId);
  const isMetered = selectedTariff?.type === 'METERED';

  const nextStep = async () => {
    try {
      await form.validateFields();
      setCurrentStep(1);
    } catch (e) {
      console.error(e);
    }
  };

  const prevStep = () => {
    setCurrentStep(0);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    let payload: any;
    try {
      const basicValues = await form.validateFields();
      let meterValues = null;
      if (isMetered) {
        meterValues = await meterForm.validateFields();
      }

      payload = {
        ...basicValues,
        type: 'PHYSICAL',
        fullName: `${basicValues.lastName || ''} ${basicValues.firstName || ''} ${basicValues.middleName || ''}`.trim().replace(/\s+/g, ' '),
        phone: basicValues.phone ? '+998' + basicValues.phone : undefined,
        contractDate: basicValues.contractDate ? basicValues.contractDate.format('YYYY-MM-DD') : undefined,
        birthDate: basicValues.birthDate ? basicValues.birthDate.format('YYYY-MM-DD') : undefined,
        status: 'ACTIVE',
      };

      delete payload.lastName;
      delete payload.firstName;
      delete payload.middleName;

      if (isMetered && meterValues) {
        payload.meterDetails = {
          number: meterValues.number,
          model: meterValues.model,
          certificateNumber: meterValues.certificateNumber,
          installedAt: meterValues.installedAt ? meterValues.installedAt.format('YYYY-MM-DD') : undefined,
          checkDate: meterValues.checkDate ? meterValues.checkDate.format('YYYY-MM-DD') : undefined,
          initialReading: meterValues.initialReading,
        };
      }

      await createAbonent(payload);
      message.success("Yangi abonent muvaffaqiyatli qo'shildi!");
      setIsModalVisible(false);
      fetchAbonents(1, search);
      fetchAuditLogs();
    } catch (error: any) {
      const msg = error.response?.data?.message;
      if (typeof msg === 'string' && msg.startsWith('DUPLICATE_')) {
        Modal.confirm({
          title: 'Dublikat aniqlandi!',
          content: `${msg.split(': ')[1]}\nShunga qaramay abonentni qo'shmoqchimisiz?`,
          okText: "Ha, baribir qo'shish",
          cancelText: "Bekor qilish",
          onOk: async () => {
            payload.forceCreate = true;
            try {
              setSubmitting(true);
              await createAbonent(payload);
              message.success("Abonent muvaffaqiyatli qo'shildi!");
              setIsModalVisible(false);
              fetchAbonents(1, search);
              fetchAuditLogs();
            } catch (err: any) {
              message.error(err.response?.data?.message || "Xatolik yuz berdi");
            } finally {
              setSubmitting(false);
            }
          }
        });
      } else {
        message.error(msg || "Abonent qo'shishda xatolik yuz berdi");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateAbonentStatus(id, 'ACTIVE');
      message.success("Abonent faollashtirildi");
      fetchAbonents(currentPage, search);
      fetchAuditLogs();
    } catch (e) {
      message.error("Xatolik");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAbonent(id);
      message.success("Abonent o'chirildi");
      fetchAbonents(currentPage, search);
      fetchAuditLogs();
    } catch (e) {
      message.error("Xatolik");
    }
  };

  const handleExport = async () => {
    try {
      const result = await getAbonents({ 
        page: 1, 
        limit: 10000, 
        search,
        ...filtersRef.current 
      });
      const exportData = (result.data || []).map((ab: any, index: number) => ({
        '№': index + 1,
        'Abonent raqami': ab.abonentNumber,
        'F.I.Sh': ab.fullName,
        'Telefon': ab.phone,
        'Manzil': `${ab.mahalla?.name || ''}, ${ab.street?.name || ''}, ${ab.house}${ab.apartment ? `-${ab.apartment}` : ''}`,
        'Shartnoma raqami': ab.contractNumber,
        'Balans (UZS)': ab.balance,
        'Holati': ab.status
      }));

      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Abonentlar");
      writeFile(wb, `Abonentlar_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      message.success("Excel fayl muvaffaqiyatli yuklandi");
    } catch (error) {
      message.error("Eksport qilishda xatolik");
    }
  };

  const handleBulkArchive = async () => {
    if (!bulkArchiveReason.trim()) {
      message.error("Iltimos, sababni kiriting");
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/abonents/bulk-archive', {
        ids: selectedRowKeys,
        reason: bulkArchiveReason
      });
      message.success(`${selectedRowKeys.length} ta abonent arxivlandi`);
      setIsBulkArchiveVisible(false);
      setSelectedRowKeys([]);
      setBulkArchiveReason('');
      fetchAbonents(currentPage, search);
      fetchAuditLogs();
    } catch (e) {
      message.error("Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUnarchive = async () => {
    if (!bulkUnarchiveReason.trim()) {
      message.error("Iltimos, sababni kiriting");
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/abonents/bulk-unarchive', {
        ids: selectedRowKeys,
        reason: bulkUnarchiveReason
      });
      message.success(`${selectedRowKeys.length} ta abonent arxivdan chiqarildi`);
      setIsBulkUnarchiveVisible(false);
      setSelectedRowKeys([]);
      setBulkUnarchiveReason('');
      fetchAbonents(currentPage, search);
      fetchAuditLogs();
    } catch (e) {
      message.error("Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkReadings = async () => {
    const readingsPayload = data
      .filter(a => selectedRowKeys.includes(a.id) && bulkReadings[a.id] !== undefined && bulkReadings[a.id] !== null)
      .map(a => ({
        subscriberId: a.abonentNumber,
        reading: bulkReadings[a.id],
        date: bulkDate.format('YYYY-MM-DD')
      }));

    if (readingsPayload.length === 0) {
      message.error("Hech bo'lmasa bitta ko'rsatkich kiriting");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/meters/bulk-readings', { readings: readingsPayload });
      const results = response.data;
      const successes = Array.isArray(results) ? results.filter((r: any) => r.success) : [];
      const failures = Array.isArray(results) ? results.filter((r: any) => !r.success) : [];

      if (failures.length > 0) {
        message.warning(`${successes.length} ta saqlandi, ${failures.length} ta xatolik!`);
      } else {
        message.success("Ko'rsatkichlar muvaffaqiyatli saqlandi");
      }
      
      setIsBulkReadingsVisible(false);
      setSelectedRowKeys([]);
      setBulkReadings({});
      fetchAbonents(currentPage, search);
      fetchAuditLogs();
    } catch (e) {
      message.error("Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const auditColumns: ColumnsType<AuditItem> = [
    {
      title: "Vaqt / Sana",
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 125,
      render: (val: string) => (
        <div className="flex flex-col">
          <span className="font-extrabold text-slate-900 text-xs">{dayjs(val).format('HH:mm')}</span>
          <span className="text-[11px] font-semibold text-slate-400">{dayjs(val).format('DD.MM.YYYY')}</span>
        </div>
      )
    },
    {
      title: "Amal Turi",
      key: 'actionMeta',
      width: 165,
      render: (_: any, record: AuditItem) => {
        const meta = parseLogAction(record.actionType, record.description);
        const IconComponent = meta.icon;
        return (
          <Tag 
            color={meta.color} 
            className="rounded-lg font-bold text-xs px-2.5 py-1 flex items-center gap-1.5 w-max"
          >
            <IconComponent size={13} />
            <span>{meta.label}</span>
          </Tag>
        );
      }
    },
    {
      title: "Abonent Raqami",
      dataIndex: 'abonentNumber',
      key: 'abonentNumber',
      width: 145,
      render: (val: string, record: AuditItem) => {
        const num = val || record.abonentNumber;
        if (!num) {
          return <span className="text-slate-300 text-xs">—</span>;
        }
        return (
          <span 
            className="font-mono font-bold text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded text-xs tracking-wide inline-block cursor-pointer hover:bg-sky-100 transition-colors"
            onClick={() => {
              if (record.abonentId) navigate(`/app/abonents/${record.abonentId}`);
            }}
          >
            {num}
          </span>
        );
      }
    },
    {
      title: "F.I.Sh",
      dataIndex: 'fullName',
      key: 'fullName',
      width: 280,
      render: (val: string, record: AuditItem) => {
        const name = val || record.fullName;
        if (!name) {
          return (
            <span className="text-slate-400 text-xs italic block whitespace-normal leading-relaxed" title={record.description || "Umumiy tizim amali"}>
              {record.description || "Umumiy tizim amali"}
            </span>
          );
        }
        return (
          <span 
            className="font-semibold text-slate-900 text-xs hover:text-sky-600 transition-colors cursor-pointer block whitespace-normal break-words leading-relaxed"
            title={name}
            onClick={() => {
              if (record.abonentId) navigate(`/app/abonents/${record.abonentId}`);
            }}
          >
            {name}
          </span>
        );
      }
    },
    {
      title: "Telefon",
      dataIndex: 'phone',
      key: 'phone',
      width: 155,
      render: (val: string, record: AuditItem) => {
        const phone = val || record.phone;
        if (!phone) {
          return <span className="text-slate-300 text-xs">—</span>;
        }
        return (
          <span className="font-mono text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-medium inline-flex items-center gap-1.5">
            <Phone size={12} className="text-slate-400 shrink-0" />
            <span>{phone}</span>
          </span>
        );
      }
    },
    {
      title: "Mahalla",
      key: 'mahalla',
      width: 170,
      render: (_: any, record: AuditItem) => {
        const { mahalla } = parseAddressParts(record);
        if (!mahalla || mahalla === '—') {
          return <span className="text-slate-300 text-xs">—</span>;
        }
        return (
          <span className="font-semibold text-slate-800 text-xs bg-slate-100/80 px-2.5 py-0.5 rounded border border-slate-200/60 inline-block truncate max-w-[155px]" title={mahalla}>
            {mahalla}
          </span>
        );
      }
    },
    {
      title: "Ko'cha va Uy",
      key: 'street',
      render: (_: any, record: AuditItem) => {
        const { street } = parseAddressParts(record);
        if (!street || street === '—') {
          return <span className="text-slate-300 text-xs">—</span>;
        }
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span title={street} className="truncate">{street}</span>
          </div>
        );
      }
    },
    {
      title: "Amal",
      key: 'actions',
      width: 250,
      align: 'right',
      render: (_: any, record: AuditItem) => {
        const canOpenCard = Boolean(record.abonentId || record.abonentNumber);
        if (!canOpenCard) {
          return <span className="text-slate-300 text-xs">—</span>;
        }

        const isPending = record.status === 'PENDING' || (record.actionType === 'POST' && record.description?.includes("Yangi abonent") && record.status !== 'ACTIVE' && record.status !== 'ARCHIVED');

        return (
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {isPending && record.abonentId && (
              <>
                <Popconfirm
                  title="Abonentni tasdiqlaysizmi?"
                  description="Abonent tasdiqlanib, 'Faol' (ACTIVE) holatiga o'tkaziladi."
                  onConfirm={() => handleApprove(record.abonentId!)}
                  okText="Ha, tasdiqlash"
                  cancelText="Bekor qilish"
                >
                  <Button 
                    type="primary" 
                    size="small" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-md flex items-center gap-1 shadow-2xs h-7 px-2.5"
                  >
                    <Check size={12} />
                    <span>Tasdiqlash</span>
                  </Button>
                </Popconfirm>

                <Popconfirm
                  title="Abonentni rad etasizmi?"
                  description="Abonent rad etilib, arxivga o'tkaziladi."
                  onConfirm={() => handleDelete(record.abonentId!)}
                  okText="Ha, rad etish"
                  cancelText="Bekor qilish"
                  okButtonProps={{ danger: true }}
                >
                  <Button 
                    danger 
                    size="small" 
                    className="font-medium text-xs rounded-md flex items-center gap-1 h-7 px-2"
                  >
                    <X size={12} />
                    <span>Rad etish</span>
                  </Button>
                </Popconfirm>
              </>
            )}

            {record.status === 'ACTIVE' && (
              <Tag className="rounded font-semibold text-[11px] border-0 bg-emerald-50 text-emerald-700 m-0">
                Faol
              </Tag>
            )}

            {record.status === 'ARCHIVED' && (
              <Tag className="rounded font-medium text-[11px] border-0 bg-slate-100 text-slate-600 m-0">
                Arxivlangan
              </Tag>
            )}

            <Button 
              type="default" 
              size="small" 
              className="font-medium text-xs rounded-md flex items-center gap-1 border-slate-200 text-slate-700 hover:text-sky-600 hover:border-sky-300 shadow-2xs h-7 px-2.5"
              onClick={() => {
                if (record.abonentId) {
                  navigate(`/app/abonents/${record.abonentId}`);
                } else if (record.abonentNumber) {
                  setMainTab('ALL_ABONENTS');
                  setSearch(record.abonentNumber);
                  fetchAbonents(1, record.abonentNumber);
                }
              }}
            >
              <User size={12} />
              <span>Kartochka</span>
              <ArrowRight size={11} />
            </Button>
          </div>
        );
      }
    }
  ];

  const abonentColumns: ColumnsType<any> = [
    {
      title: "Hisob raqami",
      dataIndex: 'abonentNumber',
      key: 'abonentNumber',
      width: 120,
      render: (val: string) => (
        <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
          {val}
        </span>
      )
    },
    {
      title: "F.I.SH",
      dataIndex: 'fullName',
      key: 'fullName',
      render: (val: string, record: any) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
            {val?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <div 
              className="font-semibold text-slate-900 text-xs hover:text-sky-600 cursor-pointer transition-colors whitespace-normal break-words"
              onClick={() => navigate(`/app/abonents/${record.id}`)}
            >
              {val}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">{record.phone || 'Tel kiritilmagan'}</div>
          </div>
        </div>
      )
    },
    {
      title: "Manzil",
      key: 'address',
      render: (_: any, record: any) => (
        <div className="text-xs text-slate-600 max-w-[220px] truncate">
          <span className="font-medium text-slate-800">{record.mahalla?.name || ''}</span>
          {record.street?.name ? `, ${record.street.name}` : ''}
          {record.house ? ` ${record.house}-uy` : ''}
          {record.apartment ? ` ${record.apartment}-xonadon` : ''}
        </div>
      )
    },
    {
      title: "Ta'rif",
      dataIndex: 'tariff',
      key: 'tariff',
      width: 170,
      render: (val: any) => val ? (
        <span className={`rounded px-2 py-0.5 text-[11px] font-medium border ${
          val.type === 'METERED' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-700 border-slate-200'
        }`}>
          {val.category} ({val.type === 'METERED' ? 'Hisoblagich' : 'Normativ'})
        </span>
      ) : '-'
    },
    {
      title: "Balans (UZS)",
      dataIndex: 'balance',
      key: 'balance',
      width: 170,
      align: 'right',
      render: (val: number) => {
        const num = Number(val || 0);
        return (
          <span className={`font-mono tabular-nums text-xs font-bold ${
            num > 0 ? 'text-rose-600' : (num < 0 ? 'text-emerald-600' : 'text-slate-500')
          }`}>
            {Math.abs(num).toLocaleString()} UZS {num > 0 ? '(qarz)' : (num < 0 ? '(haqdor)' : '')}
          </span>
        );
      }
    },
    {
      title: "Holati",
      dataIndex: 'status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (val: string) => {
        if (val === 'ACTIVE') return <Tag className="rounded font-medium text-[11px] border-0 bg-emerald-50 text-emerald-700">Faol</Tag>;
        if (val === 'PENDING') return <Tag className="rounded font-medium text-[11px] border-0 bg-amber-50 text-amber-700">Kutilmoqda</Tag>;
        if (val === 'ARCHIVED') return <Tag className="rounded font-medium text-[11px] border-0 bg-slate-100 text-slate-600">Arxivlangan</Tag>;
        return <Tag className="rounded font-medium text-[11px] border-0 bg-rose-50 text-rose-700">{val}</Tag>;
      }
    },
    {
      title: "Amallar",
      key: 'actions',
      width: 140,
      align: 'right',
      render: (_: any, record: any) => (
        <div className="flex gap-1 justify-end items-center">
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="Abonentni tasdiqlash">
                <Popconfirm 
                  title="Abonentni tasdiqlaysizmi?" 
                  description="Abonent 'Faol' (ACTIVE) holatiga o'tkaziladi."
                  onConfirm={() => handleApprove(record.id)}
                  okText="Ha, tasdiqlash"
                  cancelText="Yo'q"
                >
                  <Button 
                    type="primary" 
                    size="small" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 h-7 rounded flex items-center gap-1"
                  >
                    <Check size={12} />
                    <span className="hidden sm:inline">Tasdiqlash</span>
                  </Button>
                </Popconfirm>
              </Tooltip>

              <Tooltip title="Abonentni rad etish">
                <Popconfirm 
                  title="Abonentni rad etasizmi?" 
                  description="Abonent rad etilib, arxivlanadi."
                  onConfirm={() => handleDelete(record.id)}
                  okText="Ha, rad etish"
                  cancelText="Yo'q"
                  okButtonProps={{ danger: true }}
                >
                  <Button 
                    danger 
                    size="small" 
                    className="text-xs px-2 h-7 rounded flex items-center gap-1"
                  >
                    <X size={12} />
                    <span className="hidden sm:inline">Rad etish</span>
                  </Button>
                </Popconfirm>
              </Tooltip>
            </>
          )}

          <Tooltip title="Abonent kartochkasiga o'tish">
            <Button 
              type="text" 
              size="small" 
              className="text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded p-1"
              icon={<Eye size={15} />} 
              onClick={() => navigate(`/app/abonents/${record.id}`)} 
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  const hasActiveSelected = data.some(a => selectedRowKeys.includes(a.id) && a.status !== 'ARCHIVED');
  const hasArchivedSelected = data.some(a => selectedRowKeys.includes(a.id) && a.status === 'ARCHIVED');

  return (
    <div className="w-full pb-10 space-y-5">
      
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Abonentlar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Abonentlar bazasi, hisob-kitoblar va kundalik amallar jurnali
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={() => {
              fetchAuditLogs();
              fetchAbonents(currentPage, search);
            }} 
            icon={<RefreshCw size={14} className={auditLoading || loading ? 'animate-spin' : ''} />} 
            className="text-xs font-semibold"
          >
            Yangilash
          </Button>
          <Button 
            onClick={handleExport}
            icon={<Download size={14} />} 
            className="text-xs font-semibold"
          >
            Baza Eksporti (Excel)
          </Button>
          <Button 
            type="primary"
            onClick={showModal}
            icon={<Plus size={15} />} 
            className="text-xs font-semibold"
          >
            Yangi Abonent Qo'shish
          </Button>
        </div>
      </div>

      {/* 2. 4 OPERATIONAL KPI TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Bugun Qo'shilganlar */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Bugun Qo'shildi</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <UserCheck size={15} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {kpis.addedToday} <span className="text-xs font-normal text-slate-500">ta</span>
            </div>
            <div className="mt-1.5 flex items-center text-xs text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
              <span>Yangi rasmiylashtirilgan</span>
            </div>
          </div>
        </div>

        {/* Card 2: Bugun Tahrirlanganlar */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Bugun Tahrirlandi</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
              <Edit3 size={15} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {kpis.editedToday} <span className="text-xs font-normal text-slate-500">ta</span>
            </div>
            <div className="mt-1.5 flex items-center text-xs text-slate-500">
              <span>Ma'lumotlar va statuslar</span>
            </div>
          </div>
        </div>

        {/* Card 3: Vodomer Almashganlar */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Vodomer Almashdi</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-50 text-sky-600">
              <Gauge size={15} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {kpis.meterReplacedToday} <span className="text-xs font-normal text-slate-500">ta</span>
            </div>
            <div className="mt-1.5 flex items-center text-xs text-slate-500">
              <span>Bugungi yangi o'rnatilganlar</span>
            </div>
          </div>
        </div>

        {/* Card 4: Jami Abonentlar */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Jami Baza</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Users size={15} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {kpis.totalAbonents.toLocaleString()} <span className="text-xs font-normal text-slate-500">ta</span>
            </div>
            <div className="mt-1.5 flex items-center text-xs text-slate-500">
              <span>Tumandagi umumiy abonentlar</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. PRIMARY NAVIGATION TABS */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
        <button
          onClick={() => setMainTab('AUDIT')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            mainTab === 'AUDIT'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <History size={14} />
          <span>Harakatlar jurnali</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
            mainTab === 'AUDIT' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600'
          }`}>
            {filteredAuditLogs.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('ALL_ABONENTS')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            mainTab === 'ALL_ABONENTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users size={14} />
          <span>Barcha abonentlar</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
            mainTab === 'ALL_ABONENTS' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600'
          }`}>
            {total}
          </span>
        </button>
      </div>

      {/* 4. TAB CONTENT: AUDIT LOGS OR SUBSCRIBERS TABLE */}
      {mainTab === 'AUDIT' ? (
        
        /* Audit Logs Table Card with Integrated Header Toolbar */
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
          
          {/* Integrated Compact Filter Toolbar */}
          <div className="p-3 border-b border-slate-200 bg-white flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            
            {/* Date Filters & Specific Calendar Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium text-slate-600 shrink-0">
                <button
                  onClick={() => {
                    setAuditDateFilter('today');
                    setSelectedSpecificDate(null);
                    fetchAuditLogs();
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    auditDateFilter === 'today' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bugun ({dayjs().format('DD.MM')})
                </button>
                <button
                  onClick={() => {
                    setAuditDateFilter('yesterday');
                    setSelectedSpecificDate(null);
                    fetchAuditLogs();
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    auditDateFilter === 'yesterday' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kecha
                </button>
                <button
                  onClick={() => {
                    setAuditDateFilter('week');
                    setSelectedSpecificDate(null);
                    fetchAuditLogs();
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    auditDateFilter === 'week' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  7 kun
                </button>
                <button
                  onClick={() => {
                    setAuditDateFilter('month');
                    setSelectedSpecificDate(null);
                    fetchAuditLogs();
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    auditDateFilter === 'month' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Shu oy
                </button>
                <button
                  onClick={() => {
                    setAuditDateFilter('all');
                    setSelectedSpecificDate(null);
                    fetchAuditLogs();
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    auditDateFilter === 'all' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Barchasi
                </button>
              </div>

              {/* Specific Calendar DatePicker */}
              <div className="flex items-center gap-1.5 shrink-0">
                <DatePicker
                  placeholder="Aniq sana..."
                  size="middle"
                  value={selectedSpecificDate}
                  onChange={(date) => {
                    if (date) {
                      setSelectedSpecificDate(date);
                      setAuditDateFilter('custom');
                      fetchAuditLogs(date);
                    } else {
                      setSelectedSpecificDate(null);
                      setAuditDateFilter('today');
                      fetchAuditLogs();
                    }
                  }}
                  format="DD.MM.YYYY"
                  allowClear
                  className="w-32 text-xs"
                />
                {auditDateFilter === 'custom' && selectedSpecificDate && (
                  <span className="text-[11px] text-sky-700 font-medium bg-sky-50 border border-sky-200 px-2 py-1 rounded flex items-center gap-1 shrink-0">
                    <Calendar size={12} className="text-sky-600" />
                    <span>{selectedSpecificDate.format('DD.MM.YYYY')}</span>
                    <span className="text-slate-400">
                      ({Math.abs(dayjs().startOf('day').diff(selectedSpecificDate.startOf('day'), 'day'))} kun oldin)
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Action Category Filter & Search (Inline) */}
            <div className="flex items-center gap-2 shrink-0">
              <Select
                size="middle"
                value={auditActionFilter}
                onChange={setAuditActionFilter}
                className="w-44 text-xs"
                options={[
                  { value: 'ALL', label: "Barcha harakatlar" },
                  { value: 'NEW', label: "Yangi qo'shilganlar" },
                  { value: 'EDIT', label: "Tahrirlanganlar" },
                  { value: 'METER', label: "Vodomer almashganlar" },
                  { value: 'READING', label: "Ko'rsatkich kiritildi" },
                  { value: 'ARCHIVE', label: "Arxivlanganlar" },
                ]}
              />

              <Input
                placeholder="Jurnaldan qidirish..."
                prefix={<Search size={14} className="text-slate-400 mr-1" />}
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                allowClear
                className="w-52 text-xs"
              />
            </div>

          </div>

          {/* Audit Logs Table */}
          <Table<AuditItem>
            columns={auditColumns}
            dataSource={filteredAuditLogs}
            rowKey="id"
            size="small"
            loading={{
              indicator: <Spin size="large" />,
              spinning: auditLoading
            }}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              pageSizeOptions: ['15', '30', '50'],
              className: "p-3"
            }}
            locale={{
              emptyText: (
                <div className="py-12 text-center">
                  <History size={40} className="text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-slate-600 font-semibold text-sm">Harakatlar jurnali bo'sh</p>
                  <p className="text-slate-400 text-xs mt-0.5">Tanlangan filtrlar bo'yicha hech qanday o'zgarish qayd etilmagan</p>
                </div>
              )
            }}
          />
        </div>

      ) : (

        /* Subscribers Table Card with Integrated Header Toolbar */
        <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">

          {/* Subscribers Search & Action Controls */}
          <div className="p-3 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
              <Input
                placeholder="F.I.SH, hisob raqami, ko'cha yoki pasport bo'yicha qidiring..."
                prefix={<Search size={16} className="text-slate-400 mr-1" />}
                onChange={handleSearchChange}
                value={search}
                allowClear
                size="middle"
                className="flex-1"
              />
              <Button 
                size="middle" 
                icon={<Filter size={15} />} 
                onClick={() => setIsFilterDrawerVisible(true)}
                className={`font-semibold text-xs ${
                  Object.values(filters).some(v => v !== undefined && v !== 'PHYSICAL') 
                    ? "border-sky-500 text-sky-600 bg-sky-50" 
                    : "border-slate-200 text-slate-700"
                }`}
              >
                Filtr
              </Button>
            </div>

            {selectedRowKeys.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Button 
                  onClick={() => setIsBulkReadingsVisible(true)} 
                  icon={<Gauge size={14} />} 
                  className="rounded-md border-sky-500 text-sky-600 font-semibold text-xs"
                >
                  Ko'rsatkich kiritish ({selectedRowKeys.length})
                </Button>
                {hasActiveSelected && (
                  <Button 
                    onClick={() => setIsBulkArchiveVisible(true)} 
                    danger 
                    icon={<Archive size={14} />}
                    className="rounded-md font-semibold text-xs"
                  >
                    Arxivlash ({selectedRowKeys.length})
                  </Button>
                )}
                {hasArchivedSelected && (
                  <Button 
                    onClick={() => setIsBulkUnarchiveVisible(true)} 
                    className="bg-emerald-600 text-white rounded-md font-semibold text-xs hover:bg-emerald-700"
                    icon={<Archive size={14} />}
                  >
                    Arxivdan chiqarish ({selectedRowKeys.length})
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Subscribers Table */}
          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            columns={abonentColumns}
            dataSource={data}
            rowKey="id"
            size="small"
            pagination={{ ...pagination, total, className: "p-3" }}
            onChange={handleTableChange}
            loading={loading}
          />

        </div>

      )}

      {/* 5. CREATION WIZARD MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-3 pb-2.5 border-b border-slate-100 pr-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold border border-sky-100 shrink-0">
              <UserPlus size={20} className="text-sky-600" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">Yangi Abonent Qo'shish</div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">Shartnoma, shaxsiy ma'lumotlar, manzil va hisoblagichni rasmiylashtirish</div>
            </div>
          </div>
        }
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={820}
        style={{ top: 20 }}
        styles={{
          body: {
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            paddingRight: 6
          }
        }}
        destroyOnClose
        className="modal-modern"
      >
        {/* Modern Step Indicator */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl mb-3.5 mt-1 border border-slate-200/80">
          <div 
            className={`flex-1 flex items-center gap-3 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              currentStep === 0 
                ? 'bg-white text-sky-950 shadow-xs border border-slate-200/90 font-bold' 
                : 'text-slate-500'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              currentStep === 0 ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
            }`}>
              1
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-800">Asosiy ma'lumotlar</div>
              <div className="text-[11px] font-normal text-slate-500">Shaxsiy, manzil va shartnoma</div>
            </div>
          </div>

          <div 
            className={`flex-1 flex items-center gap-3 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              currentStep === 1 
                ? 'bg-white text-sky-950 shadow-xs border border-slate-200/90 font-bold' 
                : isMetered ? 'text-slate-600' : 'text-slate-400 opacity-60'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              currentStep === 1 ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              2
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-800">Hisoblagich</div>
              <div className="text-[11px] font-normal text-slate-500">
                {isMetered ? "Majburiy (Hisoblagichli tarif)" : "Ixtiyoriy (Normativ tarif)"}
              </div>
            </div>
          </div>
        </div>

        <div className={currentStep === 0 ? 'block' : 'hidden'}>
          <Form 
            layout="vertical" 
            form={form} 
            onValuesChange={async (changed, allValues) => { 
              if(changed.mahallaId) { 
                setSelectedMahalla(changed.mahallaId); 
                form.setFieldsValue({streetId: undefined}); 
              }
              
              if (changed.contractDate || changed.tariffId || changed.familyMembers) {
                if (allValues.contractDate && allValues.tariffId) {
                   const tariff = tariffs.find(t => t.id === allValues.tariffId);
                   if (tariff && tariff.type === 'NORMATIVE') {
                      const dateObj = allValues.contractDate;
                      const now = dayjs();
                      if (dateObj.isBefore(now.startOf('month'))) {
                         setCheckingRetroactive(true);
                         try {
                           const preview = await previewRetroactiveBilling({
                             contractDate: dateObj.format('YYYY-MM-DD'),
                             tariffId: allValues.tariffId,
                             familyMembers: allValues.familyMembers || 1
                           });
                           if (preview.count > 0) {
                             setRetroactivePreview(preview);
                           } else {
                             setRetroactivePreview(null);
                           }
                         } catch (e) {
                           console.error(e);
                         } finally {
                           setCheckingRetroactive(false);
                         }
                      } else {
                         setRetroactivePreview(null);
                      }
                   } else {
                      setRetroactivePreview(null);
                   }
                }
              }
            }}
          >
            {/* Card 1: Shaxsiy ma'lumotlar */}
            <div className="bg-slate-50/50 rounded-xl p-3.5 border border-slate-200/80 mb-3">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/70">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <div className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center">
                    <User size={12} />
                  </div>
                  <span>Shaxsiy ma'lumotlar</span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal">* Majburiy maydonlar</span>
              </div>

              {/* Row 1: Familiya, Ism, Otasining ismi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Form.Item name="lastName" label={<span className="font-semibold text-xs text-slate-700">Familiyasi</span>} className="!mb-2.5" rules={[{ required: true, message: 'Familiyani kiriting' }]}>
                  <Input prefix={<User size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: Abdullayev" />
                </Form.Item>
                <Form.Item name="firstName" label={<span className="font-semibold text-xs text-slate-700">Ismi</span>} className="!mb-2.5" rules={[{ required: true, message: 'Ismni kiriting' }]}>
                  <Input prefix={<User size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: Abdulla" />
                </Form.Item>
                <Form.Item name="middleName" label={<span className="font-semibold text-xs text-slate-700">Otasining ismi</span>} className="!mb-2.5" rules={[{ required: true, message: 'Otasining ismini kiriting' }]}>
                  <Input prefix={<User size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: Vali o'g'li" />
                </Form.Item>
              </div>

              {/* Row 2: Phone, Passport, JSHSHIR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Form.Item name="phone" label={<span className="font-semibold text-xs text-slate-700">Telefon raqam</span>} className="!mb-2.5" normalize={(val) => val.replace(/\D/g, '')} rules={[{ required: true, message: 'Telefon raqam majburiy' }, { pattern: /^\d{9}$/, message: 'Telefon formati noto\'g\'ri' }]}>
                  <Input addonBefore="+998" prefix={<Phone size={14} className="text-slate-400 mr-1" />} placeholder="901234567" maxLength={9} />
                </Form.Item>
                <Form.Item name="passport" label={<span className="font-semibold text-xs text-slate-700">Pasport seriya / raqam</span>} className="!mb-2.5" normalize={(value) => (value || '').toUpperCase()} rules={[{ required: true, message: 'Pasport kiritish majburiy' }, { pattern: /^[A-Z]{2}\d{7}$/, message: 'Masalan: AA1234567' }]}>
                  <Input prefix={<CreditCard size={14} className="text-slate-400 mr-1" />} placeholder="AA1234567" maxLength={9} />
                </Form.Item>
                <Form.Item name="inn" label={<span className="font-semibold text-xs text-slate-700">JSHSHIR</span>} className="!mb-2.5" normalize={(val) => val.replace(/\D/g, '')} rules={[{ required: true, message: 'JSHSHIR kiritish majburiy' }, { pattern: /^\d{14}$/, message: '14 ta raqam bo\'lishi kerak' }]}>
                  <Input prefix={<Hash size={14} className="text-slate-400 mr-1" />} placeholder="12345678901234" maxLength={14} className="font-mono" />
                </Form.Item>
              </div>

              {/* Row 3: Birth Date, Family Members */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Form.Item name="birthDate" label={<span className="font-semibold text-xs text-slate-700">Tug'ilgan sana</span>} className="!mb-0">
                  <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="Sanani tanlang" />
                </Form.Item>
                <Form.Item name="familyMembers" label={<span className="font-semibold text-xs text-slate-700">Oila a'zolari soni</span>} className="!mb-0" initialValue={1} rules={[{ required: true }]}>
                  <InputNumber prefix={<Users size={14} className="text-slate-400 mr-1" />} min={1} className="w-full" />
                </Form.Item>
              </div>
            </div>

            {/* Card 2: Manzil ma'lumotlari */}
            <div className="bg-slate-50/50 rounded-xl p-3.5 border border-slate-200/80 mb-3">
              <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-200/70 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MapPin size={12} />
                </div>
                <span>Manzil ma'lumotlari</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Form.Item name="mahallaId" label={<span className="font-semibold text-xs text-slate-700">Mahalla</span>} className="!mb-2.5" rules={[{ required: true, message: 'Mahallani tanlang' }]}>
                  <Select placeholder="Mahallani tanlang" showSearch optionFilterProp="children">
                    {mahallas.map(m => <Option key={m.id} value={m.id}>{m.name}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="streetId" label={<span className="font-semibold text-xs text-slate-700">Ko'cha</span>} className="!mb-2.5" rules={[{ required: true, message: 'Ko\'chani tanlang' }]}>
                  <Select placeholder="Ko'chani tanlang" disabled={!selectedMahalla} showSearch optionFilterProp="children">
                    {streets.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                  </Select>
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Form.Item name="house" label={<span className="font-semibold text-xs text-slate-700">Uy raqami</span>} className="!mb-0" rules={[{ required: true, message: 'Uy raqamini kiriting' }]}>
                  <Input prefix={<Home size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: 45A" />
                </Form.Item>
                <Form.Item name="apartment" label={<span className="font-semibold text-xs text-slate-700">Xonadon (Kvartira)</span>} className="!mb-0">
                  <Input prefix={<Building size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: 12 (ixtiyoriy)" />
                </Form.Item>
              </div>
            </div>

            {/* Card 3: Shartnoma va Tarif */}
            <div className="bg-slate-50/50 rounded-xl p-3.5 border border-slate-200/80 mb-3">
              <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-slate-200/70 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FileText size={12} />
                </div>
                <span>Tarif va Shartnoma ma'lumotlari</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Form.Item name="tariffId" label={<span className="font-semibold text-xs text-slate-700">Tarif</span>} className="!mb-0" rules={[{ required: true, message: 'Tarifni tanlang' }]}>
                  <Select placeholder="Tarifni tanlang">
                    {tariffs.filter(t => !t.isArchived && (t.abonentType === 'PHYSICAL' || t.abonentType === 'BOTH')).map(t => (
                      <Option key={t.id} value={t.id}>
                        {t.category} ({t.type === 'METERED' ? 'Hisoblagichli' : 'Normativ'}) - {Number(t.price).toLocaleString()} UZS
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="contractNumber" label={<span className="font-semibold text-xs text-slate-700">Shartnoma raqami</span>} className="!mb-0" rules={[{ required: true, message: 'Shartnoma raqami majburiy' }]}>
                  <Input prefix={<FileText size={14} className="text-slate-400 mr-1" />} placeholder="SH-1001" className="font-mono" />
                </Form.Item>
                <Form.Item name="contractDate" label={<span className="font-semibold text-xs text-slate-700">Shartnoma sanasi</span>} className="!mb-0" rules={[{ required: true, message: 'Sanani tanlang' }]}>
                  <DatePicker 
                    className="w-full" 
                    format="YYYY-MM-DD" 
                    disabledDate={current => current && current > dayjs().endOf('day')}
                    placeholder="Shartnoma sanasi"
                  />
                </Form.Item>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              {checkingRetroactive && <div className="text-slate-500 text-xs flex items-center gap-1.5"><Spin size="small" /> Hisob-kitob tekshirilmoqda...</div>}
              {retroactivePreview && !checkingRetroactive && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 mb-0.5">Diqqat! Retroaktiv hisob-kitob</h4>
                    <p className="text-amber-800">Shartnoma sanasi o'tmishda bo'lganligi sababli, avtomatik ravishda <b>{retroactivePreview.count}</b> oy uchun jami <b>{retroactivePreview.amount.toLocaleString()} UZS</b> miqdorida hisob-faktura (qarz) yaratiladi.</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <Button onClick={handleCancel} className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4">
                  Bekor qilish
                </Button>
                {!isMetered ? (
                  <Button 
                    type="primary" 
                    className="font-semibold text-xs px-5 h-9 flex items-center gap-1.5" 
                    onClick={handleSubmit} 
                    loading={submitting}
                  >
                    <Check size={16} /> Saqlash va Yakunlash
                  </Button>
                ) : (
                  <Button 
                    type="primary"
                    className="font-semibold text-xs px-5 h-9 flex items-center gap-1.5"
                    onClick={nextStep}
                  >
                    Keyingi qadam (Hisoblagich) <ArrowRight size={15} />
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </div>

        <div className={currentStep === 1 ? 'block' : 'hidden'}>
          <div className="mb-4 p-4 bg-sky-50/80 rounded-xl border border-sky-200/70 text-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
              <Gauge size={18} />
            </div>
            <div>
              <span className="font-bold text-sky-950 block text-sm mb-0.5">Hisoblagich ma'lumotlari (Majburiy)</span>
              <p className="text-sky-800 leading-relaxed">
                Siz tanlagan tarif <strong>Hisoblagichli</strong> bo'lganligi sababli suv hisoblagichi parametrlarini ro'yxatdan o'tkazish talab etiladi.
              </p>
            </div>
          </div>

          <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/80 mb-4">
            <div className="flex items-center gap-2 pb-2.5 mb-3.5 border-b border-slate-200/70 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <div className="w-6 h-6 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center">
                <Gauge size={13} />
              </div>
              <span>Hisoblagich parametrlari</span>
            </div>

            <Form layout="vertical" form={meterForm}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <Form.Item name="number" label={<span className="font-semibold text-xs text-slate-700">Hisoblagich raqami</span>} rules={[{ required: true, message: 'Hisoblagich raqamini kiriting' }]}>
                  <Input prefix={<Hash size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: 12345678" className="font-mono" />
                </Form.Item>
                <Form.Item name="model" label={<span className="font-semibold text-xs text-slate-700">Modeli</span>}>
                  <Input prefix={<Gauge size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: Zenner, Baylan" />
                </Form.Item>
                <Form.Item name="certificateNumber" label={<span className="font-semibold text-xs text-slate-700">Sertifikat raqami</span>}>
                  <Input prefix={<FileText size={14} className="text-slate-400 mr-1" />} placeholder="Qiyoslash sertifikat №" />
                </Form.Item>
                <Form.Item name="installedAt" label={<span className="font-semibold text-xs text-slate-700">O'rnatilgan sana</span>} rules={[{ required: true, message: 'O\'rnatilgan sanani tanlang' }]}>
                  <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="Sanani tanlang" />
                </Form.Item>
                <Form.Item name="checkDate" label={<span className="font-semibold text-xs text-slate-700">Navbatdagi qiyoslash sanasi</span>} rules={[{ required: true, message: 'Qiyoslash sanasini tanlang' }]}>
                  <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="Sanani tanlang" />
                </Form.Item>
                <Form.Item name="initialReading" label={<span className="font-semibold text-xs text-slate-700">Boshlang'ich ko'rsatkich (m³)</span>}>
                  <InputNumber className="w-full" min={0} placeholder="0" />
                </Form.Item>
              </div>
            </Form>
          </div>

          <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
            <Button onClick={prevStep} className="font-semibold text-xs px-4 h-9">
              &larr; Orqaga
            </Button>
            <Button 
              type="primary" 
              className="font-semibold text-xs px-5 h-9 flex items-center gap-1.5" 
              onClick={handleSubmit} 
              loading={submitting}
            >
              <Check size={16} /> Saqlash va Yakunlash
            </Button>
          </div>
        </div>
      </Modal>

      {/* 6. BULK ARCHIVE MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-rose-600 font-bold pb-2 border-b border-slate-100">
            <Archive size={18} />
            <span>Ommaviy Arxivlash</span>
          </div>
        }
        open={isBulkArchiveVisible}
        onOk={handleBulkArchive}
        onCancel={() => setIsBulkArchiveVisible(false)}
        confirmLoading={submitting}
        okText="Arxivlash"
        okButtonProps={{ danger: true }}
      >
        <p className="my-3 text-slate-600 text-xs">Siz jami <strong className="text-slate-900">{selectedRowKeys.length}</strong> ta abonentni arxivga o'tkazmoqchisiz. Iltimos, sababni ko'rsating:</p>
        <Input.TextArea 
          rows={4} 
          placeholder="Arxivlash sababi (Audit jurnalida saqlanadi)..." 
          value={bulkArchiveReason}
          onChange={(e) => setBulkArchiveReason(e.target.value)}
          className="rounded-lg text-xs"
        />
      </Modal>

      {/* 7. BULK UNARCHIVE MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 font-bold pb-2 border-b border-slate-100">
            <RotateCcw size={18} />
            <span>Ommaviy Arxivdan Chiqarish</span>
          </div>
        }
        open={isBulkUnarchiveVisible}
        onOk={handleBulkUnarchive}
        onCancel={() => setIsBulkUnarchiveVisible(false)}
        confirmLoading={submitting}
        okText="Arxivdan chiqarish"
        okButtonProps={{ style: { backgroundColor: '#10b981', borderColor: '#10b981' } }}
      >
        <p className="my-3 text-slate-600 text-xs">Siz jami <strong className="text-slate-900">{selectedRowKeys.length}</strong> ta abonentni arxivdan chiqarmoqchisiz. Iltimos, sababni ko'rsating:</p>
        <Input.TextArea 
          rows={4} 
          placeholder="Arxivdan chiqarish sababi (Audit jurnalida saqlanadi)..." 
          value={bulkUnarchiveReason}
          onChange={(e) => setBulkUnarchiveReason(e.target.value)}
          className="rounded-lg text-xs"
        />
      </Modal>

      {/* 8. BULK READINGS MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-sky-600 font-bold pb-2 border-b border-slate-100">
            <Gauge size={18} />
            <span>Ommaviy Ko'rsatkich Kiritish</span>
          </div>
        }
        open={isBulkReadingsVisible}
        onOk={handleBulkReadings}
        onCancel={() => setIsBulkReadingsVisible(false)}
        confirmLoading={submitting}
        okText="Saqlash"
        width={700}
      >
        <div className="my-3 p-3 bg-slate-50 rounded-lg border border-slate-200/70">
          <label className="block mb-1.5 font-bold text-slate-700 text-xs uppercase tracking-wider">Barcha ko'rsatkichlar uchun umumiy sana:</label>
          <DatePicker 
            className="w-full rounded-md" 
            value={bulkDate} 
            onChange={(d) => d && setBulkDate(d)} 
            format="DD.MM.YYYY" 
            allowClear={false}
          />
        </div>
        <p className="mb-2 text-slate-600 text-xs font-semibold">Siz tanlagan abonentlar ro'yxati:</p>
        <div className="max-h-[50vh] overflow-y-auto border border-slate-200/80 rounded-lg">
          <Table 
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={data.filter(a => selectedRowKeys.includes(a.id))}
            columns={[
              { title: 'Abonent', dataIndex: 'fullName', key: 'fullName' },
              { title: 'Hisoblagich', key: 'meter', render: (_, r) => r.Meters && r.Meters.length > 0 ? r.Meters[0].number : <span className="text-slate-400">Yo'q (Normativ)</span> },
              { title: 'Oxirgi ko\'rsatkich', key: 'lastReading', render: (_, r) => r.Meters && r.Meters.length > 0 ? r.Meters[0].lastReading : '—' },
              { title: 'Yangi ko\'rsatkich', key: 'value', render: (_, r) => (
                r.Meters && r.Meters.length > 0 ? (
                  <InputNumber 
                    className="w-full rounded-md font-bold" 
                    min={r.Meters[0].lastReading || 0}
                    step={1}
                    onChange={(val: number | null) => val !== null && setBulkReadings(prev => ({...prev, [r.id]: val}))}
                  />
                ) : (
                  <span className="text-rose-500 font-medium text-xs">Hisoblagich kiritilmagan</span>
                )
              )}
            ]}
          />
        </div>
      </Modal>
    
      {/* 9. EXTENDED FILTERS DRAWER */}
      <Drawer
        title="Kengaytirilgan filtrlar"
        placement="right"
        onClose={() => setIsFilterDrawerVisible(false)}
        open={isFilterDrawerVisible}
        width={400}
        extra={
          <Button onClick={() => {
            setFilters({
              mahallaId: undefined,
              streetId: undefined,
              hasDebt: undefined,
              tariffType: undefined,
              status: undefined,
              debtDuration: undefined,
              type: 'PHYSICAL',
            });
            setIsFilterDrawerVisible(false);
          }}>
            Tozalash
          </Button>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Mahalla</label>
            <Select
              allowClear
              className="w-full rounded-xl"
              placeholder="Mahallani tanlang"
              value={filters.mahallaId}
              onChange={(v) => {
                setFilters(prev => ({...prev, mahallaId: v, streetId: undefined}));
                if(v) getStreets(v).then(setStreets);
                else setStreets([]);
              }}
            >
              {mahallas.map(m => <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>)}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Ko'cha</label>
            <Select
              allowClear
              className="w-full rounded-xl"
              placeholder="Ko'chani tanlang"
              value={filters.streetId}
              onChange={(v) => setFilters(prev => ({...prev, streetId: v}))}
              disabled={!filters.mahallaId}
            >
              {streets.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Qarzdorlik holati</label>
            <Select
              allowClear
              className="w-full rounded-xl"
              placeholder="Qarz holati"
              value={filters.hasDebt}
              onChange={(v) => setFilters(prev => ({...prev, hasDebt: v}))}
            >
              <Select.Option value="true">Qarzi borlar (&gt; 0 UZS)</Select.Option>
              <Select.Option value="false">Qarzi yo'qlar / Haqdorlar (&lt;= 0 UZS)</Select.Option>
            </Select>
          </div>

          {filters.hasDebt === 'true' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Qarzdorlik muddati</label>
              <Select
                allowClear
                className="w-full rounded-xl"
                placeholder="Necha oydan beri"
                value={filters.debtDuration}
                onChange={(v) => setFilters(prev => ({...prev, debtDuration: v}))}
              >
                <Select.Option value="1">1+ oy</Select.Option>
                <Select.Option value="2">2+ oy</Select.Option>
                <Select.Option value="3">3+ oy</Select.Option>
                <Select.Option value="6">6+ oy</Select.Option>
                <Select.Option value="12">12+ oy (1 yildan ko'p)</Select.Option>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tarif turi</label>
            <Select
              allowClear
              className="w-full rounded-xl"
              placeholder="Tarif turi"
              value={filters.tariffType}
              onChange={(v) => setFilters(prev => ({...prev, tariffType: v}))}
            >
              <Select.Option value="METERED">Hisoblagichli (METERED)</Select.Option>
              <Select.Option value="NORMATIVE">Normativ (NORMATIVE)</Select.Option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Holati</label>
            <Select
              allowClear
              className="w-full rounded-xl"
              placeholder="Abonent holati"
              value={filters.status}
              onChange={(v) => setFilters(prev => ({...prev, status: v}))}
            >
              <Select.Option value="ACTIVE">Faol (ACTIVE)</Select.Option>
              <Select.Option value="PENDING">Kutayotgan (PENDING)</Select.Option>
              <Select.Option value="SUSPENDED">Vaqtincha uzilgan (SUSPENDED)</Select.Option>
              <Select.Option value="DISCONNECTED">Uzilgan (DISCONNECTED)</Select.Option>
              <Select.Option value="ARCHIVED">Arxivlangan (ARCHIVED)</Select.Option>
            </Select>
          </div>
          
          <Button type="primary" className="w-full mt-4 font-semibold text-xs" onClick={() => setIsFilterDrawerVisible(false)}>
            Natijalarni ko'rish
          </Button>
        </div>
      </Drawer>
    </div>
  );
};

export default AbonentCard;
