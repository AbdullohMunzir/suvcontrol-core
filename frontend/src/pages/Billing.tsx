import React, { useEffect, useState } from 'react';
import { Table, DatePicker, message, Button, Popconfirm } from 'antd';
import { getInvoices, generateBilling } from '../../services/billingService';
import dayjs from 'dayjs';
import { useLanguage } from '../../contexts/LanguageContext';
import { Calculator } from 'lucide-react';

const Billing: React.FC = () => {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<dayjs.Dayjs | null>(dayjs());

  const fetchInvoices = async (periodStr?: string) => {
    setLoading(true);
    try {
      const data = await getInvoices(periodStr);
      setInvoices(data);
    } catch (error) {
      message.error('Hisob-fakturalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBilling = async () => {
    if (!selectedPeriod) return;
    const periodStr = selectedPeriod.format('YYYY-MM');
    setGenerating(true);
    try {
      const res = await generateBilling(periodStr);
      message.success(res.message || `${periodStr} davri uchun billing muvaffaqiyatli hisoblandi (Yaratildi: ${res.generatedCount ?? 0} ta)`);
      fetchInvoices(periodStr);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Billing hisoblashda xatolik yuz berdi');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchInvoices(selectedPeriod ? selectedPeriod.format('YYYY-MM') : undefined);
  }, [selectedPeriod]);

  const columns = [
    { title: t('table.abonentNumber'), dataIndex: ['abonent', 'abonentNumber'], key: 'abonentNumber', render: (val: string) => <span className="font-bold">{val}</span> },
    { title: t('table.fullName'), dataIndex: ['abonent', 'fullName'], key: 'fullName' },
    { title: t('table.contract'), dataIndex: ['abonent', 'contractNumber'], key: 'contractNumber' },
    { title: t('table.period'), dataIndex: 'period', key: 'period' },
    { title: t('table.amount'), dataIndex: 'amount', key: 'amount', render: (val: number) => `${val.toLocaleString()} UZS` },
    { 
      title: t('table.status'), 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => (
        status === 'PAID' 
          ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span className="text-[11px] font-medium text-zinc-500">{t('status.paid')}</span></span>
          : (status === 'UNPAID' ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span className="text-[11px] font-medium text-zinc-500">{t('status.unpaid')}</span></span> : <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span className="text-[11px] font-medium text-zinc-500">{t('status.partial')}</span></span>)
      )
    },
    { title: t('table.createdAt'), dataIndex: 'createdAt', key: 'createdAt', render: (val: string) => dayjs(val).format('DD.MM.YYYY HH:mm') }
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-medium text-zinc-900 tracking-tight mb-2">{t('bill.title')}</h2>
          <p className="text-zinc-500 font-medium tracking-tight">{t('bill.desc')}</p>
        </div>
      </div>

      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <span className="font-medium text-zinc-600">{t('bill.selectMonth')}</span>
          <DatePicker 
            picker="month" 
            value={selectedPeriod} 
            onChange={(val) => setSelectedPeriod(val)} 
            allowClear={false}
            className="shadow-none border border-zinc-200"
          />
        </div>

        <Popconfirm
          title={`${selectedPeriod ? selectedPeriod.format('YYYY-MM') : ''} davri uchun ommaviy hisoblash`}
          description="Tanlangan oy uchun barcha faol normativ abonentlarga avtomatik hisob-fakturalar shakllantiriladi. Davom ettirasizmi?"
          onConfirm={handleGenerateBilling}
          okText="Ha, hisoblash"
          cancelText="Bekor qilish"
        >
          <Button 
            type="primary" 
            loading={generating}
            className="flex items-center gap-2 bg-primary text-white"
          >
            <Calculator size={16} /> Shakllantirish
          </Button>
        </Popconfirm>
      </div>

      <div className="overflow-hidden">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-zinc-900">{t('bill.invoicesTitle')}</h3>
        </div>
        <Table 
          columns={columns} 
          dataSource={invoices} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 15 }}
          size="middle"
        />
      </div>
    </div>
  );
};

export default Billing;
