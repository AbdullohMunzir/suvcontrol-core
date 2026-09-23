import React, { useEffect, useState } from 'react';
import { Button, Input, Modal, Form, Switch, message, Popconfirm, Tag, Empty } from 'antd';
import { Plus, Trash2, Users, Phone, ShieldCheck, Printer, Calendar, UserPlus, KeyRound, User, CreditCard, Copy, Check, ArrowRight, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import dayjs from 'dayjs';
import { useLanguage } from '../../contexts/LanguageContext';

const Collectors: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCollector, setEditingCollector] = useState<any>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);


  const copyLogin = (login: string, id: string) => {
    navigator.clipboard.writeText(login);
    setCopiedId(id);
    message.success("Login nusxalandi");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchCollectors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/collectors');
      setData(res.data);
    } catch (error) {
      message.error("Pul yig'uvchilarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectors();
  }, []);

  const handleAdd = async (values: any) => {
    setSubmitting(true);
    try {
      await api.post('/collectors', values);
      message.success("Pul yig'uvchi qo'shildi");
      setIsModalVisible(false);
      form.resetFields();
      fetchCollectors();
    } catch (error: any) {
      message.error(error.response?.data?.message || "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    try {
      const newStatus = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/collectors/${id}/status`, { status: newStatus });
      message.success("Holat o'zgartirildi");
      fetchCollectors();
    } catch (error) {
      message.error("Xatolik");
    }
  };

  const togglePrinter = async (id: string, printerEnabled: boolean) => {
    try {
      await api.patch(`/collectors/${id}/printer`, { printerEnabled });
      message.success("Printer sozlamasi saqlandi");
      fetchCollectors();
    } catch (error) {
      message.error("Xatolik");
    }
  };

  const openEditModal = (collector: any) => {
    setEditingCollector(collector);
    editForm.setFieldsValue({
      fullName: collector.fullName,
      phone: collector.phone,
      passwordRaw: ''
    });
    setIsEditModalVisible(true);
  };

  const handleEdit = async (values: any) => {
    if (!editingCollector) return;
    setSubmitting(true);
    try {
      const payload: any = {
        fullName: values.fullName,
        phone: values.phone,
      };
      if (values.passwordRaw && values.passwordRaw.trim()) {
        payload.passwordRaw = values.passwordRaw.trim();
      }
      await api.patch(`/collectors/${editingCollector.id}`, payload);
      message.success("Pul yig'uvchi ma'lumotlari yangilandi");
      setIsEditModalVisible(false);
      setEditingCollector(null);
      editForm.resetFields();
      fetchCollectors();
    } catch (error: any) {
      message.error(error.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/collectors/${id}`);
      message.success("O'chirildi");
      fetchCollectors();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Xatolik");
    }
  };


  const generateCredentials = () => {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    const randomNum = 1000 + (array[0] % 9000);
    
    const passwordArray = new Uint32Array(1);
    crypto.getRandomValues(passwordArray);
    const passwordNum = 100000 + (passwordArray[0] % 900000);
    
    form.setFieldsValue({
      login: `coll_${randomNum}`,
      passwordRaw: passwordNum.toString()
    });
  };

  return (
    <div className="w-full pb-10 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('col.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('col.desc')}</p>
        </div>
        <Button 
          type="primary" 
          icon={<Plus size={15} />} 
          onClick={() => { setIsModalVisible(true); generateCredentials(); }} 
          className="text-xs font-semibold"
        >
          {t('col.newCollector')}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-white rounded-lg border border-slate-200 shadow-xs animate-pulse p-4 flex flex-col justify-between">
              <div className="flex gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-md"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                </div>
              </div>
              <div className="h-8 bg-slate-100 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
            <Users size={24} />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">Nazoratchilar topilmadi</h2>
          <p className="text-slate-500 text-xs max-w-sm">
            Hozircha tizimga pul yig'uvchi (nazoratchi) xodimlar qo'shilmagan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {data.map((collector) => (
            <div 
              key={collector.id} 
              className="bg-white rounded-lg border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shrink-0 border border-slate-200">
                      {collector.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 truncate" title={collector.fullName}>
                        {collector.fullName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono mt-0.5">
                        <Phone size={11} className="text-slate-400" />
                        <span>{collector.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => openEditModal(collector)}
                      title="Tahrirlash"
                      className="p-1 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      <Edit size={14} />
                    </button>
                    <Popconfirm 
                      title="Xodimni tizimdan butunlay o'chirasizmi?" 
                      onConfirm={() => handleDelete(collector.id)}
                      okText="O'chirish"
                      cancelText="Bekor qilish"
                      okButtonProps={{ danger: true }}
                    >
                      <button className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </Popconfirm>
                  </div>
                </div>

                {/* Credentials & Settings */}
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <ShieldCheck size={14} className="text-slate-400" />
                      <span className="font-medium text-[11px]">{t('table.login')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-800 text-xs">{collector.login}</span>
                      <button 
                        onClick={() => copyLogin(collector.login, collector.id)}
                        title="Loginni nusxalash"
                        className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors cursor-pointer"
                      >
                        {copiedId === collector.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2 rounded border border-slate-200 bg-white">
                      <span className="text-[11px] font-medium text-slate-600">Hisob holati</span>
                      <Switch 
                        size="small"
                        checked={collector.status === 'ACTIVE'} 
                        onChange={() => toggleStatus(collector.id, collector.status)} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded border border-slate-200 bg-white">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                        <Printer size={12} className={collector.printerEnabled ? "text-sky-600" : "text-slate-400"} />
                        <span>Printer</span>
                      </div>
                      <Switch 
                        size="small"
                        checked={collector.printerEnabled} 
                        onChange={(checked) => togglePrinter(collector.id, checked)} 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate('/app/payments')}
                    className="w-full py-1.5 px-2.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CreditCard size={13} className="text-slate-500" />
                    <span>Kassadagi tushumlari</span>
                    <ArrowRight size={11} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Sana:</span>
                </div>
                <span>{dayjs(collector.createdAt).format('DD.MM.YYYY')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <UserPlus size={16} />
            </div>
            <span className="text-base font-bold text-slate-900">{t('col.modalTitle')}</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        centered
        width={460}
      >
        <Form layout="vertical" form={form} onFinish={handleAdd} className="mt-4">
          <Form.Item name="fullName" label={<span className="font-semibold text-xs text-slate-700">{t('table.fullName')}</span>} rules={[{ required: true }]}>
            <Input placeholder="Ism va familiya" prefix={<User size={15} className="text-slate-400 mr-1" />} />
          </Form.Item>
          
          <Form.Item name="phone" label={<span className="font-semibold text-xs text-slate-700">{t('table.phone')}</span>} rules={[{ required: true }]}>
            <Input placeholder="+998 90 123 45 67" prefix={<Phone size={15} className="text-slate-400 mr-1" />} />
          </Form.Item>
          
          <div className="p-3.5 bg-slate-50 rounded-lg mb-4 border border-slate-200">
            <div className="flex items-center gap-1.5 mb-2.5">
              <KeyRound size={15} className="text-sky-600" />
              <p className="text-xs text-slate-800 font-bold uppercase tracking-wider">{t('col.loginAccess')}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Form.Item name="login" label={<span className="text-[11px] font-semibold text-slate-500 uppercase">{t('table.login')}</span>} className="mb-0">
                <Input readOnly className="bg-white border-slate-200 text-sky-700 font-bold font-mono" />
              </Form.Item>
              <Form.Item name="passwordRaw" label={<span className="text-[11px] font-semibold text-slate-500 uppercase">Parol</span>} className="mb-0">
                <Input readOnly className="bg-white border-slate-200 text-sky-700 font-bold font-mono" />
              </Form.Item>
            </div>
            
            <Button type="dashed" onClick={generateCredentials} className="w-full text-xs font-semibold">
              Yangi login va parol generatsiya qilish
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button onClick={() => setIsModalVisible(false)} className="text-xs font-semibold">
              Bekor qilish
            </Button>
            <Button type="primary" htmlType="submit" className="text-xs font-semibold" loading={submitting}>
              {t('btn.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Edit size={16} />
            </div>
            <span className="text-base font-bold text-slate-900">Pul yig'uvchini tahrirlash</span>
          </div>
        }
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingCollector(null);
        }}
        footer={null}
        centered
        width={460}
      >
        <Form layout="vertical" form={editForm} onFinish={handleEdit} className="mt-4">
          <Form.Item name="fullName" label={<span className="font-semibold text-xs text-slate-700">{t('table.fullName')}</span>} rules={[{ required: true, message: 'Ism va familiyani kiriting' }]}>
            <Input placeholder="Ism va familiya" prefix={<User size={15} className="text-slate-400 mr-1" />} />
          </Form.Item>
          
          <Form.Item name="phone" label={<span className="font-semibold text-xs text-slate-700">{t('table.phone')}</span>} rules={[{ required: true, message: 'Telefon raqamini kiriting' }]}>
            <Input placeholder="+998 90 123 45 67" prefix={<Phone size={15} className="text-slate-400 mr-1" />} />
          </Form.Item>

          <Form.Item name="passwordRaw" label={<span className="font-semibold text-xs text-slate-700">Yangi parol (Ixtiyoriy)</span>} extra="Agar parolni o'zgartirmoqchi bo'lsangiz yangi parolni kiriting. Aks holda bo'sh qoldiring.">
            <Input.Password placeholder="Yangi parol..." prefix={<KeyRound size={15} className="text-slate-400 mr-1" />} />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button onClick={() => setIsEditModalVisible(false)} className="text-xs font-semibold">
              Bekor qilish
            </Button>
            <Button type="primary" htmlType="submit" className="text-xs font-semibold" loading={submitting}>
              {t('btn.save')}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Collectors;

