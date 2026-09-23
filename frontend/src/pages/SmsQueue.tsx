import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Tag, message, Typography, Space, Modal, Select, InputNumber, Row, Col, Card } from 'antd';
import { Send, Clock, History, Search, MessageCircle } from 'lucide-react';
import api from '../../services/api';
import { getMahallas, getStreets } from '../../services/addressService';
import { getDebtors } from '../../services/reportService';
import { useLanguage } from '../../contexts/LanguageContext';

const { Title, Text } = Typography;

export function SmsQueue() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('bulk');
  const [smsBalance, setSmsBalance] = useState<any>(null);

  // Tab 1: Bulk SMS States
  const [mahallas, setMahallas] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [debtorFilters, setDebtorFilters] = useState<{
    mahallaId?: string,
    streetId?: string,
    minDebt?: number,
    monthsUnpaid?: number | null
  }>({});
  const [debtors, setDebtors] = useState<any[]>([]);
  const [loadingDebtors, setLoadingDebtors] = useState(false);
  const [selectedDebtorIds, setSelectedDebtorIds] = useState<React.Key[]>([]);
  const [sendingBulk, setSendingBulk] = useState(false);

  // Tab 2 & 3: Queue & History States
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED'>('PENDING');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [approving, setApproving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

  useEffect(() => {
    // Fetch SMS Balance
    api.get('/sms/balance').then(res => setSmsBalance(res.data)).catch(console.error);
    // Fetch Mahallas for filters
    getMahallas().then(setMahallas).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab !== 'bulk') {
      fetchLogs();
    }
  }, [activeTab, statusFilter]);

  useEffect(() => {
    if (debtorFilters.mahallaId) {
      getStreets(debtorFilters.mahallaId).then(setStreets).catch(console.error);
    } else {
      setStreets([]);
    }
  }, [debtorFilters.mahallaId]);

  const fetchDebtorsData = async () => {
    setLoadingDebtors(true);
    try {
      const data = await getDebtors(debtorFilters);
      setDebtors(data);
    } catch (e) {
      message.error('Xatolik yuz berdi');
    } finally {
      setLoadingDebtors(false);
    }
  };

  const handleSendBulkSms = async (type: 'DEBT' | 'INFO' = 'DEBT') => {
    if (selectedDebtorIds.length === 0) {
      message.warning("Iltimos, avval abonentlarni tanlang");
      return;
    }
    setSendingBulk(true);
    try {
      await api.post('/sms/bulk-debtors', { abonentIds: selectedDebtorIds, type });
      message.success(selectedDebtorIds.length + " ta abonentga SMS jo'natish navbatga qo'shildi!");
      setSelectedDebtorIds([]);
      setActiveTab('queue'); // redirect to queue
      setStatusFilter('PENDING');
    } catch (e: any) {
      message.error("SMS jo'natishda xatolik: " + (e.response?.data?.message || e.message));
    } finally {
      setSendingBulk(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      // Determine what to fetch based on active tab
      let fetchStatus = statusFilter;
      if (activeTab === 'queue') fetchStatus = 'PENDING';
      
      const res = await api.get(`/sms/queue?status=${fetchStatus}`);
      setLogs(res.data);
    } catch (e) {
      message.error("Ma'lumotni yuklashda xatolik");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleApprove = () => {
    if (selectedLogIds.length === 0) return;
    Modal.confirm({
      title: t('sms.confirmApprove'),
      content: t('sms.confirmApproveContent'),
      onOk: async () => {
        try {
          setApproving(true);
          const res = await api.post('/sms/approve', { ids: selectedLogIds });
          message.success(`${res.data.queuedCount} ta SMS jo'natishga ruxsat berildi`);
          setSelectedLogIds([]);
          fetchLogs();
        } catch (e) {
          message.error("Xatolik yuz berdi");
        } finally {
          setApproving(false);
        }
      }
    });
  };

  const handleCancel = () => {
    if (selectedLogIds.length === 0) return;
    Modal.confirm({
      title: t('sms.confirmCancel'),
      content: t('sms.confirmCancelContent'),
      okType: 'danger',
      onOk: async () => {
        try {
          setCanceling(true);
          await api.post('/sms/cancel', { ids: selectedLogIds });
          message.success("Tanlangan SMSlar bekor qilindi");
          setSelectedLogIds([]);
          fetchLogs();
        } catch (e) {
          message.error("Xatolik yuz berdi");
        } finally {
          setCanceling(false);
        }
      }
    });
  };

  const handleSyncStatus = async () => {
    try {
      setSyncing(true);
      const res = await api.post('/sms/sync-status');
      message.success(res.data.count + " ta xabar holati yangilandi");
      fetchLogs();
    } catch(e) {
      message.error("Holatni yangilashda xatolik");
    } finally {
      setSyncing(false);
    }
  };

  const debtorCols = [
    { title: 'Hisob raqami', dataIndex: 'abonentNumber', key: 'abonentNumber' },
    { title: 'F.I.Sh', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Manzil', key: 'address', render: (r: any) => `${r.mahalla?.name || ''}, ${r.street?.name || ''} ${r.houseNumber || ''}` },
    { title: 'Qarz (UZS)', dataIndex: 'balance', key: 'balance', render: (b: number) => <span className="text-red-600 font-medium">{Number(b).toLocaleString()}</span> },
    { title: 'Telefon', dataIndex: 'phone', key: 'phone' }
  ];

  const logCols = [
    {
      title: t('sms.colAbonent'),
      key: 'abonent',
      render: (record: any) => (
        <div>
          <Text strong>{record.abonent?.fullName}</Text>
          <br />
          <Text type="secondary">{record.abonent?.abonentNumber}</Text>
        </div>
      )
    },
    { title: t('sms.colPhone'), dataIndex: 'phoneNumber', key: 'phoneNumber' },
    {
      title: t('sms.colType'),
      dataIndex: 'eventType',
      key: 'eventType',
      render: (type: string) => {
        switch (type) {
          case 'NEW_ABONENT': return <Tag color="blue">{t('sms.typeNew')}</Tag>;
          case 'PAYMENT_CONFIRMED': return <Tag color="green">{t('sms.typePay')}</Tag>;
          case 'DEBT_ALERT': return <Tag color="red">{t('sms.typeDebt')}</Tag>;
          default: return <Tag>{type}</Tag>;
        }
      }
    },
    { title: t('sms.colMessage'), dataIndex: 'message', key: 'message' },
    {
      title: t('sms.colDate'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('ru-RU')
    }
  ];

  if (activeTab === 'history' && statusFilter === 'FAILED') {
    logCols.push({ title: 'Xato sababi', dataIndex: 'errorReason', key: 'errorReason' });
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-100px)]">
      {/* Header with Balance */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <MessageCircle size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">SMS Markazi</h1>
            <p className="text-xs text-slate-500">Barcha SMS xabarnomalar va jo'natish tarixini boshqarish</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-md border border-slate-200">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Eskiz SMS Balans</span>
            <span className="text-base font-bold font-mono tabular-nums text-slate-900 block">
              {smsBalance && smsBalance.status === 'success' ? (smsBalance.data.balance || 0).toLocaleString() : 'Yuklanmoqda'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col bg-white rounded-lg shadow-xs border border-slate-200 flex-1 overflow-hidden min-h-0">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === 'queue') setStatusFilter('PENDING');
            if (key === 'history') setStatusFilter('SENT');
            setSelectedLogIds([]);
          }}
          type="card"
          className="custom-top-tabs [&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-tab]:px-6 [&_.ant-tabs-tab]:py-3 [&_.ant-tabs-tab]:rounded-xl [&_.ant-tabs-tab]:border-transparent [&_.ant-tabs-tab]:bg-white [&_.ant-tabs-tab]:shadow-sm [&_.ant-tabs-tab-active]:bg-indigo-600 [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-white [&_.ant-tabs-nav-list]:gap-3 p-4 bg-slate-50 border-b border-gray-100"
          items={[
            {
              key: 'bulk',
              label: <div className="flex items-center gap-2 font-semibold text-[15px]"><Send size={18} /> Ommaviy jo'natish</div>,
              children: <></>
            },
            {
              key: 'queue',
              label: <div className="flex items-center gap-2 font-semibold text-[15px]"><Clock size={18} /> Navbat</div>,
              children: <></>
            },
            {
              key: 'history',
              label: <div className="flex items-center gap-2 font-semibold text-[15px]"><History size={18} /> Tarix va Holat</div>,
              children: <></>
            }
          ]}
        />
        
        <div className="flex-1 overflow-y-auto bg-white p-6">
          {/* TAB 1: BULK SMS */}
          {activeTab === 'bulk' && (
            <div className="animate-in fade-in duration-300 h-full">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 py-2">
                <div className="flex flex-wrap gap-4 items-center">
                  <Select 
                    placeholder='Mahallani tanlang' 
                    allowClear 
                    className="w-48 shadow-none"
                    value={debtorFilters.mahallaId}
                    onChange={(val) => setDebtorFilters(p => ({ ...p, mahallaId: val, streetId: undefined }))}
                  >
                    {mahallas.map(m => <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>)}
                  </Select>
                  <Select 
                    placeholder="Ko'chani tanlang" 
                    allowClear 
                    className="w-48 shadow-none"
                    disabled={!debtorFilters.mahallaId}
                    value={debtorFilters.streetId}
                    onChange={(val) => setDebtorFilters(p => ({ ...p, streetId: val }))}
                  >
                    {streets.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                  </Select>
                  <InputNumber 
                    placeholder='Min. qarz summasi' 
                    className="w-36 shadow-none"
                    value={debtorFilters.minDebt}
                    onChange={(val) => setDebtorFilters(p => ({ ...p, minDebt: val ? Number(val) : undefined }))}
                  />
                  <Select 
                    placeholder="To'lanmagan oylar" 
                    allowClear 
                    className="w-40 shadow-none"
                    value={debtorFilters.monthsUnpaid}
                    onChange={(val) => setDebtorFilters(p => ({ ...p, monthsUnpaid: val ? Number(val) : undefined }))}
                  >
                    <Select.Option value={1}>1+ oy</Select.Option>
                    <Select.Option value={2}>2+ oy</Select.Option>
                    <Select.Option value={3}>3+ oy</Select.Option>
                    <Select.Option value={6}>6+ oy</Select.Option>
                    <Select.Option value={12}>12+ oy</Select.Option>
                  </Select>
                  <Button type="primary" onClick={fetchDebtorsData} className="shadow-none bg-zinc-900 hover:bg-zinc-800">
                    <Search size={16} className="mr-2" /> Qidirish
                  </Button>
                </div>
                
                {debtors.length > 0 && (
                  <Space>
                    <Button type="primary" loading={sendingBulk} onClick={() => handleSendBulkSms('INFO')} icon={<Send size={16} />} className="shadow-none bg-blue-600 hover:bg-blue-700">
                      Abonent raqamini yuborish
                    </Button>
                    <Button type="primary" danger loading={sendingBulk} onClick={() => handleSendBulkSms('DEBT')} icon={<Send size={16} />} className="shadow-none">
                      Qarz xabarnomasi (SMS)
                    </Button>
                  </Space>
                )}
              </div>
              
              <Table 
                dataSource={debtors}
                rowKey="id"
                rowSelection={{
                  selectedRowKeys: selectedDebtorIds,
                  onChange: (keys) => setSelectedDebtorIds(keys),
                }}
                columns={debtorCols}
                loading={loadingDebtors}
                pagination={{ pageSize: 20 }}
                size="middle"
              />
            </div>
          )}

          {/* TAB 2: QUEUE */}
          {activeTab === 'queue' && (
            <div className="animate-in fade-in duration-300 h-full">
              <div className="flex justify-between items-center mb-6">
                <Space>
                  <Button type="primary" onClick={() => setStatusFilter('PENDING')}>Kutilayotgan (Tasdiqlash kerak)</Button>
                </Space>
              </div>

              <div className="mb-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100 flex justify-between items-center">
                <Text className="text-orange-800">
                  Tanlangan: <b>{selectedLogIds.length}</b> ta xabar
                </Text>
                <Space>
                  <Button 
                    type="primary" 
                    className="bg-indigo-600"
                    onClick={handleApprove} 
                    disabled={selectedLogIds.length === 0}
                    loading={approving}
                  >
                    Yuborish (Tasdiqlash)
                  </Button>
                  <Button 
                    danger 
                    onClick={handleCancel} 
                    disabled={selectedLogIds.length === 0}
                    loading={canceling}
                  >
                    Bekor qilish
                  </Button>
                </Space>
              </div>

              <Table
                rowKey="id"
                rowSelection={{
                  selectedRowKeys: selectedLogIds,
                  onChange: (keys: React.Key[]) => setSelectedLogIds(keys as string[]),
                }}
                columns={logCols}
                dataSource={logs || []}
                loading={isLoadingLogs}
                pagination={{ pageSize: 50 }}
                size="middle"
              />
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div className="animate-in fade-in duration-300 h-full">
              <div className="flex justify-between items-center mb-6">
                <Space>
                  <Button 
                    type={statusFilter === 'SENT' ? 'primary' : 'default'}
                    onClick={() => { setStatusFilter('SENT'); setSelectedLogIds([]); }}
                  >
                    Yuborilgan (Kutmoqda)
                  </Button>
                  <Button 
                    type={statusFilter === 'DELIVERED' ? 'primary' : 'default'}
                    onClick={() => { setStatusFilter('DELIVERED'); setSelectedLogIds([]); }}
                    className={statusFilter === 'DELIVERED' ? 'bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700 text-white' : ''}
                  >
                    Yetkazib berilgan
                  </Button>
                  <Button 
                    type={statusFilter === 'FAILED' ? 'primary' : 'default'}
                    onClick={() => { setStatusFilter('FAILED'); setSelectedLogIds([]); }}
                    danger={statusFilter === 'FAILED'}
                  >
                    Xato (Failed)
                  </Button>
                  <Button 
                    type={statusFilter === 'CANCELLED' ? 'primary' : 'default'}
                    onClick={() => { setStatusFilter('CANCELLED'); setSelectedLogIds([]); }}
                  >
                    Bekor qilingan
                  </Button>
                </Space>
                
                {statusFilter === 'SENT' && (
                  <Button type="primary" loading={syncing} onClick={handleSyncStatus} icon={<History size={16} />}>
                    Holatni yangilash
                  </Button>
                )}
              </div>

              <Table
                rowKey="id"
                columns={logCols}
                dataSource={logs || []}
                loading={isLoadingLogs}
                pagination={{ pageSize: 50 }}
                size="middle"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
