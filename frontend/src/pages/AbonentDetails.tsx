import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Descriptions, Tag, Table, Tabs, Modal, Form, Input, Select, DatePicker, message, Upload, Empty, Image, Switch, Popconfirm, InputNumber, Spin } from 'antd';
import { 
  Upload as UploadIcon, Edit, ArrowLeft, User, IdCard, AlertCircle, CheckCircle2, 
  MapPin, Phone, Droplet, Banknote, Trash2, Users, History, Gauge, Plus, Percent, 
  AlertTriangle, Archive, Replace, FileText, FileBarChart, Download, PauseCircle, 
  Power, PlayCircle, Check, X, Clock, Building2, Calculator, Landmark, ShieldAlert, 
  Printer, Droplets, SlidersHorizontal, AlertOctagon, FileCheck 
} from 'lucide-react';
import { getAbonentById, cancelDebt, updateAbonent, updateAbonentStatus, manualChargeAbonent, getAktSverka } from '../../services/abonentService';
import { getTariffs } from '../../services/tariffService';
import { useLanguage } from '../../contexts/LanguageContext';
import { addMeterReading, createMeter, updateMeterStatus } from '../../services/meterService';
import { createPayment, cancelPayment, generateClickLink } from '../../services/paymentService';
import { QRCodeCanvas } from 'qrcode.react';
import dayjs from 'dayjs';
import api from '../../services/api';
import { MeterReplacementWizard } from '../../components/MeterReplacementWizard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { EFacturaViewer } from '../../components/documents/EFacturaViewer';
import { AktSverkaOfficial } from '../../components/documents/AktSverkaOfficial';
import { SanctionActOfficial } from '../../components/documents/SanctionActOfficial';
import { SpravkaRaschetOfficial } from '../../components/documents/SpravkaRaschetOfficial';
import { PretenziyaOfficial } from '../../components/documents/PretenziyaOfficial';

const AbonentDetails: React.FC = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [abonent, setAbonent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tariffs, setTariffs] = useState<any[]>([]);

  // B2B Official Document Modals State
  const [eFacturaVisible, setEFacturaVisible] = useState(false);
  const [officialAktSverkaVisible, setOfficialAktSverkaVisible] = useState(false);
  const [officialAktData, setOfficialAktData] = useState<any>(null);
  const [sanctionActDocVisible, setSanctionActDocVisible] = useState(false);
  const [spravkaModalVisible, setSpravkaModalVisible] = useState(false);
  const [pretenziyaModalVisible, setPretenziyaModalVisible] = useState(false);

  const handleOpenOfficialAktSverka = async () => {
    try {
      const res = await getAktSverka(id!, dayjs().year());
      setOfficialAktData(res);
      setOfficialAktSverkaVisible(true);
    } catch {
      message.error("Akt-sverka ma'lumotlarini yuklashda xatolik");
    }
  };

  // Modals state
  const [isCancelDebtVisible, setIsCancelDebtVisible] = useState(false);
  const [isManualChargeVisible, setIsManualChargeVisible] = useState(false);
  const [isAddReadingVisible, setIsAddReadingVisible] = useState(false);
  const [isAddPaymentVisible, setIsAddPaymentVisible] = useState(false);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [isAddMeterVisible, setIsAddMeterVisible] = useState(false);
  const [isWizardVisible, setIsWizardVisible] = useState(false);
  const [isArchiveVisible, setIsArchiveVisible] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [isUnarchiveVisible, setIsUnarchiveVisible] = useState(false);
  const [unarchiveReason, setUnarchiveReason] = useState('');
  
  const [cancelPaymentId, setCancelPaymentId] = useState<string | null>(null);
  const [cancelPaymentReason, setCancelPaymentReason] = useState('');

  const [isClickLinkVisible, setIsClickLinkVisible] = useState(false);
  const [clickLinkUrl, setClickLinkUrl] = useState('');
  const [clickLinkAmount, setClickLinkAmount] = useState<number | null>(null);
  const [generatingClickLink, setGeneratingClickLink] = useState(false);

  const [cancelDebtForm] = Form.useForm();
  const [manualChargeForm] = Form.useForm();
  const [readingForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [meterForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAbonent(id);
    }
    getTariffs().then(setTariffs).catch(console.error);
  }, [id]);

  const fetchAbonent = async (abonentId: string) => {
    setLoading(true);
    try {
      const data = await getAbonentById(abonentId);
      setAbonent(data);
    } catch (error: any) {
      message.error(error?.response?.data?.message || t('det.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClickLink = async () => {
    if (!clickLinkAmount || clickLinkAmount <= 0) {
      message.error("Iltimos, summani kiriting");
      return;
    }
    setGeneratingClickLink(true);
    try {
      const res = await generateClickLink(id!, clickLinkAmount);
      setClickLinkUrl(res.url);
      message.success("Click havolasi yaratildi");
    } catch (e: any) {
      message.error(e.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setGeneratingClickLink(false);
    }
  };

  const handleCancelDebt = (values: any) => {
    if (!values.actImage || values.actImage.length === 0) {
      message.error(t('det.cancelDebtUploadError'));
      return;
    }
    
    Modal.confirm({
      title: "Qarzdorlikni bekor qilish aktini tasdiqlaysizmi?",
      content: `Abonent: ${abonent?.fullName || ''}\nSumma: ${Number(values.amount).toLocaleString()} so'm\nAkt raqami: ${values.actNumber}`,
      okText: "Ha, bekor qilinsin",
      cancelText: "Ortga",
      okButtonProps: { danger: true },
      onOk: async () => {
        setSubmitting(true);
        try {
          const actImageUrl = values.actImage[0].response?.url || values.actImage[0].url;
          await cancelDebt(id!, {
            actNumber: values.actNumber,
            actDate: values.actDate.format('YYYY-MM-DD'),
            amount: parseFloat(values.amount),
            reason: values.reason,
            actImageUrl
          });
          message.success(t('det.cancelDebtSuccess'));
          setIsCancelDebtVisible(false);
          cancelDebtForm.resetFields();
          fetchAbonent(id!);
        } catch (e: any) {
          message.error(e?.response?.data?.message || t('det.error'));
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const handleManualCharge = (values: any) => {
    Modal.confirm({
      title: "Qo'shimcha hisoblashni tasdiqlaysizmi?",
      content: `Abonent: ${abonent?.fullName || ''}\nQo'shiladigan qarz: ${Number(values.amount).toLocaleString()} so'm\nSabab: ${values.reason || 'Kiritilmagan'}`,
      okText: "Ha, qarz yozilsin",
      cancelText: "Ortga",
      okButtonProps: { danger: true },
      onOk: async () => {
        setSubmitting(true);
        try {
          await manualChargeAbonent(id!, {
            amount: parseFloat(values.amount),
            reason: values.reason
          });
          message.success("Qo'shimcha hisoblash muvaffaqiyatli amalga oshirildi");
          setIsManualChargeVisible(false);
          manualChargeForm.resetFields();
          fetchAbonent(id!);
        } catch (e: any) {
          message.error(e?.response?.data?.message || t('det.error'));
        } finally {
          setSubmitting(false);
        }
      }
    });
  };


  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      message.loading({ content: 'PDF yuklanmoqda...', key: 'pdfDownload' });
      const response = await api.get(`/billing/invoice/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      message.success({ content: 'PDF muvaffaqiyatli ochildi', key: 'pdfDownload' });
    } catch (err: any) {
      message.error({ content: err.response?.data?.message || 'PDF yuklashda xatolik yuz berdi', key: 'pdfDownload' });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setSubmitting(true);
    try {
      await updateAbonentStatus(id!, newStatus);
      message.success("Abonent holati yangilandi");
      fetchAbonent(id!);
    } catch (e: any) {
      message.error(e.response?.data?.message || "Holatni o'zgartirishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReading = async (values: any) => {
    const activeMeter = abonent.Meters?.find((m: any) => m.status === 'ACTIVE') || abonent.Meters?.[0];
    if (!activeMeter) {
      message.error(t('det.readingNoMeter'));
      return;
    }
    if (activeMeter.status !== 'ACTIVE') {
      message.error("Abonentda faol hisoblagich topilmadi. Hisoblagich holati: " + activeMeter.status);
      return;
    }
    setSubmitting(true);
    try {
      const meterId = activeMeter.id;
      const readingDate = values.date.format('YYYY-MM-DD');
      const period = values.date.format('YYYY-MM'); // Keep period for compatibility
      
      await addMeterReading({
        meterId,
        period,
        date: readingDate,
        value: parseFloat(values.value),
        imageUrl: values.imageUrl?.[0]?.response?.url || values.imageUrl?.[0]?.url || null
      });
      message.success(t('det.readingSuccess'));
      setIsAddReadingVisible(false);
      readingForm.resetFields();
      fetchAbonent(id!);
    } catch (e: any) {
      message.error(e.response?.data?.message || t('det.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPayment = async (values: any) => {
    setSubmitting(true);
    try {
      await createPayment({
        abonentId: id!,
        amount: parseFloat(values.amount),
        comment: values.comment
      });
      message.success(t('det.paySuccess'));
      setIsAddPaymentVisible(false);
      paymentForm.resetFields();
      fetchAbonent(id!);
    } catch (e: any) {
      message.error(e.response?.data?.message || t('det.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMeter = async (values: any) => {
    setSubmitting(true);
    try {
      await createMeter({
        abonentId: id!,
        number: values.number,
        model: values.model,
        certificateNumber: values.certificateNumber,
        installedAt: values.installedAt.format('YYYY-MM-DD'),
        checkDate: values.checkDate.format('YYYY-MM-DD'),
        initialReading: values.initialReading
      });
      message.success(t('det.meterSuccess'));
      setIsAddMeterVisible(false);
      meterForm.resetFields();
      fetchAbonent(id!);
    } catch (e: any) {
      message.error(e?.response?.data?.message || t('det.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAbonent = async (values: any) => {
    setSubmitting(true);
    try {
      const combinedName = abonent.type === 'LEGAL'
        ? values.lastName
        : `${values.lastName || ''} ${values.firstName || ''} ${values.middleName || ''}`.trim().replace(/\s+/g, ' ');
      
      const payload: any = {
        fullName: combinedName,
        phone: values.phone,
        passport: values.passport,
        inn: values.inn,
        house: values.house,
        apartment: values.apartment,
        familyMembers: parseInt(values.familyMembers),
        discountPercent: parseInt(values.discountPercent || 0),
        responsiblePerson: values.responsiblePerson,
        responsiblePhone: values.responsiblePhone,
        bankAccount: values.bankAccount,
        bankName: values.bankName,
        mfo: values.mfo,
      };

      if (values.tariffId) {
        payload.tariffId = values.tariffId;
      }

      if (values.birthDate) {
        payload.birthDate = values.birthDate.format('YYYY-MM-DD');
      }

      await updateAbonent(id!, payload);
      message.success(t('det.editSuccess'));
      setIsEditVisible(false);
      fetchAbonent(id!);
    } catch (e: any) {
      message.error(e?.response?.data?.message || t('det.editError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveReason) {
      message.error(t('det.archiveReasonReq'));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/abonents/bulk-archive', { ids: [id], reason: archiveReason });
      message.success(t('det.archiveSuccess'));
      setIsArchiveVisible(false);
      fetchAbonent(id!);
    } catch (e: any) {
      message.error(e?.response?.data?.message || t('det.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnarchive = async () => {
    if (!unarchiveReason) {
      message.error(t('det.archiveReasonReq'));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/abonents/bulk-unarchive', { ids: [id], reason: unarchiveReason });
      message.success(t('det.unarchiveSuccess'));
      setIsUnarchiveVisible(false);
      setUnarchiveReason('');
      fetchAbonent(id!);
    } catch (e: any) {
      message.error(e.response?.data?.message || t('det.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = () => {
    const nameParts = (abonent.fullName || '').split(' ');
    editForm.setFieldsValue({
      lastName: abonent.type === 'LEGAL' ? abonent.fullName : (nameParts[0] || ''),
      firstName: abonent.type === 'LEGAL' ? '' : (nameParts[1] || ''),
      middleName: abonent.type === 'LEGAL' ? '' : nameParts.slice(2).join(' '),
      phone: abonent.phone,
      passport: abonent.passport,
      inn: abonent.inn,
      house: abonent.house,
      apartment: abonent.apartment,
      familyMembers: abonent.familyMembers,
      discountPercent: abonent.discountPercent || 0,
      tariffId: abonent.tariffId || abonent.tariff?.id,
      status: abonent.status,
      birthDate: abonent.birthDate ? dayjs(abonent.birthDate) : null,
      responsiblePerson: abonent.responsiblePerson,
      responsiblePhone: abonent.responsiblePhone,
      bankAccount: abonent.bankAccount,
      bankName: abonent.bankName,
      mfo: abonent.mfo,
    });
    setIsEditVisible(true);
  };

  const confirmCancelPayment = async () => {
    if (!cancelPaymentId || !cancelPaymentReason.trim()) {
      message.error(t('det.stornoReasonReq'));
      return;
    }
    try {
      setSubmitting(true);
      await cancelPayment(cancelPaymentId, cancelPaymentReason);
      message.success(t('det.stornoSuccess'));
      setCancelPaymentId(null);
      setCancelPaymentReason('');
      fetchAbonent(id!);
    } catch (e: any) {
      message.error(e?.response?.data?.message || t('det.stornoError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFaultyMeter = async (meterId: string) => {
    try {
      setSubmitting(true);
      await updateMeterStatus(meterId, 'FAULTY');
      message.success(t('det.meterFaultySuccess'));
      fetchAbonent(id!);
    } catch (e: any) {
      message.error(e?.response?.data?.message || t('det.error'));
    } finally {
      setSubmitting(false);
    }
  };


  const customUpload = async ({ file, onSuccess, onError }: any) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess(res.data, file);
    } catch (err) {
      onError(err);
    }
  };

  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
  if (!abonent) return <div>{t('det.notFound')}</div>;

  const meter = abonent.Meters?.find((m: any) => m.status === 'ACTIVE') || abonent.Meters?.[0];
  const readings = meter?.Readings || [];
  const payments = abonent.Payments || [];
  const invoices = abonent.Invoices || [];
  const debtCancellations = abonent.DebtCancellations || [];
  const meterReplacements = abonent.MeterReplacements || [];

  const address = `${abonent.mahalla?.name || ''}, ${abonent.street?.name || ''}, ${abonent.house}${abonent.apartment ? `-${abonent.apartment}` : ''}`;
  const statusColor = abonent.balance > 0 ? 'bg-error-container/50 text-on-error-container' : 'bg-green-100 text-green-800';
  const statusText = abonent.balance > 0 ? t('det.debtor') : t('det.noDebt');

  // Format data for chart (Last 6 readings)
  const chartData = [...readings].reverse().slice(-6).map((r: any, index: number, arr: any[]) => {
    let diff = 0;
    if (index > 0) {
      diff = r.value - arr[index - 1].value;
    }
    return {
      name: r.period,
      Hajm: diff > 0 ? diff : 0
    };
  });

  return (
    <div className="w-full pb-10 space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Ortga qaytish"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">{abonent.fullName}</h1>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                {abonent.abonentNumber}
              </span>
              {abonent.type === 'LEGAL' && (
                <>
                  {abonent.legalCategory === 'BUDGET' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      🏛️ Byudjet (G'aznachilik)
                    </span>
                  )}
                  {abonent.legalCategory === 'COMMERCIAL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                      🏢 Tijorat tashkiloti
                    </span>
                  )}
                  {abonent.legalCategory === 'INDUSTRIAL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      🏭 Sanoat va ishlab chiqarish
                    </span>
                  )}
                  {abonent.inn && (
                    <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      STIR: {abonent.inn}
                    </span>
                  )}
                  {abonent.oked && (
                    <span className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                      OKED: {abonent.oked}
                    </span>
                  )}
                  {abonent.vatPayer && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      QQS 12%
                    </span>
                  )}
                </>
              )}
              {abonent.status === 'ACTIVE' ? (
                <Tag className="rounded font-medium text-[11px] border-0 bg-emerald-50 text-emerald-700">Faol</Tag>
              ) : abonent.status === 'PENDING' ? (
                <Tag className="rounded font-medium text-[11px] border-0 bg-amber-50 text-amber-700">Kutilmoqda</Tag>
              ) : abonent.status === 'SUSPENDED' ? (
                <Tag className="rounded font-medium text-[11px] border-0 bg-amber-50 text-amber-700">To'xtatilgan</Tag>
              ) : abonent.status === 'DISCONNECTED' ? (
                <Tag className="rounded font-medium text-[11px] border-0 bg-rose-50 text-rose-700">Uzilgan</Tag>
              ) : (
                <Tag className="rounded font-medium text-[11px] border-0 bg-slate-100 text-slate-600">Arxivlangan</Tag>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{address}</p>
          </div>
        </div>
        
        {/* Quick Actions Panel */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* B2B Official Actions */}
          {abonent.type === 'LEGAL' && (
            <>
              <Button 
                size="small"
                className="font-semibold text-xs flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" 
                onClick={() => setEFacturaVisible(true)}
              >
                <FileText size={13} className="text-indigo-600" /> <span>E-Faktura (EHF)</span>
              </Button>

              <Button 
                size="small"
                className="font-semibold text-xs flex items-center gap-1.5 bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100" 
                onClick={handleOpenOfficialAktSverka}
              >
                <Printer size={13} className="text-slate-600" /> <span>Akt-sverka</span>
              </Button>

              {abonent.legalCategory === 'BUDGET' && (
                <Button 
                  size="small"
                  className="font-semibold text-xs flex items-center gap-1.5 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" 
                  onClick={() => setSpravkaModalVisible(true)}
                >
                  <Landmark size={13} className="text-purple-600" /> <span>Spravka-raschet</span>
                </Button>
              )}

              {Number(abonent.balance || 0) > 0 && (
                <Button 
                  size="small"
                  className="font-semibold text-xs flex items-center gap-1.5 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" 
                  onClick={() => setPretenziyaModalVisible(true)}
                >
                  <ShieldAlert size={13} className="text-rose-600" /> <span>Pretenziya (Penya)</span>
                </Button>
              )}

              <Button 
                size="small"
                className="font-semibold text-xs flex items-center gap-1.5 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" 
                onClick={() => setSanctionActDocVisible(true)}
              >
                <Calculator size={13} className="text-amber-600" /> <span>Quvur sanksiyasi</span>
              </Button>
            </>
          )}

          <Button 
            type="primary" 
            size="small"
            className="font-semibold text-xs flex items-center gap-1.5" 
            onClick={() => setIsAddPaymentVisible(true)}
          >
            <Banknote size={14} /> <span>{t('det.btnPay')}</span>
          </Button>

          <Button 
            size="small"
            className="font-semibold text-xs flex items-center gap-1.5" 
            onClick={() => {
              setClickLinkUrl('');
              setClickLinkAmount(abonent.balance && abonent.balance > 0 ? Number(abonent.balance) : 0);
              setIsClickLinkVisible(true);
            }}
          >
            <Plus size={14} /> <span>Click havola</span>
          </Button>

          {meter?.status === 'ACTIVE' && (
            <Button 
              size="small"
              className="font-semibold text-xs flex items-center gap-1.5 border-sky-300 text-sky-700 hover:text-sky-800" 
              onClick={() => setIsAddReadingVisible(true)}
            >
              <Gauge size={14} /> <span>{t('det.btnReading')}</span>
            </Button>
          )}

          {meter ? (
            <Button 
              size="small"
              className="font-semibold text-xs flex items-center gap-1.5" 
              onClick={() => setIsWizardVisible(true)}
            >
              <Replace size={14} /> <span>{t('det.btnReplace')}</span>
            </Button>
          ) : (
            <Button 
              size="small"
              className="font-semibold text-xs flex items-center gap-1.5" 
              onClick={() => setIsAddMeterVisible(true)}
            >
              <Plus size={14} /> <span>{t('det.btnAddMeter')}</span>
            </Button>
          )}

          <Button 
            size="small"
            className="font-semibold text-xs flex items-center gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50" 
            onClick={() => setIsCancelDebtVisible(true)}
          >
            <Trash2 size={13} /> <span>Bekor qilish</span>
          </Button>

          <Button 
            size="small"
            className="font-semibold text-xs flex items-center gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50" 
            onClick={() => setIsManualChargeVisible(true)}
          >
            <AlertTriangle size={13} /> <span>Qo'shimcha hisoblash</span>
          </Button>

          {abonent.status === 'PENDING' && (
            <>
              <Popconfirm
                title="Abonentni tasdiqlash"
                description="Haqiqatan ham bu abonentni tasdiqlab, 'Faol' (ACTIVE) holatiga o'tkazmoqchimisiz?"
                onConfirm={() => handleStatusChange('ACTIVE')}
                okText="Ha, tasdiqlash"
                cancelText="Bekor qilish"
              >
                <Button 
                  type="primary" 
                  size="small"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                  loading={submitting}
                >
                  <Check size={13} /> <span>Tasdiqlash</span>
                </Button>
              </Popconfirm>

              <Popconfirm
                title="Abonentni rad etish"
                description="Haqiqatan ham bu abonentni rad etib, arxivga o'tkazmoqchimisiz?"
                onConfirm={() => handleStatusChange('ARCHIVED')}
                okText="Ha, rad etish"
                cancelText="Bekor qilish"
                okButtonProps={{ danger: true }}
              >
                <Button 
                  danger
                  size="small"
                  className="font-semibold text-xs flex items-center gap-1.5"
                  loading={submitting}
                >
                  <X size={13} /> <span>Rad etish</span>
                </Button>
              </Popconfirm>
            </>
          )}

          {abonent.status === 'ACTIVE' && (
            <>
              <Popconfirm
                title="Abonentni vaqtincha to'xtatish"
                description="Haqiqatan ham bu abonentni vaqtincha to'xtatmoqchimisiz?"
                onConfirm={() => handleStatusChange('SUSPENDED')}
                okText="Ha, to'xtatish"
                cancelText="Bekor qilish"
              >
                <Button 
                  size="small"
                  className="font-semibold text-xs flex items-center gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                  loading={submitting}
                >
                  <PauseCircle size={13} /> <span>To'xtatish</span>
                </Button>
              </Popconfirm>

              <Popconfirm
                title="Tarmoqdan uzish"
                description="Haqiqatan ham bu abonentni suv tarmog'idan uzmoqchimisiz?"
                onConfirm={() => handleStatusChange('DISCONNECTED')}
                okText="Ha, uzish"
                cancelText="Bekor qilish"
                okButtonProps={{ danger: true }}
              >
                <Button 
                  danger
                  size="small"
                  className="font-semibold text-xs flex items-center gap-1.5"
                  loading={submitting}
                >
                  <Power size={13} /> <span>Uzish</span>
                </Button>
              </Popconfirm>
            </>
          )}

          {(abonent.status === 'SUSPENDED' || abonent.status === 'DISCONNECTED') && (
            <Popconfirm
              title="Qayta faollashtirish"
              description="Abonentni qayta ACTIVE holatiga o'tkazmoqchimisiz?"
              onConfirm={() => handleStatusChange('ACTIVE')}
              okText="Ha, faollashtirish"
              cancelText="Bekor qilish"
            >
              <Button 
                size="small"
                className="font-semibold text-xs flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                loading={submitting}
              >
                <PlayCircle size={13} /> <span>Faollashtirish</span>
              </Button>
            </Popconfirm>
          )}

          {abonent.status === 'ARCHIVED' ? (
            <Button 
              size="small"
              className="font-semibold text-xs flex items-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setIsUnarchiveVisible(true)}
            >
              <Archive size={13} /> <span>{t('det.btnUnarchive')}</span>
            </Button>
          ) : (
            <Button 
              danger 
              size="small"
              className="font-semibold text-xs flex items-center gap-1.5"
              onClick={() => setIsArchiveVisible(true)}
            >
              <Archive size={13} /> <span>{t('det.btnArchive')}</span>
            </Button>
          )}

          <Button
            size="small"
            icon={<Edit size={13} />}
            onClick={openEditModal}
            className="font-semibold text-xs"
          >
            Tahrirlash
          </Button>
        </div>
      </div>

      {abonent.status === 'PENDING' && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-950">Abonent tasdiqlanishi kutilmoqda</h4>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">Kutilmoqda</span>
              </div>
              <p className="text-xs text-amber-850 mt-0.5">
                Ushbu abonent bazaga kiritilgan, ammo hali tasdiqlanmagan. To'lovlar va xizmatlar to'liq faol bo'lishi uchun abonentni tasdiqlang yoki rad eting.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <Popconfirm
              title="Abonentni tasdiqlash"
              description="Haqiqatan ham bu abonentni tasdiqlab, 'Faol' (ACTIVE) holatiga o'tkazmoqchimisiz?"
              onConfirm={() => handleStatusChange('ACTIVE')}
              okText="Ha, tasdiqlash"
              cancelText="Bekor qilish"
            >
              <Button 
                type="primary" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 h-8 shadow-xs"
                loading={submitting}
              >
                <Check size={14} /> <span>Tasdiqlash (Faollashtirish)</span>
              </Button>
            </Popconfirm>

            <Popconfirm
              title="Abonentni rad etish"
              description="Haqiqatan ham bu abonentni rad etib, arxivga o'tkazmoqchimisiz?"
              onConfirm={() => handleStatusChange('ARCHIVED')}
              okText="Ha, rad etish"
              cancelText="Bekor qilish"
              okButtonProps={{ danger: true }}
            >
              <Button 
                danger 
                className="font-semibold text-xs flex items-center gap-1.5 h-8"
                loading={submitting}
              >
                <X size={14} /> <span>Rad etish</span>
              </Button>
            </Popconfirm>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Column - Profile & Info */}
        <div className="xl:col-span-4 flex flex-col gap-3.5">
          {/* Profile Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-base">
                  {abonent.fullName?.charAt(0) || 'A'}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">{abonent.fullName}</h2>
                  <span className="font-mono text-xs text-slate-500">{abonent.abonentNumber}</span>
                </div>
              </div>
              <button 
                onClick={openEditModal} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                title="Tahrirlash"
              >
                <Edit size={14} />
              </button>
            </div>

            {/* Balance Tile */}
            <div className="mt-3.5 p-3 rounded-md border border-slate-200 bg-slate-50/75">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('det.balance')}</span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  abonent.balance > 0 ? 'bg-rose-50 text-rose-700' : (abonent.balance < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')
                }`}>
                  {abonent.balance > 0 ? t('det.debt') : (abonent.balance < 0 ? t('det.overpayment') : '0 qarz')}
                </span>
              </div>
              <div className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                abonent.balance > 0 ? 'text-rose-600' : (abonent.balance < 0 ? 'text-emerald-600' : 'text-slate-700')
              }`}>
                {Math.abs(abonent.balance).toLocaleString()} <span className="text-xs font-normal text-slate-500">{t('det.sum')}</span>
              </div>
            </div>

            {/* Attributes list */}
            <div className="mt-3.5 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                  <MapPin size={13} className="text-slate-400" />
                  <span>{t('det.address')}:</span>
                </span>
                <span className="font-medium text-slate-800 text-right">{address}</span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                  <Phone size={13} className="text-slate-400" />
                  <span>{t('det.phone')}:</span>
                </span>
                <span className="font-mono font-medium text-slate-800">{abonent.phone || t('det.notEntered')}</span>
              </div>

              {abonent.type === 'LEGAL' ? (
                <>
                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                      <Building2 size={13} className="text-slate-400" />
                      <span>STIR (INN):</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">{abonent.inn || '—'}</span>
                  </div>

                  {abonent.oked && (
                    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                        <FileText size={13} className="text-slate-400" />
                        <span>OKED kodi:</span>
                      </span>
                      <span className="font-mono font-medium text-slate-800">{abonent.oked}</span>
                    </div>
                  )}

                  {abonent.contractNumber && (
                    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                        <FileBarChart size={13} className="text-slate-400" />
                        <span>Shartnoma:</span>
                      </span>
                      <span className="font-medium text-slate-800">
                        № {abonent.contractNumber}
                        {abonent.contractDate && (
                          <span className="text-slate-400 font-mono text-[11px] ml-1">
                            ({dayjs(abonent.contractDate).format('DD.MM.YYYY')})
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                      <Gauge size={13} className="text-slate-400" />
                      <span>Quvur & Oqova:</span>
                    </span>
                    <span className="font-medium text-slate-800 flex items-center gap-1.5">
                      <span className="bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        ⌀{abonent.ConnectionPoints?.[0]?.pipeDiameterMm || abonent.pipeDiameterMm || 25} mm
                      </span>
                      {abonent.hasSewage ? (
                        <span className="bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded text-[10px]">
                          Oqova: Bor
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Oqovasiz</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                      <Droplet size={13} className="text-slate-400" />
                      <span>{t('det.tariff')}:</span>
                    </span>
                    <span className="font-medium text-slate-800">
                      {abonent.tariff?.category || 'B2B Tarif'} ({Number(abonent.tariff?.price || 0).toLocaleString()} UZS)
                    </span>
                  </div>

                  {abonent.treasuryAccount && (
                    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                        <Landmark size={13} className="text-purple-600" />
                        <span>G'azna sh/x:</span>
                      </span>
                      <span className="font-mono text-[11px] text-purple-700 text-right break-all">
                        {abonent.treasuryAccount}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                      <Percent size={13} className="text-emerald-500" />
                      <span>QQS stavkasi:</span>
                    </span>
                    <span className={`font-semibold ${abonent.vatPayer ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {abonent.vatPayer ? '12% QQS to\'lovchi' : 'QQSsiz'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                      <IdCard size={13} className="text-slate-400" />
                      <span>{t('det.responsible')}:</span>
                    </span>
                    <span className="font-medium text-slate-800">
                      {abonent.responsiblePerson ? (
                        <>
                          {abonent.responsiblePerson}
                          {abonent.responsiblePhone ? ` (${abonent.responsiblePhone})` : ''}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Kiritilmagan</span>
                      )}
                    </span>
                  </div>

                  {abonent.bankAccount && (
                    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                        <Banknote size={13} className="text-slate-400" />
                        <span>{t('det.bankDetails')}:</span>
                      </span>
                      <div className="text-right">
                        <div className="font-medium text-slate-800">{abonent.bankName || 'Bank'} (MFO: {abonent.mfo || '—'})</div>
                        <div className="font-mono text-[11px] text-slate-500">{abonent.bankAccount}</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                      <Users size={13} className="text-slate-400" />
                      <span>{t('det.family')}:</span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      {abonent.familyMembers} {t('det.person')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                      <Droplet size={13} className="text-slate-400" />
                      <span>{t('det.tariff')}:</span>
                    </span>
                    <span className="font-medium text-slate-800">
                      {abonent.tariff?.category} ({abonent.tariff?.price} UZS)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Stats, Chart, and Tabs */}
        <div className="xl:col-span-8 flex flex-col gap-3.5">
          {/* Analytics Mini-Tiles Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {abonent.type === 'LEGAL' ? (
              <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-50 text-sky-600 shrink-0">
                  <Building2 size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">
                    {abonent.legalCategory === 'BUDGET' ? "G'aznachilik Limiti" : abonent.legalCategory === 'INDUSTRIAL' ? "Quvur & Ekologiya" : "To'lov Shartlari"}
                  </p>
                  {abonent.legalCategory === 'BUDGET' ? (
                    <div>
                      <p className="text-sm font-bold text-purple-900 mt-0.5">
                        {abonent.AbonentLimits?.[0]?.actualVolumeM3 || 0} / {abonent.AbonentLimits?.[0]?.volumeLimitM3 || 2500} m³
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {Math.round(((Number(abonent.AbonentLimits?.[0]?.actualVolumeM3 || 0)) / (Number(abonent.AbonentLimits?.[0]?.volumeLimitM3 || 2500))) * 100)}% limit sarflandi
                      </p>
                    </div>
                  ) : abonent.legalCategory === 'INDUSTRIAL' ? (
                    <div>
                      <p className="text-sm font-bold text-amber-900 mt-0.5">
                        ⌀{abonent.ConnectionPoints?.[0]?.pipeDiameterMm || 25} mm | PDK {abonent.pdkCoefficient || 1.0}x
                      </p>
                      <p className="text-[10px] text-teal-600 font-medium">
                        {abonent.hasSewage ? "Kanalizatsiya: Bor" : "Kanalizatsiya: Yo'q"}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        Avans: {abonent.advancePaymentPercent || 100}%
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        OKED: {abonent.oked || 'Mavjud emas'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600 shrink-0">
                  <Users size={16} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">{t('det.familyMembers')}</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{abonent.familyMembers} {t('det.person')}</p>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 shrink-0">
                <History size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">{t('det.lastPayment')}</p>
                <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5 truncate">
                  {Number(payments.find((p: any) => p.status === 'ACCEPTED')?.amount || 0).toLocaleString()} {t('det.sum')}
                </p>
                {payments.find((p: any) => p.status === 'ACCEPTED') && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    {dayjs(payments.find((p: any) => p.status === 'ACCEPTED').date).format('DD.MM.YYYY')}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-50 text-sky-600 shrink-0">
                <Gauge size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">{t('det.meter')}</p>
                {!meter ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold text-slate-500">{t('det.noMeter')}</span>
                    <button 
                      onClick={() => setIsAddMeterVisible(true)} 
                      className="text-sky-600 hover:text-sky-700 text-xs font-semibold underline cursor-pointer"
                    >
                      {t('det.addMeter')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-mono font-bold text-xs text-slate-900 flex items-center gap-1 truncate">
                      {meter.number}
                      {meter.status === 'FAULTY' && <AlertTriangle size={13} className="text-rose-500 shrink-0" />}
                    </span>
                    {meter.status === 'ACTIVE' && (
                      <Popconfirm title={t('det.faultyConfirm')} onConfirm={() => handleFaultyMeter(meter.id)}>
                        <button className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer">
                          {t('det.markFaulty')}
                        </button>
                      </Popconfirm>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Consumption Chart */}
          {chartData.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileBarChart size={15} className="text-sky-600" /> <span>{t('det.chart')} (m³)</span>
              </h3>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Bar dataKey="Hajm" fill="#0284c7" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Data Tables Tabs */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
            <Tabs defaultActiveKey="1" className="px-3 pt-2" items={[
              {
                key: '1',
                label: <span className="text-xs font-semibold px-2">{t('det.tabReadings')} ({readings.length})</span>,
                children: (
                  <Table 
                    dataSource={readings} 
                    rowKey="id" 
                    pagination={{ pageSize: 10, size: 'small', className: 'p-2' }}
                    size="small"
                    className="w-full"
                    columns={[
                      { title: t('det.colPeriod'), dataIndex: 'period', key: 'period', width: 110 },
                      { title: t('det.colValue'), dataIndex: 'value', key: 'value', render: (val) => <span className="font-mono font-semibold">{val} m³</span> },
                      { title: t('det.colDate'), dataIndex: 'createdAt', key: 'createdAt', width: 120, render: (val) => <span className="font-mono text-xs">{dayjs(val).format('DD.MM.YYYY')}</span> },
                      { title: t('det.colPhoto'), dataIndex: 'imageUrl', key: 'imageUrl', width: 90, render: (val) => val ? <a href={val.startsWith('http') ? val : `${window.location.origin}${val}`} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline text-xs">{t('det.colView')}</a> : <span className="text-slate-400 text-xs">-</span> }
                    ]}
                  />
                )
              },
              {
                key: '2',
                label: <span className="text-xs font-semibold px-2">{t('det.tabInvoices')} ({invoices.length})</span>,
                children: (
                  <Table 
                    dataSource={invoices} 
                    rowKey="id" 
                    pagination={{ pageSize: 10, size: 'small', className: 'p-2' }}
                    size="small"
                    columns={[
                      { title: t('det.colPeriod'), dataIndex: 'period', key: 'period', width: 110 },
                      { title: t('det.colSum'), dataIndex: 'amount', key: 'amount', render: (val) => <span className="font-mono font-semibold tabular-nums">{Number(val).toLocaleString()} UZS</span> },
                      { title: t('det.colDocType'), dataIndex: 'documentType', key: 'documentType', render: (val) => val === 'SCHYOT_FAKTURA' ? <Tag className="text-[11px] font-medium border-0 bg-sky-50 text-sky-700">Faktura</Tag> : <Tag className="text-[11px] font-medium border-0 bg-slate-100 text-slate-700">Kvitansiya</Tag> },
                      { title: t('det.colStatus'), dataIndex: 'status', key: 'status', width: 110, render: (val: string) => <Tag className="text-[11px] font-medium border-0">{t('status.' + val?.toLowerCase())}</Tag> },
                      { 
                        title: t('det.colActions'), 
                        key: 'action', 
                        width: 140,
                        render: (_, record: any) => (
                          <div className="flex items-center gap-2">
                            {abonent.type === 'LEGAL' && (
                              <Button 
                                type="link" 
                                size="small"
                                icon={<FileText size={13} />}
                                onClick={() => setEFacturaVisible(true)}
                                className="text-xs font-semibold text-indigo-600 p-0 flex items-center gap-0.5"
                              >
                                EHF
                              </Button>
                            )}
                            {record.documentType === 'SCHYOT_FAKTURA' && (
                              <Button 
                                type="link" 
                                size="small"
                                icon={<Download size={13} />}
                                onClick={() => handleDownloadPdf(record.id)}
                                className="text-xs font-semibold text-sky-600 p-0 flex items-center gap-0.5"
                              >
                                PDF
                              </Button>
                            )}
                          </div>
                        ) 
                      }
                    ]}
                  />
                )
              },
              {
                key: '3',
                label: <span className="text-xs font-semibold px-2">{t('det.tabPayments')} ({payments.length})</span>,
                children: (
                  <Table 
                    dataSource={payments} 
                    rowKey="id" 
                    pagination={{ pageSize: 10, size: 'small', className: 'p-2' }}
                    size="small"
                    columns={[
                      { title: t('det.colSum'), dataIndex: 'amount', key: 'amount', render: (val) => <span className="font-mono font-bold text-emerald-600 tabular-nums">{Number(val).toLocaleString()} UZS</span> },
                      { title: 'Metod', dataIndex: 'paymentMethod', key: 'paymentMethod', width: 100, render: (val: string) => <Tag className="text-[11px] font-medium border-0">{val}</Tag> },
                      { title: 'Kvitansiya', dataIndex: 'receiptNumber', key: 'receiptNumber', render: (val) => <span className="font-mono text-xs">{val || '—'}</span> },
                      { title: t('det.colStatus'), dataIndex: 'status', key: 'status', width: 110, render: (val: string) => <Tag className="text-[11px] font-medium border-0 bg-emerald-50 text-emerald-700">{t('status.' + val?.toLowerCase())}</Tag> },
                      { title: t('det.colDate'), dataIndex: 'date', key: 'date', width: 110, render: (val) => <span className="font-mono text-xs">{dayjs(val).format('DD.MM.YYYY')}</span> },
                      { title: t('det.colComment'), dataIndex: 'comment', key: 'comment', render: (val: string) => val ? <span className="text-xs text-slate-500 truncate max-w-[150px] block">{val}</span> : '-' },
                      { 
                        title: t('det.colActions'), 
                        key: 'action', 
                        width: 80,
                        render: (_, record: any) => (
                          record.status === 'ACCEPTED' ? (
                            <Button size="small" danger className="text-xs font-semibold" onClick={() => setCancelPaymentId(record.id)}>{t('det.colCancel')}</Button>
                          ) : null
                        ) 
                      }
                    ]}
                  />
                )
              },
              {
                key: '4',
                label: <span className="text-xs font-semibold px-2">{t('det.tabReplacements')} ({meterReplacements.length})</span>,
                children: (
                  <Table 
                    dataSource={meterReplacements} 
                    rowKey="id" 
                    pagination={{ pageSize: 10, size: 'small', className: 'p-2' }}
                    size="small"
                    columns={[
                      { title: t('det.colDate'), dataIndex: 'createdAt', key: 'createdAt', width: 110, render: (val) => <span className="font-mono text-xs">{dayjs(val).format('DD.MM.YYYY')}</span> },
                      { title: t('det.colAct'), key: 'act', render: (_: any, r: any) => `#${r.actNumber} (${dayjs(r.actDate).format('DD.MM.YYYY')})` },
                      { title: t('det.colOldMeter'), key: 'oldMeter', render: (_: any, r: any) => `${r.oldMeter?.number} (${t('det.colReading')}: ${r.oldMeterFinalReading})` },
                      { title: t('det.colNewMeter'), key: 'newMeter', render: (_: any, r: any) => r.newMeter?.number },
                      { title: t('det.colReason'), dataIndex: 'reason', key: 'reason', render: (val) => val || '-' }
                    ]}
                  />
                )
              },
              ...(abonent.type === 'LEGAL' ? [
                {
                  key: 'sanctions',
                  label: <span className="text-xs font-semibold px-2 text-amber-700">Quvur sanksiyalari ({abonent.SanctionLogs?.length || 0})</span>,
                  children: (
                    <div className="space-y-3 p-1">
                      <div className="flex justify-between items-center bg-amber-50/60 p-3 rounded-lg border border-amber-200 text-xs">
                        <div>
                          <span className="font-semibold text-amber-950">VMQ 194-sonli Nizom bo'yicha tuzilgan dalolatnomalar</span>
                          <p className="text-[11px] text-amber-800 mt-0.5">Hisoblagich nosozligi yoki tamg'a uzilgan holatlarda quvur o'tkazuvchanligi bo'yicha hisoblangan dalolatnomalar</p>
                        </div>
                        <Button 
                          size="small" 
                          className="bg-amber-600 text-white hover:bg-amber-700 font-semibold text-xs border-0"
                          onClick={() => setSanctionActDocVisible(true)}
                        >
                          + Yangi dalolatnoma
                        </Button>
                      </div>
                      <Table
                        dataSource={abonent.SanctionLogs || []}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 5 }}
                        locale={{ emptyText: "Sanksiya dalolatnomalari mavjud emas" }}
                        columns={[
                          { title: 'Akt №', dataIndex: 'actNumber', key: 'actNumber', render: (val) => <span className="font-mono font-bold text-xs">{val}</span> },
                          { title: 'Sana', dataIndex: 'actDate', key: 'actDate', render: (val) => <span className="font-mono text-xs">{val ? dayjs(val).format('DD.MM.YYYY') : '—'}</span> },
                          { title: 'Quvur', dataIndex: 'pipeDiameterMm', key: 'pipeDiameterMm', render: (val) => <span className="font-mono font-semibold">⌀{val} mm</span> },
                          { title: 'Hisoblangan hajm', dataIndex: 'calculatedVolumeM3', key: 'calculatedVolumeM3', render: (val) => <span className="font-mono">{Number(val || 0).toLocaleString()} m³</span> },
                          { title: 'Jami summa', dataIndex: 'totalSanctionAmount', key: 'totalSanctionAmount', render: (val) => <span className="font-mono font-bold text-rose-600">{Number(val || 0).toLocaleString()} UZS</span> },
                          { title: 'Sabab', dataIndex: 'reason', key: 'reason', ellipsis: true },
                          { 
                            title: 'Amal', 
                            key: 'action', 
                            width: 80,
                            render: () => (
                              <Button size="small" type="link" className="p-0 text-xs font-semibold text-sky-600" onClick={() => setSanctionActDocVisible(true)}>
                                Ko'rish
                              </Button>
                            ) 
                          }
                        ]}
                      />
                    </div>
                  )
                },
                ...(abonent.legalCategory === 'BUDGET' ? [
                  {
                    key: 'limits',
                    label: <span className="text-xs font-semibold px-2 text-purple-700">G'azna limitlari ({abonent.AbonentLimits?.length || 0})</span>,
                    children: (
                      <div className="space-y-3 p-1">
                        <div className="flex justify-between items-center bg-purple-50/60 p-3 rounded-lg border border-purple-200 text-xs">
                          <div>
                            <span className="font-semibold text-purple-950">G'aznachilik va UzASBO yillik limiti nazorati</span>
                            <p className="text-[11px] text-purple-800 mt-0.5">Yillik va oylik tasdiqlangan limitlar va ularning haqiqiy sarflanish holati</p>
                          </div>
                          <Button 
                            size="small" 
                            className="bg-purple-600 text-white hover:bg-purple-700 font-semibold text-xs border-0"
                            onClick={() => setSpravkaModalVisible(true)}
                          >
                            Spravka-raschet
                          </Button>
                        </div>
                        <Table
                          dataSource={abonent.AbonentLimits || []}
                          rowKey="id"
                          size="small"
                          pagination={false}
                          locale={{ emptyText: "Limit ma'lumotlari kiritilmagan" }}
                          columns={[
                            { title: 'Yil', dataIndex: 'year', key: 'year', render: (val) => <strong>{val}-yil</strong> },
                            { title: 'Hajm limiti', dataIndex: 'volumeLimitM3', key: 'volumeLimitM3', render: (val) => <span className="font-mono font-semibold">{val} m³</span> },
                            { title: 'Haqiqiy sarf', dataIndex: 'actualVolumeM3', key: 'actualVolumeM3', render: (val) => <span className="font-mono">{val || 0} m³</span> },
                            { title: 'Moliyaviy limit', dataIndex: 'amountLimitUzs', key: 'amountLimitUzs', render: (val) => <span className="font-mono">{Number(val || 0).toLocaleString()} UZS</span> },
                            { 
                              title: 'Holat', 
                              key: 'status', 
                              render: (_, r: any) => {
                                const pct = Math.round(((Number(r.actualVolumeM3 || 0)) / (Number(r.volumeLimitM3 || 1))) * 100);
                                const isOver = pct >= 100;
                                const isWarn = pct >= (r.warningThreshold || 80);
                                return (
                                  <Tag color={isOver ? 'error' : isWarn ? 'warning' : 'success'}>
                                    {pct}% {isOver ? '(Oshgan)' : isWarn ? '(Xavf)' : '(Normal)'}
                                  </Tag>
                                );
                              } 
                            }
                          ]}
                        />
                      </div>
                    )
                  }
                ] : []),
                {
                  key: 'facilities',
                  label: <span className="text-xs font-semibold px-2">Ulanish nuqtalari ({abonent.ConnectionPoints?.length || 0})</span>,
                  children: (
                    <div className="space-y-3 p-1">
                      <Table
                        dataSource={abonent.ConnectionPoints || []}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        locale={{ emptyText: "Ulanish nuqtalari mavjud emas" }}
                        columns={[
                          { title: 'Nuqta nomi', dataIndex: 'name', key: 'name' },
                          { title: 'Quvur diametri', dataIndex: 'pipeDiameterMm', key: 'pipeDiameterMm', render: (val) => <span className="font-mono font-bold">⌀{val} mm</span> },
                          { title: 'Bosim (Bar)', dataIndex: 'waterPressureBar', key: 'waterPressureBar', render: (val) => <span className="font-mono">{val || 2.5} bar</span> },
                          { title: 'Kanalizatsiya', dataIndex: 'hasSewage', key: 'hasSewage', render: (val) => val ? <Tag color="teal">Mavjud</Tag> : <Tag>Mavjud emas</Tag> },
                          { title: 'Oqova koeff.', dataIndex: 'sewageRatio', key: 'sewageRatio', render: (val) => <span className="font-mono">{val || 1.0}x</span> },
                          { title: 'Status', dataIndex: 'status', key: 'status', render: (val) => <Tag color={val === 'ACTIVE' ? 'success' : 'default'}>{val}</Tag> }
                        ]}
                      />
                    </div>
                  )
                }
              ] : [
                {
                  key: '5',
                  label: <span className="text-xs font-semibold px-2">{t('det.tabDebtHistory')} ({debtCancellations.length})</span>,
                  children: (
                    <Table 
                      dataSource={debtCancellations} 
                      rowKey="id" 
                      pagination={{ pageSize: 10, size: 'small', className: 'p-2' }}
                      size="small"
                      columns={[
                        { title: t('det.colAct'), dataIndex: 'actNumber', key: 'actNumber', width: 110 },
                        { title: t('det.colDate'), dataIndex: 'actDate', key: 'actDate', width: 110, render: (val) => <span className="font-mono text-xs">{dayjs(val).format('DD.MM.YYYY')}</span> },
                        { title: t('det.colCancelledSum'), dataIndex: 'amount', key: 'amount', render: (val) => <span className="text-rose-600 font-bold font-mono tabular-nums">{Number(val).toLocaleString()} UZS</span> },
                        { title: t('det.colReason'), dataIndex: 'reason', key: 'reason' },
                        { 
                          title: t('det.colFile'), 
                          dataIndex: 'actImageUrl', 
                          key: 'actImageUrl', 
                          width: 90,
                          render: (url) => url && /^https?:\/\//.test(url) ? <a href={url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline text-xs">{t('det.colView')}</a> : '-'
                        }
                      ]}
                    />
                  )
                }
              ])
            ]} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal 
        title="Qo'shimcha hisoblash (Korrektirovka)" 
        open={isManualChargeVisible} 
        onCancel={() => {
          setIsManualChargeVisible(false);
          manualChargeForm.resetFields();
        }}
        footer={null}
      >
        <Form layout="vertical" form={manualChargeForm} onFinish={handleManualCharge}>
          <div className="bg-warning-container/20 p-4 rounded-xl mb-4 border border-warning-container">
            <p className="text-sm text-warning-content flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              Diqqat! Bu funksiya abonentga qo'lda qarz yozish uchun ishlatiladi. Kiritilgan summa abonentning joriy qarziga qo'shiladi. Ushbu harakat tarixda saqlanadi.
            </p>
          </div>
          <Form.Item 
            name="amount" 
            label="Qo'shiladigan qarz summasi (so'm)" 
            rules={[{ required: true, message: 'Summani kiriting' }]}
          >
            <Input type="number" placeholder="Masalan: 150000" />
          </Form.Item>
          <Form.Item 
            name="reason" 
            label="Sabab (Izoh)" 
            rules={[{ required: true, message: 'Sababni kiriting' }]}
          >
            <Input.TextArea rows={3} placeholder="Masalan: Tizimga kiritilmasdan oldingi arxiv qarzdorlik" />
          </Form.Item>
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setIsManualChargeVisible(false)}>
              {t('det.btnCancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} danger>
              Qarz yozish
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal title={t('det.editTitle')} open={isEditVisible} onCancel={() => setIsEditVisible(false)} footer={null}>
        <Form layout="vertical" form={editForm} onFinish={handleEditAbonent}>
          {abonent.type === 'LEGAL' ? (
            <>
              <Form.Item name="lastName" label={t('det.editOrgName')} rules={[{required: true}]}>
                <Input />
              </Form.Item>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="responsiblePerson" label={t('det.editResponsible')} rules={[{required: true}]}>
                  <Input />
                </Form.Item>
                <Form.Item name="responsiblePhone" label={t('det.editResponsiblePhone')} rules={[{required: true}]}>
                  <Input />
                </Form.Item>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="bankName" label={t('det.editBankName')} rules={[{required: true}]}>
                  <Input />
                </Form.Item>
                <Form.Item name="mfo" label={t('det.editMfo')} rules={[{required: true}]}>
                  <Input />
                </Form.Item>
              </div>
              <Form.Item name="bankAccount" label={t('det.editAccount')} rules={[{required: true}]}>
                <Input />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="lastName" label={t('det.editLastName')} rules={[{required: true}]}>
                <Input />
              </Form.Item>
              <Form.Item name="firstName" label={t('det.editFirstName')} rules={[{required: true}]}>
                <Input />
              </Form.Item>
              <Form.Item name="middleName" label={t('det.editMiddleName')} rules={[{required: true}]}>
                <Input />
              </Form.Item>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="phone" label={t('det.editPhone')}>
              <Input />
            </Form.Item>
            {abonent.type === 'PHYSICAL' && (
              <Form.Item name="passport" label={t('det.editPassport')}>
                <Input />
              </Form.Item>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="inn" label={t('det.editInn')}>
              <Input />
            </Form.Item>
            <Form.Item name="birthDate" label={t('det.editBirthDate')}>
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="house" label={t('det.editHouse')} rules={[{required: true}]}>
              <Input />
            </Form.Item>
            <Form.Item name="apartment" label={t('det.editApartment')}>
              <Input />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="familyMembers" label={t('det.editFamilyCount')} rules={[{required: true}]}>
              <Input type="number" />
            </Form.Item>
            <Form.Item name="discountPercent" label={t('det.editDiscount')}>
              <Input type="number" min={0} max={100} />
            </Form.Item>
          </div>
          <Form.Item 
            name="tariffId" 
            label={t('det.tariff') || "Biriktirilgan Tarif"} 
            rules={[{ required: true, message: "Tarifni tanlang" }]}
          >
            <Select 
              showSearch 
              optionFilterProp="children"
              placeholder="Tarifni tanlang"
            >
              {tariffs.map((t: any) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.category} ({t.type === 'METERED' ? 'Hisoblagichli' : 'Normativ'}) - {Number(t.price).toLocaleString()} so'm
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {/* Status field removed for security. Status changes should use specific actions (Archive, Suspend, etc.) */}
          <Button type="primary" htmlType="submit" className="w-full" loading={submitting}>{t('det.save')}</Button>

        </Form>
      </Modal>

      <Modal title={t('det.cancelDebtTitle')} open={isCancelDebtVisible} onCancel={() => setIsCancelDebtVisible(false)} footer={null}>
        <Form layout="vertical" form={cancelDebtForm} onFinish={handleCancelDebt}>
          <Form.Item name="actNumber" label={t('det.cancelDebtActNum')} rules={[{required: true}]}>
            <Input />
          </Form.Item>
          <Form.Item name="actDate" label={t('det.cancelDebtDate')} rules={[{required: true}]}>
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="amount" label={t('det.cancelDebtSum')} rules={[{required: true}]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="reason" label={t('det.cancelDebtReason')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item 
            name="actImage" 
            label={t('det.cancelDebtImage')} 
            valuePropName="fileList" 
            getValueFromEvent={normFile}
            rules={[{required: true, message: t('det.cancelDebtImageReq')}]}
          >
            <Upload customRequest={customUpload} maxCount={1} listType="picture">
              <Button icon={<UploadIcon size={16} />}>{t('det.cancelDebtUpload')}</Button>
            </Upload>
          </Form.Item>
          <Button type="primary" htmlType="submit" className="w-full" loading={submitting}>{t('det.save')}</Button>
        </Form>
      </Modal>

      <Modal title={t('det.readingTitle')} open={isAddReadingVisible} onCancel={() => setIsAddReadingVisible(false)} footer={null}>
        <Form layout="vertical" form={readingForm} onFinish={handleAddReading}>
          {meter && (
            <div className="bg-surface-container-low p-4 rounded-xl mb-4 border border-outline-variant/30 flex justify-between">
              <div>
                <p className="text-[11px] font-medium text-outline uppercase tracking-wider mb-1">{t('det.readingLast')}</p>
                <p className="font-bold text-on-surface">{meter.lastReading || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium text-outline uppercase tracking-wider mb-1">{t('det.readingLastDate')}</p>
                <p className="font-bold text-on-surface">
                  {meter.lastReadingDate ? dayjs(meter.lastReadingDate).format('DD.MM.YYYY') : 'Yo\'q'}
                </p>
              </div>
            </div>
          )}

          <Form.Item name="date" label={t('det.readingDate')} rules={[{required: true}]}>
            <DatePicker 
              className="w-full" 
              format="YYYY-MM-DD" 
              disabledDate={(current) => meter?.lastReadingDate ? current && current.valueOf() < dayjs(meter.lastReadingDate).startOf('day').valueOf() : false}
            />
          </Form.Item>
          <Form.Item 
            name="value" 
            label={t('det.readingValue')}
            rules={[
              {required: true},
              () => ({
                validator(_, value) {
                  if (!value || !meter?.lastReading || parseFloat(value) >= parseFloat(meter.lastReading)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('det.readingValidation')));
                },
              })
            ]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item name="imageUrl" label={t('det.readingPhoto')} valuePropName="fileList" getValueFromEvent={normFile}>
            <Upload customRequest={customUpload} maxCount={1} listType="picture">
              <Button icon={<UploadIcon size={16} />}>{t('det.readingUpload')}</Button>
            </Upload>
          </Form.Item>
          <Button type="primary" htmlType="submit" className="w-full" loading={submitting}>{t('det.save')}</Button>
        </Form>
      </Modal>

      <Modal title={t('det.payTitle')} open={isAddPaymentVisible} onCancel={() => setIsAddPaymentVisible(false)} footer={null}>
        <Form layout="vertical" form={paymentForm} onFinish={handleAddPayment}>
          <Form.Item name="amount" label={t('det.paySum')} rules={[{required: true}]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label={t('det.payReceipt')}>
            <Input disabled value={t('det.payReceiptAuto')} className="bg-surface-container-low text-outline font-medium" />
          </Form.Item>
          <Form.Item name="comment" label={t('det.payComment')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" className="w-full" loading={submitting}>{t('det.save')}</Button>
        </Form>
      </Modal>

      <Modal title={t('det.meterTitle')} open={isAddMeterVisible} onCancel={() => setIsAddMeterVisible(false)} footer={null}>
        <Form layout="vertical" form={meterForm} onFinish={handleAddMeter}>
          <Form.Item name="number" label={t('det.meterNumber')} rules={[{ required: true }]}>
            <Input placeholder={t('det.phMeterNumber')} />
          </Form.Item>
          <Form.Item name="model" label={t('det.meterModel')}>
            <Input placeholder={t('det.phMeterModel')} />
          </Form.Item>
          <Form.Item name="certificateNumber" label={t('det.meterCert')}>
            <Input placeholder={t('det.phMeterCert')} />
          </Form.Item>
          <Form.Item name="installedAt" label={t('det.meterInstalled')} rules={[{ required: true }]}>
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="checkDate" label={t('det.meterCheckDate')} rules={[{ required: true }]}>
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="initialReading" label={t('det.meterInitial')}>
            <InputNumber className="w-full" min={0} placeholder={t('det.phMeterInitial')} />
          </Form.Item>
          <Button type="primary" htmlType="submit" className="w-full" loading={submitting}>{t('det.save')}</Button>
        </Form>
      </Modal>

      {/* Meter Replacement Wizard */}
      {meter && (
        <MeterReplacementWizard
          visible={isWizardVisible}
          onCancel={() => setIsWizardVisible(false)}
          abonentId={abonent.id}
          oldMeterId={meter.id}
          oldMeterLastReading={meter.lastReading ? parseFloat(meter.lastReading) : 0}
          onSuccess={() => fetchAbonent(abonent.id)}
        />
      )}

      {/* Archive Modal */}
      <Modal
        title={t('det.archiveTitle')}
        open={isArchiveVisible}
        onOk={handleArchive}
        onCancel={() => setIsArchiveVisible(false)}
        confirmLoading={submitting}
        okText={t('det.archiveOk')}
        okButtonProps={{ danger: true }}
      >
        <p className="mb-4 text-gray-600">{t('det.archiveText')}</p>
        <Input.TextArea 
          rows={4} 
          placeholder={t('det.archivePlaceholder')}
          value={archiveReason}
          onChange={(e) => setArchiveReason(e.target.value)}
        />
      </Modal>

      {/* Unarchive Modal */}
      <Modal
        title={t('det.unarchiveTitle')}
        open={isUnarchiveVisible}
        onOk={handleUnarchive}
        onCancel={() => setIsUnarchiveVisible(false)}
        confirmLoading={submitting}
        okText={t('det.unarchiveOk')}
        okButtonProps={{ style: { backgroundColor: '#10b981', borderColor: '#10b981' } }}
      >
        <p className="mb-4 text-gray-600">{t('det.unarchiveText')}</p>
        <Input.TextArea 
          rows={4} 
          placeholder={t('det.unarchivePlaceholder')}
          value={unarchiveReason}
          onChange={(e) => setUnarchiveReason(e.target.value)}
        />
      </Modal>
      {/* Cancel Payment Modal */}
      <Modal
        title={t('det.stornoTitle')}
        open={!!cancelPaymentId}
        onOk={confirmCancelPayment}
        onCancel={() => {
          setCancelPaymentId(null);
          setCancelPaymentReason('');
        }}
        confirmLoading={submitting}
        okText={t('det.stornoOk')}
        okButtonProps={{ danger: true }}
        cancelText={t('det.stornoClose')}
      >
        <div className="py-4">
          <p className="mb-2 text-gray-600">{t('det.stornoText')}</p>
          <Input.TextArea
            value={cancelPaymentReason}
            onChange={(e) => setCancelPaymentReason(e.target.value)}
            placeholder={t('det.stornoPlaceholder')}
            rows={4}
          />
        </div>
      </Modal>

      <Modal
        title="Click Havola Yaratish"
        open={isClickLinkVisible}
        onCancel={() => {
          setIsClickLinkVisible(false);
          setClickLinkUrl('');
          setClickLinkAmount(null);
        }}
        footer={null}
      >
        {!clickLinkUrl ? (
          <div className="flex flex-col gap-4">
            <p className="text-slate-600">Abonent uchun to'lov havolasini generatsiya qilish. Agar qarz bo'lsa, avtomat summa yozilgan.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To'lov summasi</label>
              <InputNumber 
                className="w-full" 
                min={0} 
                value={clickLinkAmount} 
                onChange={val => setClickLinkAmount(val)} 
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                placeholder="Summani kiriting"
              />
            </div>
            <Button type="primary" onClick={handleGenerateClickLink} loading={generatingClickLink} className="w-full bg-indigo-600 hover:bg-indigo-700 border-none">
              Havola yaratish
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 py-4">
            <QRCodeCanvas value={clickLinkUrl} size={200} level="H" includeMargin />
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">To'lov havolasi</label>
              <div className="flex gap-2">
                <Input value={clickLinkUrl} readOnly />
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(clickLinkUrl);
                    message.success("Havola nusxalandi!");
                  }}
                  type="default"
                >
                  Nusxalash
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">
              Mijoz ushbu QR kodni telefon orqali skanerlab yoxud havolaga o'tib to'lovni amalga oshirishi mumkin. To'lov o'tgach, tizim avtomatik ravishda tasdiqlaydi.
            </p>
          </div>
        )}
      </Modal>

      {/* 9. RASMIY HUJJAT MODALLARI: EHF, AKT-SVERKA, SANSIYA AKTI, SPRAVKA-RASCHET, PRETENZIYA */}
      {abonent && (
        <>
          <EFacturaViewer
            visible={eFacturaVisible}
            onClose={() => setEFacturaVisible(false)}
            abonent={abonent}
            tenantInfo={{
              name: abonent.tenant?.name || "Chust Tumani Suv Ta'minoti Korxonasi",
              inn: abonent.tenant?.inn || "201555001",
              vatCode: abonent.tenant?.vatCode || "326000001520",
              address: abonent.tenant?.address || "Namangan viloyati, Chust tumani, Chust sh., Mustaqillik ko'chasi, 12-uy",
              account: abonent.tenant?.bankAccount || "20208000900000152010",
              bankName: abonent.tenant?.bankName || "ATB Agrobank Chust filiali",
              mfo: abonent.tenant?.mfo || "00152",
              directorName: abonent.tenant?.directorName || "Qodirov Dilshodbek Rustamovich",
              accountantName: abonent.tenant?.accountantName || "Soliyev Akramjon Ne'matillayevich"
            }}
          />

          <AktSverkaOfficial
            visible={officialAktSverkaVisible}
            onClose={() => setOfficialAktSverkaVisible(false)}
            abonent={abonent}
            aktData={officialAktData}
          />

          <SanctionActOfficial
            visible={sanctionActDocVisible}
            onClose={() => setSanctionActDocVisible(false)}
            abonent={abonent}
            actData={abonent.SanctionLogs?.[0] || {
              actNumber: `AKT-${dayjs().format('MMDD')}-101`,
              actDate: dayjs().format('YYYY-MM-DD'),
              pipeDiameterMm: abonent.ConnectionPoints?.[0]?.pipeDiameterMm || 25,
              durationHours: 24,
              assumedVelocityMps: 1.2,
              calculatedVolumeM3: 42.41,
              tariffPrice: Number(abonent.tariff?.price) || 5000,
              baseAmount: 212050,
              vatAmount: 25446,
              totalSanctionAmount: 237496,
              reason: "Hisoblagich nosozligi yoki tamg'a buzilishi holati",
              inspectorName: "M. Qodirov (Katta nazoratchi)",
              customerRepName: abonent.responsiblePerson || abonent.fullName
            }}
          />

          <SpravkaRaschetOfficial
            visible={spravkaModalVisible}
            onClose={() => setSpravkaModalVisible(false)}
            abonent={abonent}
            tenantInfo={{
              name: abonent.tenant?.name || "Chust Tumani Suv Ta'minoti Korxonasi",
              inn: abonent.tenant?.inn || "201555001",
              vatCode: abonent.tenant?.vatCode || "326000001520",
              address: abonent.tenant?.address || "Namangan viloyati, Chust tumani",
              account: abonent.tenant?.bankAccount || "20208000900000152010",
              bankName: abonent.tenant?.bankName || "ATB Agrobank Chust filiali",
              mfo: abonent.tenant?.mfo || "00152",
              directorName: abonent.tenant?.directorName || "Qodirov D.R.",
              accountantName: abonent.tenant?.accountantName || "Soliyev A.N."
            }}
          />

          <PretenziyaOfficial
            visible={pretenziyaModalVisible}
            onClose={() => setPretenziyaModalVisible(false)}
            abonent={abonent}
            tenantInfo={{
              name: abonent.tenant?.name || "Chust Tumani Suv Ta'minoti Korxonasi",
              inn: abonent.tenant?.inn || "201555001",
              vatCode: abonent.tenant?.vatCode || "326000001520",
              address: abonent.tenant?.address || "Namangan viloyati, Chust tumani",
              account: abonent.tenant?.bankAccount || "20208000900000152010",
              bankName: abonent.tenant?.bankName || "ATB Agrobank Chust filiali",
              mfo: abonent.tenant?.mfo || "00152",
              directorName: abonent.tenant?.directorName || "Qodirov D.R.",
              accountantName: abonent.tenant?.accountantName || "Soliyev A.N."
            }}
          />
        </>
      )}
    </div>
  );
};

export default AbonentDetails;
