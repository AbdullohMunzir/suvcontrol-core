import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Table, Button, Input, Modal, Form, Select, DatePicker, message, 
  Tabs, Upload, Popconfirm, InputNumber, Progress, Tag, Tooltip 
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  Plus, Search, Eye, Download, Check, Trash2, Building2, Building, 
  Hash, Phone, FileText, MapPin, Home, Gauge, ArrowRight, ArrowLeft, 
  CheckCircle2, CreditCard, Calculator, Printer, AlertTriangle, 
  Factory, Landmark, ShieldAlert, Droplets, SlidersHorizontal, RefreshCw
} from 'lucide-react';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash.debounce';
import { 
  getLegalEntities, createAbonent, updateAbonentStatus, deleteAbonent,
  calculateSanction, createSanctionAct, getAktSverka, setAbonentLimit
} from '../../services/abonentService';
import { getTariffs } from '../../services/tariffService';
import { getMahallas, getStreets } from '../../services/addressService';
import api from '../../services/api';
import dayjs from 'dayjs';
import { utils, writeFile, read } from 'xlsx';
import { useLanguage } from '../../contexts/LanguageContext';
import { exportToDidoxExcel } from '../../utils/didoxExport';
import { EFacturaViewer } from '../../components/documents/EFacturaViewer';
import { AktSverkaOfficial } from '../../components/documents/AktSverkaOfficial';
import { SanctionActOfficial } from '../../components/documents/SanctionActOfficial';
import { SpravkaRaschetOfficial } from '../../components/documents/SpravkaRaschetOfficial';
import { PretenziyaOfficial } from '../../components/documents/PretenziyaOfficial';
import { MeterReadingModal } from '../../components/documents/MeterReadingModal';
import { OrganizationProfileModal } from '../../components/OrganizationProfileModal';
import { AlertOctagon } from 'lucide-react';

const { Option } = Select;

// Standard pipe diameters in Uzbekistan municipal water networks
const COMMON_PIPE_DIAMETERS = [15, 20, 25, 32, 40, 50, 65, 80, 100, 150, 200];

const LegalEntities: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL'); // ALL, BUDGET, COMMERCIAL, INDUSTRIAL

  // Official Documents & Didox State
  const [eFacturaVisible, setEFacturaVisible] = useState(false);
  const [selectedAbonentForEFactura, setSelectedAbonentForEFactura] = useState<any>(null);

  const [isOrgProfileModalVisible, setIsOrgProfileModalVisible] = useState(false);
  const [tenantProfile, setTenantProfile] = useState<any>(null);

  const fetchTenantProfile = async () => {
    try {
      const res = await api.get('/tenant/profile');
      setTenantProfile(res.data);
    } catch (e) {
      console.error("Failed to load tenant profile", e);
    }
  };

  useEffect(() => {
    fetchTenantProfile();
  }, []);

  const [officialAktSverkaVisible, setOfficialAktSverkaVisible] = useState(false);
  const [selectedAbonentForAktOfficial, setSelectedAbonentForAktOfficial] = useState<any>(null);
  const [officialAktData, setOfficialAktData] = useState<any>(null);

  const [sanctionActDocVisible, setSanctionActDocVisible] = useState(false);
  const [spravkaModalVisible, setSpravkaModalVisible] = useState(false);
  const [selectedAbonentForSpravka, setSelectedAbonentForSpravka] = useState<any>(null);

  const [pretenziyaModalVisible, setPretenziyaModalVisible] = useState(false);
  const [selectedAbonentForPretenziya, setSelectedAbonentForPretenziya] = useState<any>(null);

  const [readingModalVisible, setReadingModalVisible] = useState(false);
  const [selectedAbonentForReading, setSelectedAbonentForReading] = useState<any>(null);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DEBTORS' | 'LIMIT_RISK' | 'ADVANCE'>('ALL');

  const openSpravkaRaschetModal = (abonent: any) => {
    setSelectedAbonentForSpravka(abonent);
    setSpravkaModalVisible(true);
  };

  const openPretenziyaModal = (abonent: any) => {
    setSelectedAbonentForPretenziya(abonent);
    setPretenziyaModalVisible(true);
  };

  const openReadingModal = (abonent: any) => {
    setSelectedAbonentForReading(abonent);
    setReadingModalVisible(true);
  };
  const [selectedActData, setSelectedActData] = useState<any>(null);
  const [selectedAbonentForSanctionDoc, setSelectedAbonentForSanctionDoc] = useState<any>(null);

  const [invoiceStatusMap, setInvoiceStatusMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('suvcontrol_b2b_ehf_status');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleToggleInvoiceStatus = (id: string) => {
    setInvoiceStatusMap(prev => {
      const current = prev[id] || 'DRAFT';
      const next = current === 'DRAFT' ? 'EXPORTED_DIDOX' : current === 'EXPORTED_DIDOX' ? 'SIGNED' : 'DRAFT';
      const updated = { ...prev, [id]: next };
      try {
        localStorage.setItem('suvcontrol_b2b_ehf_status', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDidoxBatchExport = () => {
    if (!data || data.length === 0) {
      message.warning("Eksport qilish uchun tashkilotlar mavjud emas");
      return;
    }

    try {
      exportToDidoxExcel(data, {
        name: "Suv Ta'minoti Korxonasi",
        inn: "200123456"
      });

      // Barcha eksport qilinganlarni Didoxga yuklandi qilib belgilash
      setInvoiceStatusMap(prev => {
        const updated = { ...prev };
        data.forEach(item => {
          if (!updated[item.id] || updated[item.id] === 'DRAFT') {
            updated[item.id] = 'EXPORTED_DIDOX';
          }
        });
        try {
          localStorage.setItem('suvcontrol_b2b_ehf_status', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      message.success("Didox va Soliq.uz uchun standart 17 ustunli Excel yuklandi! Buxgalter Didoxga kirib 'Import' tugmasi orqali ommaviy yuklashi mumkin.");
    } catch (e) {
      message.error("Excel eksportda xatolik yuz berdi");
    }
  };

  const openEFacturaModal = (abonent: any) => {
    setSelectedAbonentForEFactura(abonent);
    setEFacturaVisible(true);
  };

  const openAktSverkaOfficialModal = async (abonent: any) => {
    setSelectedAbonentForAktOfficial(abonent);
    try {
      const res = await getAktSverka(abonent.id, new Date().getFullYear());
      setOfficialAktData(res);
      setOfficialAktSverkaVisible(true);
    } catch {
      message.error("Akt-sverka ma'lumotlarini yuklashda xatolik");
    }
  };

  const openSanctionActDocModal = (abonent: any, act?: any) => {
    setSelectedAbonentForSanctionDoc(abonent);
    const targetAct = act || abonent.SanctionLogs?.[0] || {
      actNumber: `AKT-${dayjs().format('MMDD')}-001`,
      actDate: dayjs().format('YYYY-MM-DD'),
      pipeDiameterMm: abonent.ConnectionPoints?.[0]?.pipeDiameterMm || 25,
      durationHours: 24,
      assumedVelocityMps: 1.2,
      calculatedVolumeM3: 50.894,
      tariffPrice: abonent.tariff?.price || 5000,
      vatRate: 0.12,
      vatAmount: 30536.4,
      totalSanctionAmount: 285006.4,
      reason: "Qiyoslov muddati o'tganligi sababli"
    };
    setSelectedActData(targetAct);
    setSanctionActDocVisible(true);
  };
  
  // List & Stats State
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalLegal: 0,
    budgetCount: 0,
    commercialCount: 0,
    industrialCount: 0,
    debtorCount: 0,
    totalDebtUzs: 0,
    limitRiskCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const filteredData = React.useMemo(() => {
    if (statusFilter === 'DEBTORS') {
      return data.filter((d: any) => Number(d.balance || 0) > 0);
    }
    if (statusFilter === 'LIMIT_RISK') {
      return data.filter((d: any) => {
        const l = d.AbonentLimits?.[0];
        if (!l) return false;
        const pct = (Number(l.actualVolumeM3 || 0) / Number(l.volumeLimitM3 || 1)) * 100;
        return pct >= 80;
      });
    }
    if (statusFilter === 'ADVANCE') {
      return data.filter((d: any) => Number(d.balance || 0) < 0);
    }
    return data;
  }, [data, statusFilter]);
  
  // Bank Payments State
  const [bankData, setBankData] = useState<any[]>([]);
  const [bankLoading, setBankLoading] = useState(false);

  // Wizard Modal (Add B2B Abonent)
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const modalCategory = Form.useWatch('legalCategory', form) || 'COMMERCIAL';

  // Sanction Modal State
  const [sanctionModalVisible, setSanctionModalVisible] = useState(false);
  const [selectedAbonentForSanction, setSelectedAbonentForSanction] = useState<any>(null);
  const [sanctionForm] = Form.useForm();
  const [sanctionSubmitting, setSanctionSubmitting] = useState(false);
  const [sanctionCalcResult, setSanctionCalcResult] = useState<any>(null);

  // Akt-Sverka Modal State
  const [aktSverkaModalVisible, setAktSverkaModalVisible] = useState(false);
  const [selectedAbonentForAkt, setSelectedAbonentForAkt] = useState<any>(null);
  const [aktSverkaData, setAktSverkaData] = useState<any>(null);
  const [aktSverkaLoading, setAktSverkaLoading] = useState(false);
  const [aktYear, setAktYear] = useState<number>(new Date().getFullYear());

  // Limit Modal State
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [selectedAbonentForLimit, setSelectedAbonentForLimit] = useState<any>(null);
  const [limitForm] = Form.useForm();
  const [limitSubmitting, setLimitSubmitting] = useState(false);

  // References
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [mahallas, setMahallas] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [selectedMahalla, setSelectedMahalla] = useState<string | null>(null);

  const navigate = useNavigate();

  // ----- FETCH DATA -----
  const fetchAbonentsRef = useRef<(searchKeyword?: string, cat?: string) => Promise<void>>(null);

  const fetchAbonents = useCallback(async (searchKeyword = '', cat = selectedCategory) => {
    setLoading(true);
    try {
      const result = await getLegalEntities({ 
        page: 1, 
        limit: 1000, 
        search: searchKeyword,
        category: cat !== 'ALL' ? cat : undefined
      });
      setData(result.data || []);
      if (result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      message.error("Yuridik shaxslarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  fetchAbonentsRef.current = fetchAbonents;

  const debouncedSearchRef = useRef(
    debounce((value: string, cat: string) => {
      fetchAbonentsRef.current?.(value, cat);
    }, 400)
  );

  useEffect(() => {
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    debouncedSearchRef.current(val, selectedCategory);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    fetchAbonents(search, category);
  };

  const fetchDependencies = async () => {
    try {
      const [tariffRes, mahallaRes] = await Promise.all([getTariffs(), getMahallas()]);
      setTariffs(tariffRes || []);
      setMahallas(mahallaRes || []);
    } catch (error) {
      console.error('Dependencylar yuklanmadi', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchAbonents(search, selectedCategory);
      fetchDependencies();
    } else {
      fetchBankPayments();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedMahalla) {
      getStreets(selectedMahalla).then(setStreets);
    } else {
      setStreets([]);
    }
  }, [selectedMahalla]);

  // ----- EXPORT -----
  const handleExport = () => {
    try {
      const exportData = data.map((ab: any) => ({
        'Abonent №': ab.abonentNumber,
        'Tashkilot nomi': ab.fullName,
        'Toifasi': ab.legalCategory === 'BUDGET' ? 'Byudjet' : ab.legalCategory === 'INDUSTRIAL' ? 'Sanoat' : 'Tijorat',
        'STIR': ab.inn || '',
        'OKED': ab.oked || '',
        "G'aznachilik sh/x": ab.treasuryAccount || '',
        'Bank hisobvarag\'i': ab.bankAccount || '',
        'MFO': ab.mfo || '',
        'Telefon': ab.phone || '',
        'Manzil': `${ab.mahalla?.name || ''}, ${ab.street?.name || ''}, ${ab.house}${ab.apartment ? `-${ab.apartment}` : ''}`,
        'Shartnoma №': ab.contractNumber,
        'Balans (UZS)': ab.balance,
        'Oqova suv (Kanalizatsiya)': ab.hasSewage ? 'Bor' : 'Yo\'q',
        'Holati': ab.status
      }));

      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "B2B_Yuridik_shaxslar");
      writeFile(wb, `B2B_yuridik_shaxslar_${dayjs().format('YYYY-MM-DD')}.xlsx`);
      message.success("Excel hisobot yuklab olindi");
    } catch (error) {
      message.error("Eksport qilishda xatolik yuz berdi");
    }
  };

  // ----- 4-STEP WIZARD MODAL LOGIC -----
  const showModal = () => {
    setCurrentStep(0);
    form.resetFields();
    form.setFieldsValue({
      legalCategory: 'COMMERCIAL',
      vatPayer: false,
      hasSewage: false,
      advancePaymentPercent: 100,
      sewageRatio: 1.0,
      pdkCoefficient: 1.0,
      pipeDiameterMm: 25,
      waterPressureBar: 2.5
    });
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
      if (currentStep === 0) {
        await form.validateFields(['legalCategory', 'fullName', 'inn', 'phone']);
      } else if (currentStep === 1) {
        await form.validateFields(['contractNumber', 'contractDate', 'tariffId']);
      } else if (currentStep === 2) {
        await form.validateFields(['mahallaId', 'streetId', 'house', 'pipeDiameterMm']);
      }
      setCurrentStep(prev => prev + 1);
    } catch (err) {
      // Validation failed on current step
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(0, prev - 1));

  const handleWizardSubmit = async () => {
    try {
      if (isMetered) {
        await form.validateFields(['meterNumber', 'meterModel', 'meterInstalledAt', 'meterCheckDate']);
      }

      setSubmitting(true);
      const values = form.getFieldsValue();
      const rawPhone = String(values.phone || '').replace(/\D/g, '');
      const cleanPhone = rawPhone.startsWith('998') ? rawPhone.slice(3) : rawPhone;
      const finalPhone = cleanPhone ? '+998' + cleanPhone : undefined;

      const payload: any = {
        fullName: values.fullName,
        type: 'LEGAL',
        legalCategory: values.legalCategory || 'COMMERCIAL',
        inn: values.inn,
        oked: values.oked,
        vatPayer: !!values.vatPayer,
        vatRegCode: values.vatRegCode,
        treasuryAccount: values.treasuryAccount,
        budgetClassifier: values.budgetClassifier,
        phone: finalPhone,
        bankAccount: values.bankAccount,
        bankName: values.bankName,
        mfo: values.mfo,
        responsiblePerson: values.responsiblePerson,
        responsiblePhone: values.responsiblePhone,
        contractNumber: values.contractNumber,
        contractDate: values.contractDate ? dayjs(values.contractDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        tariffId: values.tariffId,
        advancePaymentPercent: values.advancePaymentPercent || 100,
        facilityName: values.facilityName || `${values.fullName} (Bosh bino)`,
        mahallaId: values.mahallaId,
        streetId: values.streetId,
        house: values.house,
        apartment: values.apartment,
        pipeDiameterMm: values.pipeDiameterMm ? Number(values.pipeDiameterMm) : 25,
        waterPressureBar: values.waterPressureBar ? Number(values.waterPressureBar) : 2.5,
        hasSewage: !!values.hasSewage,
        sewageRatio: values.sewageRatio ? Number(values.sewageRatio) : 1.0,
        pdkCoefficient: values.pdkCoefficient ? Number(values.pdkCoefficient) : 1.0,
        volumeLimitM3: values.volumeLimitM3 ? Number(values.volumeLimitM3) : undefined,
        amountLimitUzs: values.amountLimitUzs ? Number(values.amountLimitUzs) : undefined,
      };

      if (isMetered && values.meterNumber) {
        payload.meterDetails = {
          number: values.meterNumber,
          model: values.meterModel,
          certificateNumber: values.certificateNumber,
          initialReading: values.initialReading || 0,
          installedAt: values.meterInstalledAt ? dayjs(values.meterInstalledAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          checkDate: values.meterCheckDate ? dayjs(values.meterCheckDate).format('YYYY-MM-DD') : dayjs().add(4, 'year').format('YYYY-MM-DD'),
        };
      }

      await createAbonent(payload);
      message.success("Yangi yuridik shaxs (tashkilot) muvaffaqiyatli qo'shildi!");
      setIsModalVisible(false);
      fetchAbonents(search, selectedCategory);
    } catch (error: any) {
      message.error(error.response?.data?.message || "Tashkilot qo'shishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  // ----- SANCTION CALCULATOR LOGIC -----
  const openSanctionModal = (abonent?: any) => {
    setSelectedAbonentForSanction(abonent || null);
    sanctionForm.resetFields();
    
    const defaultDiameter = abonent?.ConnectionPoints?.[0]?.pipeDiameterMm || 25;
    const defaultTariffPrice = Number(abonent?.tariff?.price) || 5000;
    
    sanctionForm.setFieldsValue({
      abonentId: abonent?.id,
      pipeDiameterMm: defaultDiameter,
      durationHours: 24, // 1 kun
      assumedVelocityMps: 1.2,
      tariffPrice: defaultTariffPrice,
      actNumber: `AKT-${dayjs().format('MMDD')}-${Math.floor(Math.random() * 900 + 100)}`,
      actDate: dayjs(),
      reason: "Hisoblagich nosoz / tamg'a buzilgan holatda quvur o'tkazuvchanligi bo'yicha hisob-kitob"
    });

    handleLiveSanctionCalc(defaultDiameter, 24, 1.2, defaultTariffPrice);
    setSanctionModalVisible(true);
  };

  const handleLiveSanctionCalc = (diameter: number, hours: number, velocity: number, price: number) => {
    if (!diameter || !hours || !price) return;
    const dMeters = diameter / 1000;
    const v = velocity || 1.2;
    const area = Math.PI * Math.pow(dMeters / 2, 2);
    const durationSeconds = hours * 3600;
    const calculatedVolumeM3 = Number((area * v * durationSeconds).toFixed(3));
    const baseAmount = Number((calculatedVolumeM3 * price).toFixed(2));
    const vatRate = 0.12; // 12% alohida QQS
    const vatAmount = Number((baseAmount * vatRate).toFixed(2));
    const totalSanctionAmount = Number((baseAmount + vatAmount).toFixed(2));

    setSanctionCalcResult({
      crossSectionAreaM2: Number(area.toFixed(6)),
      calculatedVolumeM3,
      baseAmount,
      vatAmount,
      totalSanctionAmount
    });
  };

  const handleCreateSanction = async () => {
    try {
      const values = await sanctionForm.validateFields();
      setSanctionSubmitting(true);

      const targetAbonentId = values.abonentId || selectedAbonentForSanction?.id;
      if (!targetAbonentId) {
        message.error("Iltimos, sanksiya tuzish uchun tashkilotni tanlang");
        return;
      }

      await createSanctionAct({
        abonentId: targetAbonentId,
        actNumber: values.actNumber,
        actDate: values.actDate.format('YYYY-MM-DD'),
        reason: values.reason,
        pipeDiameterMm: Number(values.pipeDiameterMm),
        durationHours: Number(values.durationHours),
        assumedVelocityMps: Number(values.assumedVelocityMps || 1.2),
        tariffPrice: Number(values.tariffPrice),
        inspectorName: values.inspectorName
      });

      message.success(`Quvur sanksiyasi akti muvaffaqiyatli rasmiylashtirildi! Summa: ${sanctionCalcResult?.totalSanctionAmount?.toLocaleString()} UZS (12% QQS bilan)`);
      setSanctionModalVisible(false);
      fetchAbonents(search, selectedCategory);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Sanksiya rasmiylashtirishda xatolik");
    } finally {
      setSanctionSubmitting(false);
    }
  };

  // ----- AKT-SVERKA LOGIC -----
  const openAktSverkaModal = async (abonent: any) => {
    setSelectedAbonentForAkt(abonent);
    setAktYear(new Date().getFullYear());
    setAktSverkaModalVisible(true);
    fetchAktSverka(abonent.id, new Date().getFullYear());
  };

  const fetchAktSverka = async (abonentId: string, year: number) => {
    try {
      setAktSverkaLoading(true);
      const res = await getAktSverka(abonentId, year);
      setAktSverkaData(res);
    } catch (e) {
      message.error("Akt-sverka ma'lumotlarini yuklashda xatolik");
    } finally {
      setAktSverkaLoading(false);
    }
  };

  const handlePrintAktSverka = () => {
    window.print();
  };

  // ----- LIMIT MODAL LOGIC -----
  const openLimitModal = (abonent: any) => {
    setSelectedAbonentForLimit(abonent);
    const existingLimit = abonent.AbonentLimits?.[0];
    limitForm.setFieldsValue({
      year: existingLimit?.year || new Date().getFullYear(),
      volumeLimitM3: existingLimit?.volumeLimitM3 || 1000,
      amountLimitUzs: existingLimit?.amountLimitUzs || 5000000,
      warningThreshold: existingLimit?.warningThreshold || 80
    });
    setLimitModalVisible(true);
  };

  const handleSaveLimit = async () => {
    try {
      const values = await limitForm.validateFields();
      setLimitSubmitting(true);
      await setAbonentLimit(selectedAbonentForLimit.id, values);
      message.success("Tashkilot limiti muvaffaqiyatli saqlandi!");
      setLimitModalVisible(false);
      fetchAbonents(search, selectedCategory);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Limitni saqlashda xatolik");
    } finally {
      setLimitSubmitting(false);
    }
  };

  // ----- APPROVE & DELETE -----
  const handleApprove = async (id: string) => {
    try {
      await updateAbonentStatus(id, 'ACTIVE');
      message.success("Tashkilot tasdiqlandi va faollashtirildi");
      fetchAbonents(search, selectedCategory);
    } catch (error) {
      message.error("Tasdiqlashda xatolik");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAbonent(id);
      message.success("Tashkilot o'chirildi");
      fetchAbonents(search, selectedCategory);
    } catch (error) {
      message.error("O'chirishda xatolik");
    }
  };

  // ----- BANK PAYMENTS LOGIC -----
  const fetchBankPayments = async () => {
    try {
      setBankLoading(true);
      const res = await api.get('/payments/bank-payments');
      setBankData(res.data || []);
    } catch (e) {
      message.error("Bank to'lovlarini yuklashda xatolik");
    } finally {
      setBankLoading(false);
    }
  };

  const handleBankUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = e.target?.result;
        const workbook = read(result, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = utils.sheet_to_json(worksheet);

        const mappedData = json.map((row: any) => ({
          date: row['Sana'] || row['Date'] || new Date().toISOString(),
          payerName: row['Payer'] || row['Tulovchi'] || row['Tashkilot'] || '-',
          payerInn: row['INN'] || row['STIR'],
          amount: parseFloat(row['Amount'] || row['Summa'] || 0),
          comment: row['Comment'] || row['Izoh'] || ''
        }));

        await api.post('/payments/bank-payments/bulk', { data: mappedData });
        message.success("Fayl muvaffaqiyatli yuklandi");
        fetchBankPayments();
      } catch (err) {
        message.error("Faylni o'qishda xatolik. Ustun nomlari (Sana, Tulovchi, INN, Summa) to'g'riligini tekshiring.");
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const [assignPaymentModalVisible, setAssignPaymentModalVisible] = useState(false);
  const [assignPaymentRecord, setAssignPaymentRecord] = useState<any>(null);
  const [selectedAssignAbonentId, setSelectedAssignAbonentId] = useState<string | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const handleOpenAssignModal = (record: any) => {
    setAssignPaymentRecord(record);
    setSelectedAssignAbonentId(null);
    setAssignPaymentModalVisible(true);
  };

  const handleConfirmAssign = async () => {
    if (!assignPaymentRecord || !selectedAssignAbonentId) {
      message.error("Iltimos, biriktirish uchun tashkilotni tanlang");
      return;
    }
    setAssignSubmitting(true);
    try {
      await api.post(`/payments/bank-payments/${assignPaymentRecord.id}/confirm`, { abonentId: selectedAssignAbonentId });
      message.success("To'lov tashkilotga biriktirildi va tasdiqlandi");
      setAssignPaymentModalVisible(false);
      setAssignPaymentRecord(null);
      setSelectedAssignAbonentId(null);
      fetchBankPayments();
    } catch (e: any) {
      message.error(e.response?.data?.message || "To'lovni biriktirishda xatolik");
    } finally {
      setAssignSubmitting(false);
    }
  };

  // ----- TABLE COLUMNS -----
  const listColumns: ColumnsType<any> = [
    { 
      title: 'Abonent №', 
      dataIndex: 'abonentNumber', 
      key: 'abonentNumber', 
      width: 110,
      render: (val: string) => (
        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
          {val}
        </span>
      ) 
    },
    { 
      title: 'Tashkilot & Toifa', 
      key: 'org', 
      width: 240,
      render: (_: any, record: any) => {
        const cat = record.legalCategory || 'COMMERCIAL';
        let badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
        let badgeLabel = '🏢 Tijorat';
        if (cat === 'BUDGET') {
          badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
          badgeLabel = '🏛️ Byudjet';
        } else if (cat === 'INDUSTRIAL') {
          badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
          badgeLabel = '🏭 Sanoat';
        }

        return (
          <div className="space-y-1">
            <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
              {record.fullName}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                {badgeLabel}
              </span>
              {record.oked && (
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded" title="OKED kodi">
                  OKED: {record.oked}
                </span>
              )}
              {record.vatPayer && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                  QQS 12%
                </span>
              )}
            </div>
          </div>
        );
      } 
    },
    { 
      title: 'STIR / G\'azna', 
      key: 'requisites', 
      width: 150,
      render: (_: any, record: any) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-mono text-slate-700 font-medium">
            <span className="text-[10px] text-slate-400 font-sans mr-1">STIR:</span>
            {record.inn || '—'}
          </div>
          {record.treasuryAccount ? (
            <div className="font-mono text-[10px] text-purple-700 truncate max-w-[140px]" title={`G'azna sh/x: ${record.treasuryAccount}`}>
              G'azna: {record.treasuryAccount.slice(0, 10)}...
            </div>
          ) : record.bankAccount ? (
            <div className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]" title={`H/r: ${record.bankAccount}`}>
              H/r: {record.bankAccount.slice(0, 10)}...
            </div>
          ) : null}
        </div>
      ) 
    },
    { 
      title: 'Manzil & Quvur', 
      key: 'address', 
      width: 200,
      render: (_: any, record: any) => {
        const pipeMm = record.ConnectionPoints?.[0]?.pipeDiameterMm || record.pipeDiameterMm;
        return (
          <div className="space-y-1 text-xs">
            <div className="text-slate-600 line-clamp-1">
              {record.mahalla?.name || ''}{record.street?.name ? `, ${record.street.name}` : ''}{record.house ? `, ${record.house}` : ''}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {pipeMm && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                  <Gauge size={11} /> ⌀{pipeMm} mm
                </span>
              )}
              {record.hasSewage ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                  <Droplets size={10} /> Oqova
                </span>
              ) : null}
            </div>
          </div>
        );
      }
    },
    { 
      title: 'Limit / Avans', 
      key: 'limits', 
      width: 140,
      render: (_: any, record: any) => {
        if (record.legalCategory === 'BUDGET') {
          const limit = record.AbonentLimits?.[0];
          if (!limit) {
            return (
              <Button size="small" type="link" className="text-[11px] p-0 text-purple-600" onClick={() => openLimitModal(record)}>
                + Limit kiritish
              </Button>
            );
          }
          const volLimit = Number(limit.volumeLimitM3) || 1;
          const volActual = Number(limit.actualVolumeM3) || 0;
          const percent = Math.min(100, Math.round((volActual / volLimit) * 100));
          const isOver = percent >= 100;
          const isWarning = percent >= 80 && !isOver;

          return (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{volActual} m³</span>
                <span className="font-semibold text-slate-700">{volLimit} m³</span>
              </div>
              <Progress 
                percent={percent} 
                size="small" 
                status={isOver ? 'exception' : isWarning ? 'normal' : 'success'}
                strokeColor={isOver ? '#e11d48' : isWarning ? '#f59e0b' : '#10b981'}
                showInfo={false}
              />
              <div className="text-[10px] font-semibold text-right">
                {isOver && <span className="text-rose-600">Limitdan oshgan!</span>}
                {isWarning && <span className="text-amber-600">{percent}% (xavf)</span>}
                {!isOver && !isWarning && <span className="text-slate-500">{percent}%</span>}
              </div>
            </div>
          );
        }

        return (
          <div className="text-xs text-slate-600">
            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
              Avans: {record.advancePaymentPercent || 100}%
            </span>
          </div>
        );
      }
    },
    { 
      title: 'Balans', 
      dataIndex: 'balance', 
      key: 'balance', 
      align: 'right', 
      width: 140,
      render: (val: number) => {
        const num = Number(val || 0);
        const isDebt = num > 0;
        const isOverpaid = num < 0;
        return (
          <span className={`font-mono tabular-nums font-bold text-xs ${
            isDebt ? 'text-rose-600' : isOverpaid ? 'text-emerald-600' : 'text-slate-500'
          }`}>
            {Math.abs(num).toLocaleString()} UZS
            {isDebt && <span className="block text-[10px] font-normal text-rose-500">qarz</span>}
            {isOverpaid && <span className="block text-[10px] font-normal text-emerald-500">avans</span>}
          </span>
        );
      } 
    },
    {
      title: 'EHF Statusi',
      key: 'ehfStatus',
      width: 140,
      render: (_: any, record: any) => {
        const st = invoiceStatusMap[record.id] || 'DRAFT';
        return (
          <Tooltip title="Statusni o'zgartirish uchun bosing (Didox/Soliq nazorati)">
            <div 
              onClick={() => handleToggleInvoiceStatus(record.id)} 
              className="cursor-pointer inline-flex items-center"
            >
              {st === 'DRAFT' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200">
                  <FileText size={11} className="text-slate-500" />
                  Faktura tayyor
                </span>
              )}
              {st === 'EXPORTED_DIDOX' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  Didoxga yuklandi
                </span>
              )}
              {st === 'SIGNED' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  Tasdiqlandi (ERI)
                </span>
              )}
            </div>
          </Tooltip>
        );
      }
    },
    { 
      title: 'Holati', 
      dataIndex: 'status', 
      key: 'status', 
      width: 90,
      render: (val: string) => {
        if (val === 'ACTIVE') {
          return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Faol
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {val || 'Kutilmoqda'}
          </span>
        );
      } 
    },
    {
      title: 'Amallar',
      key: 'actions',
      align: 'right',
      width: 240,
      render: (_: any, record: any) => {
        const isBudget = record.legalCategory === 'BUDGET';
        const isDebtor = Number(record.balance || 0) > 0;

        return (
          <div className="flex gap-1 justify-end items-center flex-wrap">
            {record.status === 'PENDING' && (
              <>
                <Popconfirm title="Tashkilotni tasdiqlaysizmi?" onConfirm={() => handleApprove(record.id)}>
                  <Button type="primary" size="small" className="bg-emerald-600 hover:bg-emerald-700 text-xs px-1.5" icon={<Check size={12} />} />
                </Popconfirm>
                <Popconfirm title="Tashkilotni o'chirasizmi?" onConfirm={() => handleDelete(record.id)}>
                  <Button danger size="small" className="text-xs px-1.5" icon={<Trash2 size={12} />} />
                </Popconfirm>
              </>
            )}

            {/* 1. Ko'rsatkich kiritish */}
            <Tooltip title="Oylik hisoblagich ko'rsatkichi kiritish (12% QQS hisob-kitob)">
              <Button 
                size="small" 
                className="text-xs text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100 px-1.5 flex items-center gap-1"
                icon={<Gauge size={12} className="text-sky-600" />}
                onClick={() => openReadingModal(record)}
              />
            </Tooltip>

            {/* 2. EHF (Hisobvaraq-faktura) */}
            <Tooltip title="EHF (Hisobvaraq-faktura ko'rish va chop etish)">
              <Button 
                size="small" 
                className="text-xs text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 px-1.5 flex items-center gap-1"
                icon={<FileText size={12} className="text-indigo-600" />}
                onClick={() => openEFacturaModal(record)}
              />
            </Tooltip>

            {/* 3. Akt-sverka (Taqqoslama dalolatnoma) */}
            <Tooltip title="Rasmiy Akt-sverka (2 tomonlama taqqoslama dalolatnoma)">
              <Button 
                size="small" 
                className="text-xs text-slate-700 hover:text-slate-800 bg-slate-50 border-slate-200 px-1.5 flex items-center gap-1"
                icon={<Printer size={12} className="text-slate-600" />} 
                onClick={() => openAktSverkaOfficialModal(record)}
              />
            </Tooltip>

            {/* 4. Byudjet tashkilotlari uchun: G'aznachilik Spravka-raschet */}
            {isBudget && (
              <Tooltip title="G'aznachilik (UzASBO) uchun Spravka-raschet">
                <Button 
                  size="small" 
                  className="text-xs text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 px-1.5 flex items-center gap-1"
                  icon={<Landmark size={12} className="text-purple-600" />}
                  onClick={() => openSpravkaRaschetModal(record)}
                />
              </Tooltip>
            )}

            {/* 5. Qarzdorlar uchun: Pretenziya / Da'vo xati */}
            {isDebtor && (
              <Tooltip title="Sudgacha rasmiy talabnoma (Pretenziya va 0.1% penya hisobi)">
                <Button 
                  size="small" 
                  className="text-xs text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100 px-1.5 flex items-center gap-1"
                  icon={<ShieldAlert size={12} className="text-rose-600" />}
                  onClick={() => openPretenziyaModal(record)}
                />
              </Tooltip>
            )}

            {/* 6. Quvur sanksiyasi kalkulyatori */}
            <Tooltip title="Quvur o'tkazuvchanligi bo'yicha sanksiya hisoblash">
              <Button 
                size="small" 
                className="text-xs text-amber-700 hover:text-amber-800 bg-amber-50 border-amber-200 px-1.5 flex items-center gap-1"
                icon={<Calculator size={12} className="text-amber-600" />} 
                onClick={() => openSanctionModal(record)}
              />
            </Tooltip>

            {/* 7. Profilni ko'rish */}
            <Button 
              size="small" 
              className="text-xs font-medium text-slate-700 hover:text-sky-600 px-2 flex items-center gap-1"
              icon={<Eye size={12} />} 
              onClick={() => navigate(`/app/abonents/${record.id}`)}
            >
              Ko'rish
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Yuridik shaxslar (B2B Suv Billingi)</h1>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                O'zbekiston B2B
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Byudjet (G'aznachilik), tijorat va sanoat korxonalari, quvur sanksiyasi va limitlar monitoringi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button 
            icon={<Building2 size={14} className="text-sky-600" />} 
            onClick={() => setIsOrgProfileModalVisible(true)}
            className="font-semibold text-xs rounded-xl border-sky-300 bg-sky-50/70 hover:bg-sky-100 text-sky-900 flex items-center gap-1.5 shadow-xs"
          >
            Tashkilot rekvizitlari
          </Button>
          <Button 
            icon={<Calculator size={14} className="text-amber-600" />} 
            onClick={() => openSanctionModal()}
            className="font-semibold text-xs rounded-xl border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 text-amber-900 flex items-center gap-1.5"
          >
            Quvur sanksiyasi kalkulyatori
          </Button>
          <Button 
            icon={<Download size={14} className="text-emerald-600" />} 
            onClick={handleDidoxBatchExport} 
            className="font-semibold text-xs rounded-xl border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-xs"
          >
            Didox uchun Excel eksport (.xlsx)
          </Button>
          <Button 
            icon={<Download size={14} />} 
            onClick={handleExport} 
            className="font-medium text-xs rounded-xl"
          >
            Eksport
          </Button>
          <Button 
            type="primary" 
            icon={<Plus size={14} />} 
            onClick={showModal} 
            className="bg-sky-600 hover:bg-sky-700 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
          >
            Yangi tashkilot qo'shish
          </Button>
        </div>
      </div>

      {/* 2. TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Jami B2B */}
        <div 
          onClick={() => handleCategoryChange('ALL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedCategory === 'ALL' 
              ? 'bg-sky-50/50 border-sky-300 ring-2 ring-sky-500/20 shadow-xs' 
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500">Jami B2B korxonalar</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {stats.totalLegal || data.length}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Byudjet: <b className="text-purple-700">{stats.budgetCount}</b></span>
            <span>•</span>
            <span>Tijorat: <b className="text-sky-700">{stats.commercialCount}</b></span>
            <span>•</span>
            <span>Sanoat: <b className="text-amber-700">{stats.industrialCount}</b></span>
          </div>
        </div>

        {/* Card 2: Byudjet limit xatarlari */}
        <div 
          onClick={() => handleCategoryChange('BUDGET')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedCategory === 'BUDGET' 
              ? 'bg-purple-50/50 border-purple-300 ring-2 ring-purple-500/20 shadow-xs' 
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-purple-700">Byudjet Tashkilotlari</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Landmark size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-900">
            {stats.budgetCount} <span className="text-xs font-normal text-slate-400">ta</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-purple-100/70 text-[11px] text-purple-800">
            <AlertTriangle size={12} className="text-amber-600" />
            <span>G'aznachilik 27 xonali hisoblar</span>
          </div>
        </div>

        {/* Card 3: Sanoat & Kanalizatsiya */}
        <div 
          onClick={() => handleCategoryChange('INDUSTRIAL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedCategory === 'INDUSTRIAL' 
              ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs' 
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-amber-700">Sanoat & Oqova suv</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Factory size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900">
            {stats.industrialCount} <span className="text-xs font-normal text-slate-400">ta</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-amber-100/70 text-[11px] text-amber-800">
            <Droplets size={12} className="text-teal-600" />
            <span>Oqova va ПДК koeffitsiyenti</span>
          </div>
        </div>

        {/* Card 4: Qarz & Balans */}
        <div className="p-4 rounded-xl border bg-white border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500">Jami B2B Qarzdorlik</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">
            {stats.totalDebtUzs ? (stats.totalDebtUzs / 1000000).toFixed(1) : '0'} <span className="text-xs font-normal text-slate-400">mln UZS</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Qarzdor tashkilotlar: <b className="text-rose-600 font-mono">{stats.debtorCount}</b> ta</span>
          </div>
        </div>
      </div>

      {/* 3. TABS CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          className="px-5 pt-3"
          tabBarStyle={{ marginBottom: 16 }}
          items={[
            {
              key: 'list',
              label: (
                <span className="font-semibold text-xs px-2 flex items-center gap-1.5">
                  <Building2 size={14} /> Tashkilotlar reyestri
                </span>
              ),
              children: (
                <div className="space-y-4 pb-5">
                  {/* Category Pills, Quick Status Filter & Search */}
                  <div className="space-y-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-3">
                      <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
                        <Button 
                          size="small" 
                          type={selectedCategory === 'ALL' ? 'primary' : 'default'}
                          onClick={() => handleCategoryChange('ALL')}
                          className={`text-xs rounded-lg font-medium ${selectedCategory === 'ALL' ? 'bg-slate-900' : ''}`}
                        >
                          Barchasi ({stats.totalLegal || data.length})
                        </Button>
                        <Button 
                          size="small" 
                          type={selectedCategory === 'BUDGET' ? 'primary' : 'default'}
                          onClick={() => handleCategoryChange('BUDGET')}
                          className={`text-xs rounded-lg font-medium ${selectedCategory === 'BUDGET' ? 'bg-purple-600 border-purple-600' : 'text-purple-700'}`}
                        >
                          🏛️ Byudjet ({stats.budgetCount})
                        </Button>
                        <Button 
                          size="small" 
                          type={selectedCategory === 'COMMERCIAL' ? 'primary' : 'default'}
                          onClick={() => handleCategoryChange('COMMERCIAL')}
                          className={`text-xs rounded-lg font-medium ${selectedCategory === 'COMMERCIAL' ? 'bg-sky-600 border-sky-600' : 'text-sky-700'}`}
                        >
                          🏢 Tijorat ({stats.commercialCount})
                        </Button>
                        <Button 
                          size="small" 
                          type={selectedCategory === 'INDUSTRIAL' ? 'primary' : 'default'}
                          onClick={() => handleCategoryChange('INDUSTRIAL')}
                          className={`text-xs rounded-lg font-medium ${selectedCategory === 'INDUSTRIAL' ? 'bg-amber-600 border-amber-600' : 'text-amber-700'}`}
                        >
                          🏭 Sanoat ({stats.industrialCount})
                        </Button>
                      </div>

                      <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
                        <Input.Search
                          placeholder="Nomi, STIR, G'azna sh/x yoki telefon..."
                          allowClear
                          enterButton={<Search size={14} />}
                          onChange={handleSearchChange}
                          onSearch={(value) => {
                            debouncedSearchRef.current.cancel();
                            setSearch(value);
                            fetchAbonents(value, selectedCategory);
                          }}
                          className="max-w-xs w-full"
                          size="middle"
                        />
                        <Button 
                          icon={<RefreshCw size={13} />} 
                          onClick={() => fetchAbonents(search, selectedCategory)}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    {/* Secondary Quick Status Filter (Qarzdorlar, Limit xavfi, Avans) */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-500 mr-1">Tezkor filter:</span>
                      <button 
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                      >
                        Barchasi ({data.length})
                      </button>
                      <button 
                        type="button"
                        onClick={() => setStatusFilter('DEBTORS')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${statusFilter === 'DEBTORS' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'}`}
                      >
                        <AlertTriangle size={12} /> Faqat qarzdorlar ({data.filter((d: any) => Number(d.balance || 0) > 0).length})
                      </button>
                      <button 
                        type="button"
                        onClick={() => setStatusFilter('LIMIT_RISK')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${statusFilter === 'LIMIT_RISK' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'}`}
                      >
                        <AlertOctagon size={12} /> Limit xavfidagilar (≥80%) ({data.filter((d: any) => { const l = d.AbonentLimits?.[0]; if (!l) return false; return (Number(l.actualVolumeM3 || 0) / Number(l.volumeLimitM3 || 1)) >= 0.8; }).length})
                      </button>
                      <button 
                        type="button"
                        onClick={() => setStatusFilter('ADVANCE')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${statusFilter === 'ADVANCE' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                      >
                        <CheckCircle2 size={12} /> Avansdagilar ({data.filter((d: any) => Number(d.balance || 0) < 0).length})
                      </button>
                    </div>
                  </div>

                  <Table
                    columns={listColumns}
                    dataSource={filteredData}
                    rowKey="id"
                    pagination={{ pageSize: 25, showSizeChanger: true }}
                    loading={loading}
                    size="small"
                    className="border border-slate-100 rounded-xl"
                    rowClassName="hover:bg-slate-50/70 transition-colors"
                    locale={{
                      emptyText: (
                        <div className="py-12 flex flex-col items-center justify-center">
                          <Building2 className="w-10 h-10 text-slate-300 mb-2" />
                          <h3 className="text-sm font-semibold text-slate-800 mb-1">Tashkilotlar topilmadi</h3>
                          <p className="text-xs text-slate-500 max-w-sm text-center">
                            Tanlangan toifa bo'yicha yuridik shaxslar mavjud emas yoki qidiruvingiz natija bermadi.
                          </p>
                        </div>
                      )
                    }}
                  />
                </div>
              )
            },
            {
              key: 'bank',
              label: (
                <span className="font-semibold text-xs px-2 flex items-center gap-1.5">
                  <CreditCard size={14} /> Bank to'lovlari (Excel reyestr)
                </span>
              ),
              children: (
                <div className="space-y-4 pb-5">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Bank to'lovlari reyestri</h3>
                      <p className="text-xs text-slate-500">Bank kliring tizimidan olingan to'lovlar reyestrini (Excel) yuklang va avtomatlashtirilgan tarzda STIR bo'yicha biriktiring.</p>
                    </div>
                    <Upload accept=".xlsx, .xls" beforeUpload={handleBankUpload} showUploadList={false}>
                      <Button type="primary" icon={<UploadOutlined />} className="bg-emerald-600 hover:bg-emerald-700 font-medium text-xs rounded-lg">
                        Excel fayl yuklash
                      </Button>
                    </Upload>
                  </div>
                  <Table 
                    dataSource={bankData} 
                    columns={[
                      { 
                        title: 'Sana', 
                        dataIndex: 'date', 
                        width: 110,
                        render: (val: string) => <span className="font-mono text-slate-600 text-xs">{dayjs(val).format('DD.MM.YYYY')}</span> 
                      },
                      { 
                        title: "To'lovchi tashkilot", 
                        dataIndex: 'payerName',
                        render: (val: string) => <span className="font-semibold text-slate-800 text-xs">{val}</span>
                      },
                      { 
                        title: 'STIR', 
                        dataIndex: 'payerInn', 
                        width: 110,
                        render: (val: string) => <span className="font-mono text-slate-600 text-xs">{val || '—'}</span>
                      },
                      { 
                        title: 'Summa', 
                        dataIndex: 'amount', 
                        width: 140,
                        render: (val: number) => <span className="font-mono tabular-nums font-bold text-slate-900 text-xs">{Number(val).toLocaleString()} UZS</span>
                      },
                      { 
                        title: 'Izoh', 
                        dataIndex: 'comment',
                        render: (val: string) => <span className="text-slate-500 text-xs max-w-[220px] truncate block" title={val}>{val || '—'}</span>
                      },
                      { 
                        title: 'Topilgan abonent', 
                        key: 'suggested',
                        render: (_: any, record: any) => (
                          record.suggestedAbonent 
                            ? <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {record.suggestedAbonent.fullName}
                              </span>
                            : <span className="text-slate-400 text-xs">Topilmadi</span>
                        )
                      },
                      {
                        title: 'Amallar',
                        key: 'action',
                        width: 110,
                        render: (_: any, record: any) => (
                          record.suggestedAbonent ? (
                            <Popconfirm 
                              title="Ushbu to'lovni tasdiqlaysizmi?" 
                              onConfirm={() => {
                                api.post(`/payments/bank-payments/${record.id}/confirm`, { abonentId: record.suggestedAbonent.id })
                                  .then(() => {
                                    message.success("To'lov tasdiqlandi");
                                    fetchBankPayments();
                                  });
                              }}
                            >
                              <Button type="primary" size="small" className="text-xs font-medium bg-emerald-600 hover:bg-emerald-700">Tasdiqlash</Button>
                            </Popconfirm>
                          ) : (
                            <Button size="small" type="default" className="text-xs font-medium" onClick={() => handleOpenAssignModal(record)}>
                              Biriktirish
                            </Button>
                          )
                        )
                      }
                    ]} 
                    rowKey="id" 
                    loading={bankLoading} 
                    pagination={false}
                    size="small" 
                    className="border border-slate-100 rounded-xl"
                  />
                </div>
              )
            }
          ]}
        />
      </div>

      {/* 4. MODAL 1: 4-STEP WIZARD (YANGI TASHKILOT QO'SHISH) */}
      <Modal
        title={
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 pr-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold border border-sky-100 shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">Yangi B2B Tashkilot Qo'shish</div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">Byudjet, tijorat va sanoat korxonalari uchun 4-bosqichli rasmiylashtirish</div>
            </div>
          </div>
        }
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={840}
        style={{ top: 20 }}
        destroyOnClose
        className="modal-modern"
      >
        {/* Wizard Steps Header */}
        <div className="grid grid-cols-4 gap-2 p-1.5 bg-slate-50 rounded-xl mb-4 border border-slate-200/80">
          {[
            { step: 0, title: "1. Yuridik & Toifa", desc: "Toifa, STIR, Rekvizit" },
            { step: 1, title: "2. Shartnoma & Limit", desc: "Tarif, Avans, Limit" },
            { step: 2, title: "3. Obyekt & Quvur", desc: "Diametr mm, Oqova" },
            { step: 3, title: "4. Hisoblagich", desc: isMetered ? "Seriya, Poverka" : "Normativ tarif" },
          ].map(item => (
            <div 
              key={item.step}
              onClick={() => {
                if (item.step < currentStep) setCurrentStep(item.step);
              }}
              className={`p-2 rounded-lg text-xs transition-all ${
                currentStep === item.step 
                  ? 'bg-white text-sky-950 shadow-xs border border-slate-200/90 font-bold' 
                  : item.step < currentStep 
                    ? 'text-emerald-700 bg-emerald-50/50 cursor-pointer font-medium' 
                    : 'text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep === item.step ? 'bg-sky-600 text-white' : item.step < currentStep ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {item.step + 1}
                </span>
                <span className="truncate">{item.title}</span>
              </div>
            </div>
          ))}
        </div>

        <Form 
          layout="vertical" 
          form={form} 
          onValuesChange={(changed) => { 
            if (changed.mahallaId) { 
              setSelectedMahalla(changed.mahallaId); 
              form.setFieldsValue({ streetId: undefined }); 
            }
          }}
        >
          {/* STEP 0: YURIDIK MA'LUMOTLAR & TOIFA */}
          <div className={currentStep === 0 ? 'block' : 'hidden'}>
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/80 mb-3 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Tashkilot Toifasini Tanlang:
                </label>
                <Form.Item name="legalCategory" className="!mb-3" rules={[{ required: true }]}>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'BUDGET', title: '🏛️ Byudjet Tashkiloti', desc: 'Maktab, bog\'cha, shifoxona, davlat idorasi (G\'aznachilik sh/x)' },
                      { key: 'COMMERCIAL', title: '🏢 Tijorat Tashkiloti', desc: 'Ofis, savdo markazi, xizmat ko\'rsatish (Avans to\'lovi)' },
                      { key: 'INDUSTRIAL', title: '🏭 Sanoat / Ishlab chiqarish', desc: 'Zavod, fabrika, avtomoyka (Kanalizatsiya, ПДК koeffitsiyenti)' },
                    ].map(card => {
                      const isSelected = modalCategory === card.key;
                      return (
                        <div 
                          key={card.key}
                          onClick={() => form.setFieldsValue({ legalCategory: card.key })}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className={`font-bold text-xs ${isSelected ? 'text-sky-950' : 'text-slate-800'}`}>
                            {card.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                            {card.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Form.Item 
                  name="fullName" 
                  label={<span className="font-semibold text-xs text-slate-700">Tashkilot to'liq nomi</span>} 
                  className="!mb-2.5" 
                  rules={[{ required: true, message: 'Tashkilot nomini kiriting' }]}
                >
                  <Input prefix={<Building2 size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: 'Oq Suv Invest' MChJ yoki 14-Maktab" />
                </Form.Item>
                <Form.Item 
                  name="inn" 
                  label={<span className="font-semibold text-xs text-slate-700">STIR (INN - 9 ta raqam)</span>} 
                  className="!mb-2.5" 
                  normalize={(val) => (val || '').replace(/\D/g, '')}
                  rules={[
                    { required: true, message: 'STIR raqamini kiriting' }, 
                    { len: 9, message: 'STIR 9 ta raqam bo\'lishi kerak' }
                  ]}
                >
                  <Input prefix={<Hash size={14} className="text-slate-400 mr-1" />} placeholder="123456789" maxLength={9} className="font-mono" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Form.Item 
                  name="phone" 
                  label={<span className="font-semibold text-xs text-slate-700">Telefon raqam</span>} 
                  className="!mb-2.5" 
                  normalize={(val) => (val || '').replace(/\D/g, '')}
                  rules={[
                    { required: true, message: 'Telefon raqam majburiy' }, 
                    { pattern: /^\d{9}$/, message: '9 ta raqam kiriting' }
                  ]}
                >
                  <Input addonBefore="+998" prefix={<Phone size={14} className="text-slate-400 mr-1" />} placeholder="901234567" maxLength={9} />
                </Form.Item>
                <Form.Item 
                  name="oked" 
                  label={<span className="font-semibold text-xs text-slate-700">OKED kodi (ixtiyoriy)</span>} 
                  className="!mb-2.5"
                >
                  <Input placeholder="Masalan: 85.14" className="font-mono" />
                </Form.Item>
                <Form.Item 
                  name="vatPayer" 
                  label={<span className="font-semibold text-xs text-slate-700">QQS to'lovchisi (12%)</span>} 
                  className="!mb-2.5"
                >
                  <Select placeholder="Tanlang">
                    <Option value={true}>Ha (12% QQS hisoblanadi)</Option>
                    <Option value={false}>Yo'q (QQSsiz)</Option>
                  </Select>
                </Form.Item>
              </div>

              {/* Byudjet tashkiloti uchun maxsus: G'aznachilik 27 xonali hisobi */}
              {modalCategory === 'BUDGET' ? (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Landmark size={14} /> G'aznachilik Rekvizitlari (UzASBO / G'azna):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Form.Item 
                      name="treasuryAccount" 
                      label={<span className="font-semibold text-xs text-purple-900">G'aznachilik 27 xonali sh/x</span>} 
                      className="!mb-0"
                      rules={[{ required: true, message: "G'aznachilik 27 xonali shaxsiy hisobvarag'i majburiy" }]}
                    >
                      <Input placeholder="234020003001000010100000000" maxLength={27} className="font-mono" />
                    </Form.Item>
                    <Form.Item 
                      name="budgetClassifier" 
                      label={<span className="font-semibold text-xs text-purple-900">Xarajatlar iqtisodiy tasnifi</span>} 
                      className="!mb-0"
                    >
                      <Input placeholder="Masalan: 42 12 100 (Kommunal xizmatlar)" />
                    </Form.Item>
                  </div>
                </div>
              ) : (
                /* Tijorat va Sanoat uchun: Bank hisobvarag'i & MFO */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Form.Item name="bankAccount" label={<span className="font-semibold text-xs text-slate-700">Bank hisob raqami (20 xonali)</span>} className="!mb-0">
                    <Input placeholder="20208000..." maxLength={20} className="font-mono" />
                  </Form.Item>
                  <Form.Item name="mfo" label={<span className="font-semibold text-xs text-slate-700">Bank MFO (5 xonali)</span>} className="!mb-0">
                    <Input placeholder="00440" maxLength={5} className="font-mono" />
                  </Form.Item>
                  <Form.Item name="bankName" label={<span className="font-semibold text-xs text-slate-700">Bank nomi</span>} className="!mb-0">
                    <Input placeholder="Masalan: O'zsanoatqurilishbank" />
                  </Form.Item>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button onClick={handleCancel}>Bekor qilish</Button>
              <Button type="primary" onClick={nextStep} icon={<ArrowRight size={14} />} className="flex items-center gap-1.5">
                Keyingi qadam: Shartnoma
              </Button>
            </div>
          </div>

          {/* STEP 1: SHARTNOMA & LIMITLAR/AVANS */}
          <div className={currentStep === 1 ? 'block' : 'hidden'}>
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/80 mb-3 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200/70">
                Shartnoma va Tarif Parametrlari
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Form.Item 
                  name="contractNumber" 
                  label={<span className="font-semibold text-xs text-slate-700">Shartnoma raqami</span>} 
                  className="!mb-2.5" 
                  rules={[{ required: true, message: 'Shartnoma raqami majburiy' }]}
                >
                  <Input prefix={<FileText size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: SH-2026/04" />
                </Form.Item>
                <Form.Item 
                  name="contractDate" 
                  label={<span className="font-semibold text-xs text-slate-700">Shartnoma sanasi</span>} 
                  className="!mb-2.5" 
                  rules={[{ required: true, message: 'Sanani tanlang' }]}
                >
                  <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="Sanani tanlang" />
                </Form.Item>
                <Form.Item 
                  name="tariffId" 
                  label={<span className="font-semibold text-xs text-slate-700">Tarif</span>} 
                  className="!mb-2.5" 
                  rules={[{ required: true, message: 'Tarifni tanlang' }]}
                >
                  <Select placeholder="Tarifni tanlang">
                    {tariffs.filter(t => !t.isArchived && (t.abonentType === 'LEGAL' || t.abonentType === 'BOTH')).map(t => (
                      <Option key={t.id} value={t.id}>
                        {t.category} ({t.type === 'METERED' ? 'Hisoblagichli' : 'Normativ'}) — {Number(t.price).toLocaleString()} UZS
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              {/* Byudjet tashkiloti uchun: Yillik Limitlar */}
              {modalCategory === 'BUDGET' && (
                <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <ShieldAlert size={14} /> G'aznachilik Limitlari (m³ va so'mda):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Form.Item 
                      name="volumeLimitM3" 
                      label={<span className="font-semibold text-xs text-purple-900">Yillik suv hajmi limiti (m³)</span>} 
                      className="!mb-0"
                    >
                      <InputNumber className="w-full" min={0} placeholder="Masalan: 1200 m³" />
                    </Form.Item>
                    <Form.Item 
                      name="amountLimitUzs" 
                      label={<span className="font-semibold text-xs text-purple-900">Yillik moliyaviy limit (so'm)</span>} 
                      className="!mb-0"
                    >
                      <InputNumber className="w-full" min={0} placeholder="Masalan: 6000000 so'm" />
                    </Form.Item>
                  </div>
                </div>
              )}

              {/* Tijorat tashkiloti uchun: Avans to'lov foizi */}
              {modalCategory === 'COMMERCIAL' && (
                <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-xl">
                  <Form.Item 
                    name="advancePaymentPercent" 
                    label={<span className="font-semibold text-xs text-sky-900">Majburiy oldindan to'lov (Avans) foizi</span>} 
                    className="!mb-0"
                  >
                    <Select placeholder="Avans foizini tanlang">
                      <Option value={100}>100% oldindan to'lov (qonuniy standart)</Option>
                      <Option value={50}>50% oldindan to'lov</Option>
                    </Select>
                  </Form.Item>
                </div>
              )}

              {/* Sanoat uchun: Oqova suv koeffitsiyenti & PDK */}
              {modalCategory === 'INDUSTRIAL' && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Factory size={14} /> Sanoat Oqova Suv Parametrlari:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Form.Item 
                      name="sewageRatio" 
                      label={<span className="font-semibold text-xs text-amber-900">Oqova suv chiqarish koeffitsiyenti</span>} 
                      className="!mb-0"
                    >
                      <InputNumber className="w-full" min={0} max={2} step={0.1} placeholder="1.0" />
                    </Form.Item>
                    <Form.Item 
                      name="pdkCoefficient" 
                      label={<span className="font-semibold text-xs text-amber-900">ПДК (ifloslantiruvchi ustama) koeffitsiyenti</span>} 
                      className="!mb-0"
                    >
                      <InputNumber className="w-full" min={1} max={5} step={0.1} placeholder="1.0 (Oddiy)" />
                    </Form.Item>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <Button onClick={prevStep} icon={<ArrowLeft size={14} />}>Orqaga</Button>
              <Button type="primary" onClick={nextStep} icon={<ArrowRight size={14} />} className="flex items-center gap-1.5">
                Keyingi qadam: Obyekt va Quvur
              </Button>
            </div>
          </div>

          {/* STEP 2: OBYEKT & QUVR PARAMETRLARI */}
          <div className={currentStep === 2 ? 'block' : 'hidden'}>
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/80 mb-3 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200/70">
                Obyekt Joylashuvi va Quvur Parametrlari
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Form.Item name="facilityName" label={<span className="font-semibold text-xs text-slate-700">Bino / Obyekt nomi</span>} className="!mb-2.5">
                  <Input prefix={<Building size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: Bosh korpus yoki 1-sex" />
                </Form.Item>
                <Form.Item name="mahallaId" label={<span className="font-semibold text-xs text-slate-700">Mahalla</span>} className="!mb-2.5" rules={[{ required: true, message: 'Mahallani tanlang' }]}>
                  <Select placeholder="Mahallani tanlang" showSearch optionFilterProp="children">
                    {mahallas.map(m => <Option key={m.id} value={m.id}>{m.name}</Option>)}
                  </Select>
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Form.Item name="streetId" label={<span className="font-semibold text-xs text-slate-700">Ko'cha</span>} className="!mb-2.5" rules={[{ required: true, message: 'Ko\'chani tanlang' }]}>
                  <Select placeholder="Ko'chani tanlang" disabled={!selectedMahalla} showSearch optionFilterProp="children">
                    {streets.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="house" label={<span className="font-semibold text-xs text-slate-700">Bino / Uy raqami</span>} className="!mb-2.5" rules={[{ required: true, message: 'Uy raqami majburiy' }]}>
                  <Input prefix={<Home size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: 12A" />
                </Form.Item>
                <Form.Item name="apartment" label={<span className="font-semibold text-xs text-slate-700">Ofis / Qavat</span>} className="!mb-2.5">
                  <Input placeholder="Masalan: 4-ofis" />
                </Form.Item>
              </div>

              {/* Quvur diametri va tarmoq parametrlari */}
              <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-sky-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Gauge size={14} /> Suv Kirish Quvuri Parametrlari:</span>
                  <span className="text-[11px] text-sky-700 font-normal">Sanksion hisob-kitoblar uchun asos bo'ladi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Form.Item 
                    name="pipeDiameterMm" 
                    label={<span className="font-semibold text-xs text-sky-900">Quvur diametri (mm)</span>} 
                    className="!mb-0" 
                    rules={[{ required: true, message: 'Quvur diametrini kiriting' }]}
                  >
                    <Select placeholder="Diametrni tanlang">
                      {COMMON_PIPE_DIAMETERS.map(d => (
                        <Option key={d} value={d}>⌀ {d} mm ({d >= 50 ? 'Katta quvur' : 'Standart'})</Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item name="waterPressureBar" label={<span className="font-semibold text-xs text-sky-900">Suv bosimi (bar)</span>} className="!mb-0">
                    <InputNumber className="w-full" min={0.5} max={10} step={0.5} placeholder="2.5 bar" />
                  </Form.Item>

                  <Form.Item name="hasSewage" label={<span className="font-semibold text-xs text-sky-900">Oqova suv (kanalizatsiya)</span>} className="!mb-0">
                    <Select placeholder="Tanlang">
                      <Option value={true}>Ulangan (Oqova hisoblanadi)</Option>
                      <Option value={false}>Ulanmagan (Faqat toza suv)</Option>
                    </Select>
                  </Form.Item>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <Button onClick={prevStep} icon={<ArrowLeft size={14} />}>Orqaga</Button>
              <Button type="primary" onClick={nextStep} icon={<ArrowRight size={14} />} className="flex items-center gap-1.5">
                Keyingi qadam: Hisoblagich
              </Button>
            </div>
          </div>

          {/* STEP 3: HISOBLAGICH VA PLOMBA */}
          <div className={currentStep === 3 ? 'block' : 'hidden'}>
            {!isMetered ? (
              <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 my-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100">
                  <CheckCircle2 size={24} className="text-emerald-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Normativ tarif tanlangan</h3>
                <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
                  Ushbu tashkilot uchun hisoblagich kiritish talab etilmaydi. Hisob-kitoblar belgilangan oylik normativ hajm asosida yuritiladi.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button onClick={prevStep} icon={<ArrowLeft size={14} />}>Orqaga</Button>
                  <Button type="primary" onClick={handleWizardSubmit} loading={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                    Tashkilotni Saqlash va Yakunlash
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/80 mb-3 space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200/70">
                  Hisoblagich va Davlat Qiyoslovi (Poverka) Ma'lumotlari
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Form.Item name="meterNumber" label={<span className="font-semibold text-xs text-slate-700">Hisoblagich raqami (Seriya)</span>} className="!mb-2.5" rules={[{ required: true, message: 'Hisoblagich raqamini kiriting' }]}>
                    <Input prefix={<Hash size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: 12345678" />
                  </Form.Item>
                  <Form.Item name="meterModel" label={<span className="font-semibold text-xs text-slate-700">Model / Markasi</span>} className="!mb-2.5" rules={[{ required: true, message: 'Modelni kiriting' }]}>
                    <Input prefix={<Gauge size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: G-4 yoki XK-20" />
                  </Form.Item>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Form.Item name="certificateNumber" label={<span className="font-semibold text-xs text-slate-700">Davlat qiyoslov sertifikat raqami</span>} className="!mb-2.5">
                    <Input prefix={<FileText size={14} className="text-slate-400 mr-1" />} placeholder="Masalan: UZ-123456" />
                  </Form.Item>
                  <Form.Item name="initialReading" label={<span className="font-semibold text-xs text-slate-700">Boshlang'ich ko'rsatkich (m³)</span>} className="!mb-2.5">
                    <InputNumber className="w-full" min={0} placeholder="0" />
                  </Form.Item>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Form.Item name="meterInstalledAt" label={<span className="font-semibold text-xs text-slate-700">O'rnatilgan sana</span>} className="!mb-0" rules={[{ required: true, message: 'Sanani tanlang' }]}>
                    <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="Sanani tanlang" />
                  </Form.Item>
                  <Form.Item name="meterCheckDate" label={<span className="font-semibold text-xs text-slate-700">Keyingi qiyoslov sanasi (Poverka)</span>} className="!mb-0" rules={[{ required: true, message: 'Sanani tanlang' }]}>
                    <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="Sanani tanlang" />
                  </Form.Item>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-4">
                  <Button onClick={prevStep} icon={<ArrowLeft size={14} />}>Orqaga</Button>
                  <Button type="primary" onClick={handleWizardSubmit} loading={submitting} className="bg-sky-600 hover:bg-sky-700">
                    Tashkilotni Saqlash va Yakunlash
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Form>
      </Modal>

      {/* 5. MODAL 2: INTERAKTIV QUVUR SANSIYASI KALKULYATORI */}
      <Modal
        title={
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 pr-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-200 shrink-0">
              <Calculator size={20} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">Quvur Diametri Bo'yicha Sanksiya Kalkulyatori</div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">24 soatlik to'liq o'tkazuvchanlik va 12% QQS asosida rasmiy dalolatnoma tuzish</div>
            </div>
          </div>
        }
        open={sanctionModalVisible}
        onCancel={() => setSanctionModalVisible(false)}
        footer={null}
        width={760}
        destroyOnClose
        className="modal-modern"
      >
        <Form 
          form={sanctionForm} 
          layout="vertical"
          onValuesChange={(_, all) => {
            handleLiveSanctionCalc(
              Number(all.pipeDiameterMm),
              Number(all.durationHours),
              Number(all.assumedVelocityMps || 1.2),
              Number(all.tariffPrice)
            );
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            
            {/* Chap qism: Kiruvchi parametrlar */}
            <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-200/70">
                Kiruvchi parametrlar
              </div>

              {!selectedAbonentForSanction && (
                <Form.Item name="abonentId" label={<span className="font-semibold text-xs text-slate-700">Tashkilotni tanlang</span>} className="!mb-2" rules={[{ required: true }]}>
                  <Select placeholder="Tashkilotni qidiring" showSearch optionFilterProp="children">
                    {data.map((item: any) => (
                      <Option key={item.id} value={item.id}>
                        {item.abonentNumber} - {item.fullName} (STIR: {item.inn || '-'})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              {selectedAbonentForSanction && (
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                  <div className="text-slate-500">Tanlangan tashkilot:</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedAbonentForSanction.fullName}</div>
                  <div className="font-mono text-slate-600 text-[11px] mt-0.5">
                    Abonent: {selectedAbonentForSanction.abonentNumber} | STIR: {selectedAbonentForSanction.inn || '—'}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <Form.Item name="pipeDiameterMm" label={<span className="font-semibold text-xs text-slate-700">Quvur diametri (mm)</span>} className="!mb-2" rules={[{ required: true }]}>
                  <Select placeholder="Diametr">
                    {COMMON_PIPE_DIAMETERS.map(d => (
                      <Option key={d} value={d}>⌀ {d} mm</Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="durationHours" label={<span className="font-semibold text-xs text-slate-700">Davr (soatda)</span>} className="!mb-2" rules={[{ required: true }]}>
                  <Select placeholder="Davr">
                    <Option value={24}>24 soat (1 sutka)</Option>
                    <Option value={48}>48 soat (2 sutka)</Option>
                    <Option value={72}>72 soat (3 sutka)</Option>
                    <Option value={240}>240 soat (10 sutka)</Option>
                    <Option value={720}>720 soat (30 sutka)</Option>
                  </Select>
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Form.Item name="tariffPrice" label={<span className="font-semibold text-xs text-slate-700">Tarif narxi (UZS/m³)</span>} className="!mb-2" rules={[{ required: true }]}>
                  <InputNumber className="w-full" min={1} placeholder="5000" />
                </Form.Item>
                <Form.Item name="assumedVelocityMps" label={<span className="font-semibold text-xs text-slate-700">O'rtacha tezlik (m/s)</span>} className="!mb-2">
                  <InputNumber className="w-full" min={0.5} max={3.0} step={0.1} placeholder="1.2" />
                </Form.Item>
              </div>

              <Form.Item name="reason" label={<span className="font-semibold text-xs text-slate-700">Sanksiya asosi / Sababi</span>} className="!mb-2" rules={[{ required: true }]}>
                <Select placeholder="Sababni tanlang">
                  <Option value="Hisoblagich nosoz / to'xtab qolgan">Hisoblagich nosoz / to'xtab qolgan</Option>
                  <Option value="Davlat qiyoslovi (poverka) muddati o'tgan">Davlat qiyoslovi (poverka) muddati o'tgan</Option>
                  <Option value="Tamg'a (plomba) buzilgan yoki yechilgan">Tamg'a (plomba) buzilgan yoki yechilgan</Option>
                  <Option value="Tarmoqqa noqonuniy ulanish (o'zboshimchalik)">Tarmoqqa noqonuniy ulanish (o'zboshimchalik)</Option>
                </Select>
              </Form.Item>

              <div className="grid grid-cols-2 gap-2.5">
                <Form.Item name="actNumber" label={<span className="font-semibold text-xs text-slate-700">Dalolatnoma №</span>} className="!mb-0" rules={[{ required: true }]}>
                  <Input placeholder="AKT-001" className="font-mono" />
                </Form.Item>
                <Form.Item name="actDate" label={<span className="font-semibold text-xs text-slate-700">Sana</span>} className="!mb-0" rules={[{ required: true }]}>
                  <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
              </div>
            </div>

            {/* O'ng qism: Jonli hisob-kitob natijalari kartasi */}
            <div className="space-y-3 flex flex-col justify-between bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-50 p-4 rounded-xl border border-amber-200">
              <div>
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider pb-1 border-b border-amber-200/70 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-amber-600" />
                  Jonli Hisob-kitob Natijasi
                </div>

                <div className="mt-4 space-y-3">
                  <div className="bg-white p-3 rounded-lg border border-amber-200/80 shadow-xs">
                    <div className="text-[11px] text-slate-500">Hisoblangan suv hajmi:</div>
                    <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                      {sanctionCalcResult?.calculatedVolumeM3 || 0} <span className="text-sm font-normal text-slate-500">m³</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Formula: Q = π × (d/2)² × v × t (v=1.2 m/s)
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-amber-200/60">
                      <span className="text-slate-600">Baza qiymati (suv):</span>
                      <span className="font-mono font-bold text-slate-800">
                        {sanctionCalcResult?.baseAmount?.toLocaleString() || 0} UZS
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-amber-200/60">
                      <span className="text-purple-700 font-medium">QQS (tarif ustiga 12%):</span>
                      <span className="font-mono font-bold text-purple-800">
                        + {sanctionCalcResult?.vatAmount?.toLocaleString() || 0} UZS
                      </span>
                    </div>
                    <div className="flex justify-between py-2 pt-3">
                      <span className="text-sm font-bold text-slate-900">Jami sanksiya summasi:</span>
                      <span className="text-base font-bold font-mono text-rose-600">
                        {sanctionCalcResult?.totalSanctionAmount?.toLocaleString() || 0} UZS
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Button 
                  type="primary" 
                  onClick={handleCreateSanction} 
                  loading={sanctionSubmitting} 
                  className="w-full bg-amber-600 hover:bg-amber-700 font-bold text-xs h-9 shadow-xs"
                >
                  Dalolatnomani rasmiylashtirish va saqlash
                </Button>
                <div className="text-[11px] text-slate-500 text-center">
                  * Dalolatnoma saqlanganda korxona hisobiga debet qilinadi
                </div>
              </div>
            </div>

          </div>
        </Form>
      </Modal>

      {/* 6. MODAL 3: AKT-SVERKA (TAQQOSLAMA DALOLATNOMA) */}
      <Modal
        title={
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 pr-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-200 shrink-0">
              <Printer size={20} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">Akt-Sverka (Taqqoslama Dalolatnoma)</div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">
                {selectedAbonentForAkt?.fullName} — {aktYear}-yil bo'yicha to'liq hisob-kitob varaqasi
              </div>
            </div>
          </div>
        }
        open={aktSverkaModalVisible}
        onCancel={() => setAktSverkaModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setAktSverkaModalVisible(false)}>Yopish</Button>,
          <Button key="print" type="primary" icon={<Printer size={14} />} onClick={handlePrintAktSverka} className="bg-purple-600 hover:bg-purple-700">
            Chop etish (Print)
          </Button>
        ]}
        width={850}
        destroyOnClose
        className="modal-modern"
      >
        <div className="py-2 space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Hisobot yili:</span>
              <Select 
                value={aktYear} 
                onChange={(y) => {
                  setAktYear(y);
                  if (selectedAbonentForAkt) fetchAktSverka(selectedAbonentForAkt.id, y);
                }} 
                size="small" 
                className="w-24 font-mono font-bold"
              >
                {[2024, 2025, 2026, 2027].map(y => <Option key={y} value={y}>{y}</Option>)}
              </Select>
            </div>
            <div className="text-xs text-slate-500">
              Abonent: <b className="font-mono text-slate-800">{selectedAbonentForAkt?.abonentNumber}</b> | STIR: <b className="font-mono text-slate-800">{selectedAbonentForAkt?.inn || '—'}</b>
            </div>
          </div>

          {/* Akt-Sverka Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div className="text-[11px] text-slate-500">Hisoblangan (Debet)</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                {aktSverkaData?.summary?.totalInvoiced?.toLocaleString() || 0} UZS
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <div className="text-[11px] text-emerald-700">To'langan (Kredit)</div>
              <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                {aktSverkaData?.summary?.totalPaid?.toLocaleString() || 0} UZS
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
              <div className="text-[11px] text-purple-700">Hozirgi qoldiq</div>
              <div className={`text-base font-bold font-mono mt-0.5 ${
                (aktSverkaData?.summary?.currentBalance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {Math.abs(aktSverkaData?.summary?.currentBalance || 0).toLocaleString()} UZS
                <span className="text-[10px] block font-normal text-slate-500">
                  {(aktSverkaData?.summary?.currentBalance || 0) > 0 ? '(Qarz)' : '(Avans)'}
                </span>
              </div>
            </div>
          </div>

          {/* Invoices and Payments Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {aktYear}-yil bo'yicha hisob-fakturalar va to'lovlar
            </div>
            <Table
              dataSource={[
                ...(aktSverkaData?.invoices || []).map((inv: any) => ({
                  key: `inv-${inv.id}`,
                  date: inv.period,
                  type: 'Schyot-faktura (Hisoblandi)',
                  amountDebit: Number(inv.amount),
                  amountCredit: 0,
                  status: inv.status
                })),
                ...(aktSverkaData?.payments || []).map((p: any) => ({
                  key: `pay-${p.id}`,
                  date: dayjs(p.date).format('YYYY-MM-DD'),
                  type: `To'lov (${p.receiptNumber || 'Bank'})`,
                  amountDebit: 0,
                  amountCredit: Number(p.amount),
                  status: p.status
                }))
              ].sort((a, b) => a.date.localeCompare(b.date))}
              columns={[
                { title: 'Sana / Davr', dataIndex: 'date', width: 120, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                { title: 'Operatsiya / Hujjat', dataIndex: 'type', render: (v: string) => <span className="text-xs font-semibold">{v}</span> },
                { 
                  title: 'Debet (UZS)', 
                  dataIndex: 'amountDebit', 
                  align: 'right',
                  width: 140,
                  render: (v: number) => v > 0 ? <span className="font-mono text-xs font-bold text-slate-800">{v.toLocaleString()}</span> : '—'
                },
                { 
                  title: 'Kredit (UZS)', 
                  dataIndex: 'amountCredit', 
                  align: 'right',
                  width: 140,
                  render: (v: number) => v > 0 ? <span className="font-mono text-xs font-bold text-emerald-600">{v.toLocaleString()}</span> : '—'
                },
              ]}
              pagination={false}
              size="small"
              className="border border-slate-100 rounded-xl"
              loading={aktSverkaLoading}
            />
          </div>
        </div>
      </Modal>

      {/* 7. MODAL 4: BYUDJET LIMITLARINI BELGILASH */}
      <Modal
        title={
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 pr-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-200 shrink-0">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">Byudjet Limitini Belgilash</div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">{selectedAbonentForLimit?.fullName}</div>
            </div>
          </div>
        }
        open={limitModalVisible}
        onOk={handleSaveLimit}
        onCancel={() => setLimitModalVisible(false)}
        confirmLoading={limitSubmitting}
        okText="Saqlash"
        cancelText="Bekor qilish"
        width={480}
        destroyOnClose
        className="modal-modern"
      >
        <Form form={limitForm} layout="vertical" className="pt-2">
          <Form.Item name="year" label={<span className="font-semibold text-xs text-slate-700">Yil</span>} rules={[{ required: true }]}>
            <Select>
              {[2025, 2026, 2027].map(y => <Option key={y} value={y}>{y}-yil</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="volumeLimitM3" label={<span className="font-semibold text-xs text-slate-700">Yillik suv hajmi limiti (m³)</span>} rules={[{ required: true }]}>
            <InputNumber className="w-full" min={1} placeholder="1000" />
          </Form.Item>
          <Form.Item name="amountLimitUzs" label={<span className="font-semibold text-xs text-slate-700">Yillik moliyaviy limit (UZS)</span>} rules={[{ required: true }]}>
            <InputNumber className="w-full" min={1} placeholder="5000000" />
          </Form.Item>
          <Form.Item name="warningThreshold" label={<span className="font-semibold text-xs text-slate-700">Ogohlantirish chegarasi (%)</span>}>
            <Select>
              <Option value={70}>70% ga yetganda</Option>
              <Option value={80}>80% ga yetganda (Standart)</Option>
              <Option value={90}>90% ga yetganda</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 8. MODAL 5: BANK TO'LOVINI BIRIKTIRISH */}
      <Modal
        title={
          <div className="flex items-center gap-3 pb-2.5 border-b border-slate-100 pr-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shrink-0">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 leading-tight">Bank to'lovini tashkilotga biriktirish</div>
              <div className="text-xs text-slate-500 font-normal mt-0.5">Kelib tushgan to'lovni tegishli yuridik shaxs hisobiga o'tkazish</div>
            </div>
          </div>
        }
        open={assignPaymentModalVisible}
        onOk={handleConfirmAssign}
        onCancel={() => setAssignPaymentModalVisible(false)}
        confirmLoading={assignSubmitting}
        okText="Biriktirish va tasdiqlash"
        cancelText="Bekor qilish"
        centered
        width={560}
        className="modal-modern"
      >
        <div className="py-2 space-y-3">
          <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-xs border border-slate-200">
            <p><span className="text-slate-500">To'lovchi:</span> <strong className="text-slate-800">{assignPaymentRecord?.payerName}</strong></p>
            <p><span className="text-slate-500">STIR:</span> <strong className="font-mono text-slate-800">{assignPaymentRecord?.payerInn || '-'}</strong></p>
            <p><span className="text-slate-500">Summa:</span> <strong className="font-mono font-bold text-emerald-600">{Number(assignPaymentRecord?.amount || 0).toLocaleString()} UZS</strong></p>
            <p><span className="text-slate-500">Izoh:</span> <span className="text-slate-700">{assignPaymentRecord?.comment || '-'}</span></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tashkilotni (Abonent) tanlang:</label>
            <Select
              showSearch
              placeholder="Tashkilot nomi, STIR yoki Abonent raqami bo'yicha qidiring"
              className="w-full"
              value={selectedAssignAbonentId}
              onChange={(val) => setSelectedAssignAbonentId(val)}
              optionFilterProp="children"
              filterOption={(input, option: any) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={data.map((item: any) => ({
                value: item.id,
                label: `${item.abonentNumber} - ${item.fullName} (STIR: ${item.inn || '-'})`
              }))}
            />
          </div>
        </div>
      </Modal>


      {/* 9. RASMIY HUJJAT MODALLARI: EHF, AKT-SVERKA, SANSIYA AKTI, SPRAVKA-RASCHET, PRETENZIYA, KO'RSATKICH */}
      <EFacturaViewer
        visible={eFacturaVisible}
        onClose={() => setEFacturaVisible(false)}
        abonent={selectedAbonentForEFactura}
        tenantInfo={{
          name: tenantProfile?.name || selectedAbonentForEFactura?.tenant?.name || "Chust Tumani Suv Ta'minoti Korxonasi",
          inn: tenantProfile?.inn || selectedAbonentForEFactura?.tenant?.inn || "201555001",
          vatCode: tenantProfile?.vatCode || selectedAbonentForEFactura?.tenant?.vatCode || "326000001520",
          address: tenantProfile?.address || selectedAbonentForEFactura?.tenant?.address || "Namangan viloyati, Chust tumani, Chust sh., Mustaqillik ko'chasi, 12-uy",
          account: tenantProfile?.bankAccount || selectedAbonentForEFactura?.tenant?.bankAccount || "20208000900000152010",
          bankName: tenantProfile?.bankName || selectedAbonentForEFactura?.tenant?.bankName || "ATB Agrobank Chust filiali",
          mfo: tenantProfile?.mfo || selectedAbonentForEFactura?.tenant?.mfo || "00152",
          directorName: tenantProfile?.directorName || selectedAbonentForEFactura?.tenant?.directorName || "Qodirov Dilshodbek Rustamovich",
          accountantName: tenantProfile?.accountantName || selectedAbonentForEFactura?.tenant?.accountantName || "Soliyev Akramjon Ne'matillayevich"
        }}
      />

      <AktSverkaOfficial
        visible={officialAktSverkaVisible}
        onClose={() => setOfficialAktSverkaVisible(false)}
        abonent={selectedAbonentForAktOfficial}
        aktData={officialAktData}
      />

      <SanctionActOfficial
        visible={sanctionActDocVisible}
        onClose={() => setSanctionActDocVisible(false)}
        abonent={selectedAbonentForSanctionDoc}
        actData={selectedActData}
      />

      <SpravkaRaschetOfficial
        visible={spravkaModalVisible}
        onClose={() => setSpravkaModalVisible(false)}
        abonent={selectedAbonentForSpravka}
        tenantInfo={{
          name: tenantProfile?.name || selectedAbonentForSpravka?.tenant?.name || "Chust Tumani Suv Ta'minoti Korxonasi",
          inn: tenantProfile?.inn || selectedAbonentForSpravka?.tenant?.inn || "201555001",
          vatCode: tenantProfile?.vatCode || selectedAbonentForSpravka?.tenant?.vatCode || "326000001520",
          address: tenantProfile?.address || selectedAbonentForSpravka?.tenant?.address || "Namangan viloyati, Chust tumani",
          account: tenantProfile?.bankAccount || selectedAbonentForSpravka?.tenant?.bankAccount || "20208000900000152010",
          bankName: tenantProfile?.bankName || selectedAbonentForSpravka?.tenant?.bankName || "ATB Agrobank Chust filiali",
          mfo: tenantProfile?.mfo || selectedAbonentForSpravka?.tenant?.mfo || "00152",
          directorName: tenantProfile?.directorName || "Qodirov D.R.",
          accountantName: tenantProfile?.accountantName || "Soliyev A.N."
        }}
      />

      <PretenziyaOfficial
        visible={pretenziyaModalVisible}
        onClose={() => setPretenziyaModalVisible(false)}
        abonent={selectedAbonentForPretenziya}
        tenantInfo={{
          name: tenantProfile?.name || selectedAbonentForPretenziya?.tenant?.name || "Chust Tumani Suv Ta'minoti Korxonasi",
          inn: tenantProfile?.inn || selectedAbonentForPretenziya?.tenant?.inn || "201555001",
          vatCode: tenantProfile?.vatCode || selectedAbonentForPretenziya?.tenant?.vatCode || "326000001520",
          address: tenantProfile?.address || selectedAbonentForPretenziya?.tenant?.address || "Namangan viloyati, Chust tumani",
          account: tenantProfile?.bankAccount || selectedAbonentForPretenziya?.tenant?.bankAccount || "20208000900000152010",
          bankName: tenantProfile?.bankName || selectedAbonentForPretenziya?.tenant?.bankName || "ATB Agrobank Chust filiali",
          mfo: tenantProfile?.mfo || selectedAbonentForPretenziya?.tenant?.mfo || "00152",
          directorName: tenantProfile?.directorName || "Qodirov D.R.",
          accountantName: tenantProfile?.accountantName || "Soliyev A.N."
        }}
      />

      <OrganizationProfileModal
        visible={isOrgProfileModalVisible}
        onClose={() => setIsOrgProfileModalVisible(false)}
        onSaved={(updated) => setTenantProfile(updated)}
      />

      <MeterReadingModal
        visible={readingModalVisible}
        onClose={() => setReadingModalVisible(false)}
        abonent={selectedAbonentForReading}
        onSuccess={() => fetchAbonents(search, selectedCategory)}
      />

    </div>
  );
};

export default LegalEntities;
