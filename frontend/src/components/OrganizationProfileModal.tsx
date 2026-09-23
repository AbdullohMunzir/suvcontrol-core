import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, message, Alert, Divider, Row, Col, Spin, Tag } from 'antd';
import { Building2, Save, X, Landmark, FileText, Phone, Mail, MapPin, UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

interface OrganizationProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (updatedTenant: any) => void;
}

export const OrganizationProfileModal: React.FC<OrganizationProfileModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tenant/profile');
      setTenantData(res.data);
      form.setFieldsValue({
        name: res.data.name,
        inn: res.data.inn,
        vatCode: res.data.vatCode,
        bankAccount: res.data.bankAccount,
        bankName: res.data.bankName,
        mfo: res.data.mfo,
        address: res.data.address,
        phone: res.data.phone,
        email: res.data.email,
        directorName: res.data.directorName,
        accountantName: res.data.accountantName,
      });
    } catch (err: any) {
      message.error(err.response?.data?.message || "Tashkilot ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchProfile();
    }
  }, [visible]);

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      const res = await api.put('/tenant/profile', values);
      message.success("Tashkilot rekvizitlari muvaffaqiyatli saqlandi!");
      setTenantData(res.data);
      if (onSaved) {
        onSaved(res.data);
      }
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || "Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={780}
      title={
        <div className="flex items-center gap-2.5 text-slate-800">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Tashkilot Rekvizitlari (Sotuvchi)</div>
            <div className="text-[11px] font-normal text-slate-500">Tuman Suv Ta'minoti Korxonasining rasmiy yuridik va bank rekvizitlari</div>
          </div>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose} icon={<X size={14} />}>
          Bekor qilish
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<Save size={14} />}
          loading={saving}
          onClick={() => form.submit()}
          className="bg-sky-600 hover:bg-sky-700 font-semibold"
        >
          Rekvizitlarni Saqlash
        </Button>,
      ]}
    >
      <div className="py-2">
        <Alert
          type="info"
          showIcon
          className="mb-4 text-xs"
          message="Buxgalteriya va Hisob-faktura uchun muhim"
          description="Ushbu rekvizitlar barcha E-Faktura (EHF), Akt-sverka, Spravka-raschet va Pretenziyalarda 'YETKAZIB BERUVCHI (SOTUVCHI)' sifatida avtomatik aks ettiriladi va Didox/Soliq tizimiga yuboriladi."
        />

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Spin size="large" tip="Rekvizitlar yuklanmoqda..." />
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              vatCode: '326000001520',
              mfo: '00152',
            }}
          >
            {/* 1. Asosiy ma'lumotlar */}
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Building2 size={14} className="text-sky-600" /> Korxona identifikatsiyasi
            </div>
            <Row gutter={12}>
              <Col span={24}>
                <Form.Item
                  name="name"
                  label="Tashkilot rasmiy to'liq nomi"
                  rules={[{ required: true, message: "Tashkilot nomini kiriting" }]}
                >
                  <Input placeholder="Masalan: Chust Tumani Suv Ta'minoti Korxonasi" className="font-semibold text-slate-900" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="inn"
                  label="STIR (INN) - 9 ta raqam"
                  rules={[
                    { required: true, message: "STIR raqamini kiriting" },
                    { pattern: /^\d{9}$/, message: "STIR aniq 9 ta raqamdan iborat bo'lishi kerak" },
                  ]}
                >
                  <Input maxLength={9} placeholder="201555001" className="font-mono font-bold text-slate-800" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="vatCode"
                  label="QQS to'lovchi kodi (12 ta raqam)"
                  rules={[
                    { pattern: /^\d{12}$/, message: "QQS kodi 12 ta raqam bo'lishi kerak" }
                  ]}
                >
                  <Input maxLength={12} placeholder="326000001520" className="font-mono text-slate-800" />
                </Form.Item>
              </Col>
            </Row>

            <Divider className="my-3" />

            {/* 2. Bank rekvizitlari */}
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Landmark size={14} className="text-emerald-600" /> Bank Rekvizitlari
            </div>
            <Row gutter={12}>
              <Col span={14}>
                <Form.Item
                  name="bankName"
                  label="Xizmat ko'rsatuvchi bank nomi"
                  rules={[{ required: true, message: "Bank nomini kiriting" }]}
                >
                  <Input placeholder="ATB Agrobank Chust filiali" />
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item
                  name="mfo"
                  label="Bank MFO kodi (5 ta raqam)"
                  rules={[
                    { required: true, message: "MFO kodini kiriting" },
                    { pattern: /^\d{5}$/, message: "MFO 5 ta raqam bo'lishi kerak" },
                  ]}
                >
                  <Input maxLength={5} placeholder="00152" className="font-mono font-bold" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="bankAccount"
                  label="Talab qilib olinguncha asosiy hisobvarag'i (h/r 20 xonali)"
                  rules={[
                    { required: true, message: "Hisobvaraqni kiriting" },
                    { pattern: /^\d{20}$/, message: "Hisobvaraq aniq 20 ta raqamdan iborat bo'lishi kerak" },
                  ]}
                >
                  <Input maxLength={20} placeholder="20208000900000152010" className="font-mono font-bold text-slate-900" />
                </Form.Item>
              </Col>
            </Row>

            <Divider className="my-3" />

            {/* 3. Yuridik manzil va Aloqa */}
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <MapPin size={14} className="text-amber-600" /> Yuridik Manzil va Aloqa
            </div>
            <Row gutter={12}>
              <Col span={24}>
                <Form.Item
                  name="address"
                  label="Yuridik manzil"
                  rules={[{ required: true, message: "Yuridik manzilni kiriting" }]}
                >
                  <Input placeholder="Namangan viloyati, Chust tumani, Chust sh., Mustaqillik ko'chasi, 12-uy" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="phone" label="Telefon raqami">
                  <Input placeholder="+998 (69) 421-22-33" className="font-mono" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="email" label="Rasmiy elektron pochta">
                  <Input placeholder="chust-suv@suvta'minot.uz" />
                </Form.Item>
              </Col>
            </Row>

            <Divider className="my-3" />

            {/* 4. Mas'ul shaxslar (Imzolar uchun) */}
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <UserCheck size={14} className="text-purple-600" /> Rasmiy Imzo Qoyuvchi Mas'ul Xodimlar
            </div>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="directorName"
                  label="Tashkilot rahbari (Direktor) F.I.Sh."
                  rules={[{ required: true, message: "Direktor ism-sharifini kiriting" }]}
                >
                  <Input placeholder="Qodirov Dilshodbek Rustamovich" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="accountantName"
                  label="Bosh buxgalter F.I.Sh."
                  rules={[{ required: true, message: "Bosh buxgalter ism-sharifini kiriting" }]}
                >
                  <Input placeholder="Soliyev Akramjon Ne'matillayevich" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </div>
    </Modal>
  );
};
