import React, { useState } from 'react';
import { Modal, Form, InputNumber, Button, message, Tag } from 'antd';
import { Gauge, Calculator, CheckCircle2, Droplets } from 'lucide-react';
import api from '../../services/api';
import dayjs from 'dayjs';

interface MeterReadingModalProps {
  visible: boolean;
  onClose: () => void;
  abonent: any;
  onSuccess: () => void;
}

export const MeterReadingModal: React.FC<MeterReadingModalProps> = ({
  visible,
  onClose,
  abonent,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentDiff, setCurrentDiff] = useState<number>(0);

  if (!abonent) return null;

  const meter = abonent.Meters?.[0];
  const lastReading = Number(meter?.lastReading || 0);
  const tariffPrice = Number(abonent.tariff?.price || 5000);
  const baseAmount = Math.round(currentDiff * tariffPrice);
  const vatAmount = Math.round(baseAmount * 0.12);
  const totalAmount = baseAmount + vatAmount;

  const handleValueChange = (val: number | null) => {
    const num = Number(val || 0);
    const diff = Math.max(0, num - lastReading);
    setCurrentDiff(diff);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!meter?.id) {
        message.error("Tashkilotga biriktirilgan hisoblagich topilmadi");
        return;
      }

      setLoading(true);
      await api.post('/meters/readings', {
        meterId: meter.id,
        value: Number(values.newReading),
        period: dayjs().format('YYYY-MM'),
        date: dayjs().format('YYYY-MM-DD')
      });

      message.success(`Yangi ko‘rsatkich qabul qilindi! Suv sarfi: ${currentDiff} m³, Jami: ${totalAmount.toLocaleString()} UZS (12% QQS bilan)`);
      form.resetFields();
      setCurrentDiff(0);
      onSuccess();
      onClose();
    } catch (e: any) {
      message.error(e.response?.data?.message || "Ko‘rsatkichni saqlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Ko‘rsatkichni Saqlash va Hisoblash"
      cancelText="Bekor qilish"
      width={520}
      title={
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Gauge className="w-5 h-5 text-sky-600" />
          <span className="font-bold text-slate-800 text-base">Oylik Hisoblagich Ko‘rsatkichini Kiritish</span>
        </div>
      }
    >
      <div className="space-y-4 pt-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <div className="font-bold text-slate-800 text-sm">{abonent.fullName}</div>
          <div className="text-slate-500">Hisoblagich: <span className="font-mono font-semibold text-slate-700">{meter?.number || 'Yo‘q'}</span> ({meter?.model || 'Standart'})</div>
          <div className="text-slate-500">Tarif narxi: <span className="font-mono font-semibold text-slate-700">{tariffPrice.toLocaleString()} UZS/m³</span> (+12% QQS)</div>
        </div>

        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Oldingi ko‘rsatkich (m³):</label>
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-sm font-bold text-slate-700">
                {lastReading} m³
              </div>
            </div>

            <Form.Item
              name="newReading"
              label={<span className="text-xs font-semibold text-slate-700">Yangi ko‘rsatkich (m³):</span>}
              rules={[
                { required: true, message: 'Yangi ko‘rsatkichni kiriting' },
                {
                  validator: (_, val) => {
                    if (val !== undefined && val < lastReading) {
                      return Promise.reject(new Error(`Ko‘rsatkich ${lastReading} dan kichik bo‘lishi mumkin emas`));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <InputNumber 
                className="w-full font-mono text-sm" 
                placeholder={`${lastReading + 50}`}
                min={lastReading}
                onChange={handleValueChange}
                autoFocus
              />
            </Form.Item>
          </div>
        </Form>

        {/* Live Calculation Result */}
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600">Hisoblangan suv sarfi:</span>
            <span className="font-mono font-bold text-sky-800 text-sm">{currentDiff} m³</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600">Asosiy qiymat (QQSsiz):</span>
            <span className="font-mono text-slate-700">{baseAmount.toLocaleString()} UZS</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600">QQS (12%):</span>
            <span className="font-mono text-slate-700">+{vatAmount.toLocaleString()} UZS</span>
          </div>
          <div className="flex justify-between items-center text-xs pt-1.5 border-t border-sky-200">
            <span className="font-bold text-slate-800">Jami hisoblanadigan summa:</span>
            <span className="font-mono font-bold text-sky-900 text-base">{totalAmount.toLocaleString()} UZS</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MeterReadingModal;
