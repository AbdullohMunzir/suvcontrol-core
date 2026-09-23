import React, { useEffect, useState } from 'react';
import { Button, Modal, Form, Input, message, Popconfirm, Empty } from 'antd';
import { Plus, Edit, Trash2, MapPin, Map, ChevronRight, Navigation, Search } from 'lucide-react';
import { getMahallas, createMahalla, updateMahalla, deleteMahalla, getStreets, createStreet, updateStreet, deleteStreet } from '../../services/addressService';
import { useLanguage } from '../../contexts/LanguageContext';

const Addresses: React.FC = () => {
  const { t } = useLanguage();
  const [mahallas, setMahallas] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [selectedMahalla, setSelectedMahalla] = useState<any>(null);
  const [searchMahalla, setSearchMahalla] = useState('');
  const [searchStreet, setSearchStreet] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [streetLoading, setStreetLoading] = useState(false);
  
  const [isMahallaModalVisible, setIsMahallaModalVisible] = useState(false);
  const [isStreetModalVisible, setIsStreetModalVisible] = useState(false);
  
  const [editingMahalla, setEditingMahalla] = useState<any>(null);
  const [editingStreet, setEditingStreet] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();
  const [streetForm] = Form.useForm();

  const fetchMahallas = async () => {
    setLoading(true);
    try {
      const data = await getMahallas();
      setMahallas(data);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Mahallalarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const fetchStreets = async (mahallaId: string) => {
    setStreetLoading(true);
    try {
      const data = await getStreets(mahallaId);
      setStreets(data);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Ko'chalarni yuklashda xatolik");
    } finally {
      setStreetLoading(false);
    }
  };

  useEffect(() => {
    fetchMahallas();
  }, []);

  useEffect(() => {
    if (selectedMahalla) {
      fetchStreets(selectedMahalla.id);
    } else {
      setStreets([]);
    }
  }, [selectedMahalla]);

  const handleAddMahalla = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingMahalla) {
        await updateMahalla(editingMahalla.id, values);
        message.success("Mahalla yangilandi");
      } else {
        await createMahalla(values);
        message.success("Mahalla qo'shildi");
      }
      setIsMahallaModalVisible(false);
      setEditingMahalla(null);
      form.resetFields();
      fetchMahallas();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMahalla = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    try {
      await deleteMahalla(id);
      message.success("Mahalla o'chirildi");
      if (selectedMahalla?.id === id) {
        setSelectedMahalla(null);
      }
      fetchMahallas();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Xatolik (balki bu mahallaga bog'langan ko'chalar bor)");
    }
  };

  const handleAddStreet = async (values: any) => {
    if (!selectedMahalla) return message.error("Mahalla tanlanmagan");
    setSubmitting(true);
    try {
      if (editingStreet) {
        await updateStreet(editingStreet.id, values);
        message.success("Ko'cha yangilandi");
      } else {
        await createStreet(selectedMahalla.id, values);
        message.success("Ko'cha qo'shildi");
      }
      setIsStreetModalVisible(false);
      setEditingStreet(null);
      streetForm.resetFields();
      fetchStreets(selectedMahalla.id);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStreet = async (id: string) => {
    if (!selectedMahalla) return;
    try {
      await deleteStreet(id);
      message.success("Ko'cha o'chirildi");
      fetchStreets(selectedMahalla.id);
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Xatolik yuz berdi");
    }
  };


  const openEditMahalla = (record: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMahalla(record);
    form.setFieldsValue({ name: record.name });
    setIsMahallaModalVisible(true);
  };

  const openEditStreet = (record: any) => {
    setEditingStreet(record);
    streetForm.setFieldsValue({ name: record.name });
    setIsStreetModalVisible(true);
  };

  const filteredMahallas = mahallas.filter(m => (m.name || '').toLowerCase().includes(searchMahalla.toLowerCase()));
  const filteredStreets = streets.filter(s => (s.name || '').toLowerCase().includes(searchStreet.toLowerCase()));

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Map size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('addr.title')}</h2>
            <p className="text-xs text-slate-500">{t('addr.desc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
            Jami: <span className="font-mono tabular-nums font-bold text-slate-900">{mahallas.length}</span> ta mahalla
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-230px)] min-h-[580px]">
        {/* LEFT PANEL: Mahallas */}
        <div className="md:col-span-5 lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/60 flex flex-col gap-2.5 sticky top-0 z-10">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={15} className="text-sky-600" />
                {t('addr.mahallas')}
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                  {filteredMahallas.length}
                </span>
              </h3>
              <Button 
                type="primary" 
                size="small"
                className="font-medium text-xs rounded"
                icon={<Plus size={13} />} 
                onClick={() => { setEditingMahalla(null); form.resetFields(); setIsMahallaModalVisible(true); }}
              >
                {t('btn.add')}
              </Button>
            </div>
            <Input 
              prefix={<Search size={14} className="text-slate-400" />}
              placeholder="Mahalla qidirish..."
              value={searchMahalla}
              onChange={(e) => setSearchMahalla(e.target.value)}
              allowClear
              size="small"
              className="rounded bg-white border-slate-200 text-xs"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col gap-1.5">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-11 bg-slate-100 animate-pulse rounded" />)}
              </div>
            ) : filteredMahallas.length === 0 ? (
              <Empty description="Mahallalar topilmadi" className="mt-16" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              filteredMahallas.map(m => (
                <div 
                  key={m.id}
                  onClick={() => setSelectedMahalla(m)}
                  className={`group relative flex items-center justify-between p-2.5 rounded cursor-pointer transition-colors border ${
                    selectedMahalla?.id === m.id 
                    ? 'bg-sky-50/80 border-sky-300 text-sky-950 font-medium' 
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-700'
                  }`}
                >
                  {selectedMahalla?.id === m.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sky-600 rounded-r" />
                  )}
                  <div className="flex items-center gap-2.5 min-w-0 pl-1">
                    <div className={`w-7 h-7 rounded flex items-center justify-center transition-colors shrink-0 ${
                      selectedMahalla?.id === m.id ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-600'
                    }`}>
                      <MapPin size={13} />
                    </div>
                    <span className="text-xs truncate">
                      {m.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => openEditMahalla(m, e)}
                      title="Tahrirlash"
                      className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                    >
                      <Edit size={13} />
                    </button>
                    <Popconfirm 
                      title="Mahallani o'chirasizmi?" 
                      onConfirm={(e) => handleDeleteMahalla(m.id, e as unknown as React.MouseEvent)}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        title="O'chirish"
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </Popconfirm>
                    <ChevronRight size={14} className={selectedMahalla?.id === m.id ? 'text-sky-600 ml-0.5' : 'text-slate-300 ml-0.5'} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Streets */}
        <div className="md:col-span-7 lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden relative">
          {!selectedMahalla ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 p-6">
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-3 text-slate-400 border border-slate-200">
                <Navigation size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Ko'chalarni ko'rish</h3>
              <p className="text-slate-500 text-center max-w-sm text-xs">
                Chap paneldan kerakli mahallani tanlang. Tanlangan mahallaga biriktirilgan ko'chalar shu yerda ko'rinadi.
              </p>
            </div>
          ) : (
            <>
              <div className="p-3.5 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                    <Navigation size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {selectedMahalla.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">Ko'chalar soni: <span className="font-mono font-semibold text-slate-700">{filteredStreets.length}</span> ta</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    prefix={<Search size={13} className="text-slate-400" />}
                    placeholder="Ko'cha qidirish..."
                    value={searchStreet}
                    onChange={(e) => setSearchStreet(e.target.value)}
                    allowClear
                    size="small"
                    className="w-44 rounded bg-slate-50 text-xs"
                  />
                  <Button 
                    type="primary" 
                    size="small"
                    className="font-medium text-xs rounded"
                    icon={<Plus size={13} />} 
                    onClick={() => { setEditingStreet(null); streetForm.resetFields(); setIsStreetModalVisible(true); }}
                  >
                    Yangi ko'cha
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/40 custom-scrollbar">
                {streetLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-12 bg-white border border-slate-200 animate-pulse rounded" />)}
                  </div>
                ) : filteredStreets.length === 0 ? (
                  <Empty description="Ko'chalar topilmadi" className="mt-16" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 content-start">
                    {filteredStreets.map(s => (
                      <div 
                        key={s.id}
                        className="group bg-white p-3 rounded border border-slate-200 hover:border-sky-300 hover:shadow-xs transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                            <Navigation size={13} />
                          </div>
                          <span className="font-semibold text-slate-800 text-xs truncate">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditStreet(s)}
                            title="Tahrirlash"
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                          >
                            <Edit size={12} />
                          </button>
                          <Popconfirm 
                            title="Ko'chani o'chirasizmi?" 
                            onConfirm={() => handleDeleteStreet(s.id)}
                          >
                            <button 
                              title="O'chirish"
                              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </Popconfirm>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal 
        title={<span className="text-base font-bold text-slate-900">{editingMahalla ? t('addr.editMahalla') : t('addr.newMahalla')}</span>} 
        open={isMahallaModalVisible} 
        onCancel={() => setIsMahallaModalVisible(false)} 
        footer={null}
        centered
        width={420}
      >
        <Form form={form} layout="vertical" onFinish={handleAddMahalla} className="mt-4">
          <Form.Item name="name" label={<span className="text-xs font-semibold text-slate-700">{t('addr.mahallaName')}</span>} rules={[{ required: true }]}>
            <Input placeholder="Masalan: Navoiy" className="rounded" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} className="w-full mt-2 font-medium">
            {t('btn.save')}
          </Button>
        </Form>
      </Modal>

      <Modal 
        title={<span className="text-base font-bold text-slate-900">{editingStreet ? t('addr.editStreet') : t('addr.newStreet')}</span>} 
        open={isStreetModalVisible} 
        onCancel={() => setIsStreetModalVisible(false)} 
        footer={null}
        centered
        width={420}
      >
        <Form form={streetForm} layout="vertical" onFinish={handleAddStreet} className="mt-4">
          <Form.Item name="name" label={<span className="text-xs font-semibold text-slate-700">{t('addr.streetName')}</span>} rules={[{ required: true }]}>
            <Input placeholder="Masalan: Amir Temur" className="rounded" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} className="w-full mt-2 font-medium">
            {t('btn.save')}
          </Button>
        </Form>
      </Modal>

      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Addresses;
