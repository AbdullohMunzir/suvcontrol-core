import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Table, Button, Input, Modal, Form, Select, DatePicker, message, Tag, Drawer, Spin, Timeline } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Search, Phone, History, AlertTriangle, Eye, ArrowRight, Save, UserX, MessageSquare, PhoneCall, Plus, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash.debounce';
import { getDebtors, getCollectionHistory, addCollectionAction } from '../../services/collectionService';
import { useTableState } from '../../hooks/useTableState';
import dayjs from 'dayjs';
import { useLanguage } from '../../contexts/LanguageContext';

const { Option } = Select;
const { TextArea } = Input;

const getActionTypeConfig = (t: any): Record<string, { label: string, color: string, icon: React.ReactNode }> => ({
  '1-ESLATMA': { label: t('col.act1'), color: "blue", icon: <MessageSquare size={14} /> },
  '2-ESLATMA': { label: t('col.act2'), color: "orange", icon: <MessageSquare size={14} /> },
  'CALL': { label: t('col.actCall'), color: "cyan", icon: <PhoneCall size={14} /> },
  'VISIT': { label: t('col.actVisit'), color: "purple", icon: <UserX size={14} /> },
  'WARNING': { label: t('col.actWarning'), color: "volcano", icon: <AlertTriangle size={14} /> },
  'COURT': { label: t('col.actCourt'), color: "red", icon: <AlertTriangle size={14} /> },
  'TELEGRAM': { label: t('col.actTelegram'), color: "blue", icon: <Send size={14} /> },
});

const Collections: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [filters, setFilters] = useState({ minDebt: 10000, debtDuration: undefined });
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);

  const { pagination, setPagination, handleTableChange } = useTableState('collection_table');
  const currentPage = pagination.current || 1;

  // History Drawer State
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [historyAbonent, setHistoryAbonent] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Action Modal State
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionAbonent, setActionAbonent] = useState<any>(null);
  const [actionForm] = Form.useForm();
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchDebtorsRef = useRef<(page: number, searchKeyword?: string) => Promise<void>>(null);

  const fetchDebtors = useCallback(async (page: number, searchKeyword = '') => {
    setLoading(true);
    try {
      const result = await getDebtors({ 
        page, 
        limit: 10, 
        search: searchKeyword,
        minDebt: filtersRef.current.minDebt,
        debtDuration: filtersRef.current.debtDuration
      });
      setData(result.data);
      setTotal(result.total);
    } catch (error) {
      message.error('Qarzdorlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  fetchDebtorsRef.current = fetchDebtors;

  const debouncedSearchRef = useRef(
    debounce((value: string) => {
      setPagination(prev => ({ ...prev, current: 1 }));
      fetchDebtorsRef.current?.(1, value);
    }, 400)
  );

  useEffect(() => {
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, []);

  const debouncedSearch = debouncedSearchRef.current;

  useEffect(() => {
    fetchDebtors(currentPage, search);
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentPage !== 1) {
      setPagination(prev => ({ ...prev, current: 1 }));
    } else {
      fetchDebtors(1, search);
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    debouncedSearch(e.target.value);
  };

  const openHistory = async (abonent: any) => {
    setHistoryAbonent(abonent);
    setHistoryDrawerVisible(true);
    setHistoryLoading(true);
    try {
      const data = await getCollectionHistory(abonent.id);
      setHistoryData(data);
    } catch (e) {
      message.error("Tarixni yuklashda xatolik");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openActionModal = (abonent: any) => {
    setActionAbonent(abonent);
    setSelectedAction('');
    actionForm.resetFields();
    setActionModalVisible(true);
  };

  const submitAction = async () => {
    try {
      const values = await actionForm.validateFields();
      setActionSubmitting(true);
      await addCollectionAction(actionAbonent.id, values);
      message.success("Harakat muvaffaqiyatli saqlandi");
      setActionModalVisible(false);
      fetchDebtors(currentPage, search);
      if (historyDrawerVisible && historyAbonent?.id === actionAbonent.id) {
        openHistory(historyAbonent); // refresh history if open
      }
    } catch (e: any) {
      if (e?.errorFields) {
        // Ant Design form validation error
        return;
      }
      message.error(e.response?.data?.message || "Harakatni saqlashda xatolik yuz berdi");
    } finally {
      setActionSubmitting(false);
    }
  };

  const columns: ColumnsType<any> = [
    { title: "Abonent", dataIndex: 'fullName', key: 'fullName', render: (val, record) => (
      <div>
        <div className="font-bold text-gray-800">{val}</div>
        <div className="text-xs text-gray-500">{record.abonentNumber}</div>
      </div>
    )},
    { title: "Manzil", key: 'address', render: (_, r) => `${r.mahalla?.name || ''}, ${r.street?.name || ''}, ${r.house}` },
    { title: "Telefon", dataIndex: 'phone', key: 'phone' },
    { title: "Qarz summasi", dataIndex: 'balance', key: 'balance', align: 'right', render: (val: number) => (
      <span className="text-red-600 font-bold text-lg">{val.toLocaleString()} UZS</span>
    )},
    { title: "Oxirgi harakat", key: 'lastAction', render: (_, record) => {
      const last = record.CollectionActions?.[0];
      if (!last) return <span className="text-gray-400 italic">Harakat yo'q</span>;
      const conf = getActionTypeConfig(t)[last.actionType];
      return (
        <div>
          <Tag color={conf?.color || 'default'} icon={conf?.icon}>{conf?.label || last.actionType}</Tag>
          <div className="text-xs text-gray-400 mt-1">{dayjs(last.createdAt).format('DD.MM.YY HH:mm')}</div>
        </div>
      );
    }},
    {
      title: 'Amallar',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <div className="flex gap-2 justify-end">
          <Button type="default" icon={<History size={16} />} onClick={() => openHistory(record)} title="Tarix" />
          <Button type="primary" className="bg-rose-600" icon={<Plus size={16} />} onClick={() => openActionModal(record)}>
            Chora ko'rish
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-medium text-zinc-900 tracking-tight mb-2">Undirish jarayoni</h2>
          <p className="text-zinc-500 font-medium tracking-tight">Qarzdor abonentlar bilan ishlash va ogohlantirishlar tarixi</p>
        </div>
      </div>

      <div className="mb-8 flex gap-4 max-w-2xl">
        <Input.Search
          placeholder="Abonent F.I.Sh, raqami yoki telefonini kiriting..."
          allowClear
          enterButton={<Search size={16} />}
          onChange={handleSearchChange}
          onSearch={(value) => {
            debouncedSearch.cancel();
            setSearch(value);
            setPagination(prev => ({ ...prev, current: 1 }));
            fetchDebtors(1, value);
          }}
          className="shadow-none border-none flex-1"
          size="large"
        />
        <Select
          allowClear
          placeholder="Qarzdorlik muddati"
          size="large"
          className="w-48"
          value={filters.debtDuration}
          onChange={(v) => setFilters(prev => ({...prev, debtDuration: v}))}
        >
          <Option value="1">1+ oydan beri</Option>
          <Option value="2">2+ oydan beri</Option>
          <Option value="3">3+ oydan beri</Option>
          <Option value="6">6+ oydan beri</Option>
          <Option value="12">1+ yildan beri</Option>
        </Select>
      </div>

      <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 p-2">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={{ ...pagination, total }}
          onChange={handleTableChange}
          loading={loading}
          size="middle"
        />
      </div>

      {/* History Drawer */}
      <Drawer
        title={historyAbonent ? `${historyAbonent.fullName} tarixi` : "Tarix"}
        placement="right"
        onClose={() => setHistoryDrawerVisible(false)}
        open={historyDrawerVisible}
        width={400}
      >
        {historyLoading ? <div className="text-center py-10"><Spin /></div> : (
          historyData.length === 0 ? <p className="text-gray-500 text-center py-10">Hech qanday harakat bajarilmagan.</p> :
          <Timeline
            items={historyData.map(item => {
              const conf = getActionTypeConfig(t)[item.actionType];
              return {
                color: conf?.color || 'blue',
                children: (
                  <div className="mb-4 border-b border-gray-50 pb-4">
                    <div className="flex justify-between items-start mb-1">
                      <Tag color={conf?.color || 'default'}>{conf?.label || item.actionType}</Tag>
                      <span className="text-xs text-gray-400">{dayjs(item.createdAt).format('DD MMM, HH:mm')}</span>
                    </div>
                    <p className="text-gray-700 text-sm mt-2">{item.notes}</p>
                    <p className="text-xs text-gray-400 mt-2">Bajaruvchi: {item.createdBy}</p>
                  </div>
                )
              };
            })}
          />
        )}
      </Drawer>

      {/* Add Action Modal */}
      <Modal
        title={t('col.addAction')}
        open={actionModalVisible}
        onCancel={() => setActionModalVisible(false)}
        onOk={submitAction}
        confirmLoading={actionSubmitting}
        okText={t('col.save')}
        cancelText={t('col.cancel')}
        okButtonProps={{ 
          className: "bg-rose-600",
          disabled: selectedAction === 'TELEGRAM' && !actionAbonent?.telegramChatId
        }}
      >
        <div className="mb-6 p-3 bg-red-50 rounded-lg border border-red-100">
          <div className="text-red-800 font-medium">{actionAbonent?.fullName}</div>
          <div className="text-red-500 text-sm">Joriy qarz: {actionAbonent?.balance?.toLocaleString()} UZS</div>
        </div>

        {selectedAction === 'TELEGRAM' && !actionAbonent?.telegramChatId && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2 text-red-600 font-medium">
            <AlertTriangle size={18} /> Bu abonent Telegram botga ulanmagan. Xabar yuborish imkonsiz.
          </div>
        )}

        <Form 
          form={actionForm} 
          layout="vertical"
          onValuesChange={(changedValues) => {
            if (changedValues.actionType) {
              setSelectedAction(changedValues.actionType);
              if (changedValues.actionType === 'TELEGRAM') {
                if (actionAbonent?.telegramChatId) {
                  actionForm.setFieldsValue({
                    notes: `Hurmatli abonent, sizning joriy qarzingiz ${actionAbonent?.balance?.toLocaleString()} UZS. Iltimos, to'lovni imkon qadar tezroq amalga oshiring.`
                  });
                } else {
                  actionForm.setFieldsValue({ notes: '' });
                }
              }
            }
          }}
        >
          <Form.Item name="actionType" label="Harakat turi" rules={[{ required: true, message: "Harakat turini tanlang" }]}>
            <Select placeholder="Tanlang...">
              {Object.entries(getActionTypeConfig(t)).map(([key, val]) => (
                <Option key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {val.icon} {val.label}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Izoh (Natija yoki kelishuv)" rules={[{ required: true, message: "Izoh yozilishi shart" }]}>
            <TextArea rows={4} placeholder="Masalan: Telefon qildim, ertaga to'layman dedi..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Collections;
