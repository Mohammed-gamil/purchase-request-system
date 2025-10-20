import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Upload, Loader2 } from 'lucide-react';
import api from '../lib/api';

interface VisitFormProps {
  language: 'en' | 'ar';
  currentUser: {
    id: string | number;
    name: string;
    role: string;
  };
  t: (key: string) => string;
  onClose: () => void;
  onSuccess: () => void;
  editVisit?: any;
}

const VisitForm: React.FC<VisitFormProps> = ({
  language,
  currentUser,
  t,
  onClose,
  onSuccess,
  editVisit,
}) => {
  const [loading, setLoading] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<any[]>([]);
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    client_id: editVisit?.client_id || '',
    visit_date: editVisit?.visit_date || new Date().toISOString().split('T')[0],
    has_previous_agency: editVisit?.has_previous_agency || false,
    previous_agency_name: editVisit?.previous_agency_name || '',
    needs_voiceover: editVisit?.needs_voiceover || false,
    voiceover_language: editVisit?.voiceover_language || '',
    shooting_goals: editVisit?.shooting_goals || [],
    shooting_goals_other_text: editVisit?.shooting_goals_other_text || '',
    service_types: editVisit?.service_types || [],
    service_types_other_text: editVisit?.service_types_other_text || '',
    preferred_location: editVisit?.preferred_location || '',
    product_category_id: editVisit?.product_category_id || '',
    product_description: editVisit?.product_description || '',
    estimated_product_count: editVisit?.estimated_product_count || '',
    preferred_shoot_date: editVisit?.preferred_shoot_date || '',
    budget_range: editVisit?.budget_range || '',
    rep_notes: editVisit?.rep_notes || '',
  });

  const [selectedClient, setSelectedClient] = useState<any>(editVisit?.client || null);

  // New client form
  const [newClient, setNewClient] = useState({
    store_name: '',
    contact_person: '',
    mobile: '',
    mobile_2: '',
    address: '',
    business_type_id: '',
  });

  useEffect(() => {
    loadReferenceData();
    loadAllClients();
  }, []);

  useEffect(() => {
    // Filter clients based on search
    if (clientSearch.trim() === '') {
      setFilteredClients(allClients);
    } else {
      const search = clientSearch.toLowerCase();
      const filtered = allClients.filter(client => 
        client.store_name?.toLowerCase().includes(search) ||
        client.contact_person?.toLowerCase().includes(search) ||
        client.mobile?.includes(search)
      );
      setFilteredClients(filtered);
    }
  }, [clientSearch, allClients]);

  const loadReferenceData = async () => {
    try {
      const [typesRes, categoriesRes] = await Promise.all([
        api.visits.getBusinessTypes(),
        api.visits.getProductCategories(),
      ]);

      if (typesRes.success && typesRes.data) {
        setBusinessTypes(typesRes.data);
      }
      if (categoriesRes.success && categoriesRes.data) {
        setProductCategories(categoriesRes.data);
      }
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  };

  const loadAllClients = async () => {
    try {
      const res = await api.visits.getClients({ per_page: 1000 });
      if (res.success && res.data) {
        setAllClients(res.data);
        setFilteredClients(res.data);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.store_name || !newClient.contact_person || !newClient.mobile || !newClient.business_type_id) {
      alert(t('pleaseFillRequiredFields') || 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...newClient,
        business_type_id: Number(newClient.business_type_id),
      };
      const res = await api.visits.createClient(payload);
      if (res.success && res.data) {
        // Add new client to the lists
        setAllClients([res.data, ...allClients]);
        setFilteredClients([res.data, ...filteredClients]);
        
        // Select the new client
        setSelectedClient(res.data);
        setFormData({ ...formData, client_id: res.data.id });
        setShowNewClientForm(false);
        setShowClientDropdown(false);
        setClientSearch('');
        setNewClient({
          store_name: '',
          contact_person: '',
          mobile: '',
          mobile_2: '',
          address: '',
          business_type_id: '',
        });
      }
    } catch (error) {
      console.error('Failed to create client:', error);
      alert(t('failedToCreateClient') || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id || !formData.visit_date) {
      alert(t('pleaseFillRequiredFields') || 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        client_id: Number(formData.client_id),
        product_category_id: formData.product_category_id ? Number(formData.product_category_id) : null,
        estimated_product_count: formData.estimated_product_count ? Number(formData.estimated_product_count) : null,
      };

      let res;
      if (editVisit) {
        res = await api.visits.updateVisit(editVisit.id, payload);
      } else {
        res = await api.visits.createVisit(payload);
      }

      if (res.success) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Failed to save visit:', error);
      alert(t('failedToSaveVisit') || 'Failed to save visit');
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayValue = (field: 'shooting_goals' | 'service_types', value: string) => {
    const current = formData[field] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFormData({ ...formData, [field]: updated });
  };

  const shootingGoalsOptions = [
    { value: 'social_media', label: language === 'ar' ? 'وسائل التواصل الاجتماعي' : 'Social Media' },
    { value: 'in_store', label: language === 'ar' ? 'داخل المتجر' : 'In Store' },
    { value: 'content_update', label: language === 'ar' ? 'تحديث المحتوى' : 'Content Update' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' },
  ];

  const serviceTypesOptions = [
    { value: 'product_photo', label: language === 'ar' ? 'تصوير المنتجات' : 'Product Photo' },
    { value: 'model_photo', label: language === 'ar' ? 'تصوير موديل' : 'Model Photo' },
    { value: 'video', label: language === 'ar' ? 'فيديو' : 'Video' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {editVisit ? t('editVisit') || 'Edit Visit' : t('newVisit')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('client')} <span className="text-red-500">*</span>
            </label>
            {selectedClient ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <div className="font-semibold">{selectedClient.store_name}</div>
                    <div className="text-sm text-gray-600">{selectedClient.contact_person}</div>
                    <div className="text-sm text-gray-500">{selectedClient.mobile}</div>
                    {selectedClient.business_type && (
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-semibold">{language === 'ar' ? 'نوع النشاط: ' : 'Business Type: '}</span>
                        {language === 'ar' ? selectedClient.business_type.name_ar : selectedClient.business_type.name_en}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setFormData({ ...formData, client_id: '' });
                      setClientSearch('');
                      setShowClientDropdown(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                  >
                    {t('change') || 'Change'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder={t('searchOrSelectClient') || 'Search or select client...'}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoComplete="off"
                  />
                </div>
                
                {showClientDropdown && (
                  <div className="border rounded-lg shadow-lg bg-white max-h-64 overflow-y-auto">
                    {filteredClients.length > 0 ? (
                      <>
                        <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-600">
                              {filteredClients.length} {language === 'ar' ? 'عميل' : 'client(s)'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowClientDropdown(false)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              {language === 'ar' ? 'إغلاق' : 'Close'}
                            </button>
                          </div>
                        </div>
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setSelectedClient(client);
                              setFormData({ ...formData, client_id: client.id });
                              setShowClientDropdown(false);
                              setClientSearch('');
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="font-semibold text-gray-900">{client.store_name}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-2 mt-0.5">
                              <span>{client.contact_person}</span>
                              <span className="text-gray-400">•</span>
                              <span>{client.mobile}</span>
                            </div>
                            {client.business_type && (
                              <div className="text-xs text-gray-500 mt-1">
                                {language === 'ar' ? client.business_type.name_ar : client.business_type.name_en}
                              </div>
                            )}
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">{language === 'ar' ? 'لم يتم العثور على عملاء' : 'No clients found'}</p>
                        {clientSearch && (
                          <p className="text-xs mt-1">
                            {language === 'ar' ? `لا توجد نتائج لـ "${clientSearch}"` : `No results for "${clientSearch}"`}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="sticky bottom-0 bg-white border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewClientForm(true);
                          setShowClientDropdown(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        {t('addNewClient') || 'Add New Client'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New Client Form Modal */}
          {showNewClientForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
              <div className="bg-white rounded-lg w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4">{t('addNewClient') || 'Add New Client'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      {t('storeName') || 'Store Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newClient.store_name}
                      onChange={(e) => setNewClient({ ...newClient, store_name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      {t('contactPerson') || 'Contact Person'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newClient.contact_person}
                      onChange={(e) => setNewClient({ ...newClient, contact_person: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      {t('mobile') || 'Mobile'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={newClient.mobile}
                      onChange={(e) => setNewClient({ ...newClient, mobile: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      {t('mobile2') || 'Mobile 2'}
                    </label>
                    <input
                      type="tel"
                      value={newClient.mobile_2}
                      onChange={(e) => setNewClient({ ...newClient, mobile_2: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      {t('address') || 'Address'} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={newClient.address}
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      {t('businessType')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newClient.business_type_id}
                      onChange={(e) => setNewClient({ ...newClient, business_type_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="">{t('selectBusinessType') || 'Select Business Type'}</option>
                      {businessTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {language === 'ar' ? type.name_ar : type.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateClient}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (t('create') || 'Create')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewClientForm(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visit Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('visitDate')} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.visit_date}
              onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Previous Agency */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.has_previous_agency}
                onChange={(e) => setFormData({ ...formData, has_previous_agency: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold">
                {language === 'ar' ? 'هل لديهم وكالة سابقة؟' : 'Has Previous Agency?'}
              </span>
            </label>
            {formData.has_previous_agency && (
              <input
                type="text"
                value={formData.previous_agency_name}
                onChange={(e) => setFormData({ ...formData, previous_agency_name: e.target.value })}
                placeholder={language === 'ar' ? 'اسم الوكالة السابقة' : 'Previous Agency Name'}
                className="w-full px-4 py-2 border rounded-lg mt-2"
              />
            )}
          </div>

          {/* Voiceover */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.needs_voiceover}
                onChange={(e) => setFormData({ ...formData, needs_voiceover: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold">
                {language === 'ar' ? 'يحتاج تعليق صوتي؟' : 'Needs Voiceover?'}
              </span>
            </label>
            {formData.needs_voiceover && (
              <input
                type="text"
                value={formData.voiceover_language}
                onChange={(e) => setFormData({ ...formData, voiceover_language: e.target.value })}
                placeholder={language === 'ar' ? 'اللغة (عربي، إنجليزي، إلخ)' : 'Language (Arabic, English, etc.)'}
                className="w-full px-4 py-2 border rounded-lg mt-2"
              />
            )}
          </div>

          {/* Shooting Goals */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'أهداف التصوير' : 'Shooting Goals'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {shootingGoalsOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.shooting_goals.includes(option.value)}
                    onChange={() => toggleArrayValue('shooting_goals', option.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {formData.shooting_goals.includes('other') && (
              <textarea
                value={formData.shooting_goals_other_text}
                onChange={(e) => setFormData({ ...formData, shooting_goals_other_text: e.target.value })}
                placeholder={language === 'ar' ? 'حدد أهداف أخرى...' : 'Specify other goals...'}
                className="w-full px-4 py-2 border rounded-lg mt-2"
                rows={2}
              />
            )}
          </div>

          {/* Service Types */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'أنواع الخدمات' : 'Service Types'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {serviceTypesOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.service_types.includes(option.value)}
                    onChange={() => toggleArrayValue('service_types', option.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {formData.service_types.includes('other') && (
              <textarea
                value={formData.service_types_other_text}
                onChange={(e) => setFormData({ ...formData, service_types_other_text: e.target.value })}
                placeholder={language === 'ar' ? 'حدد خدمات أخرى...' : 'Specify other services...'}
                className="w-full px-4 py-2 border rounded-lg mt-2"
                rows={2}
              />
            )}
          </div>

          {/* Preferred Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'الموقع المفضل' : 'Preferred Location'}
            </label>
            <select
              value={formData.preferred_location}
              onChange={(e) => setFormData({ ...formData, preferred_location: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">{language === 'ar' ? 'اختر الموقع' : 'Select Location'}</option>
              <option value="client_location">{language === 'ar' ? 'موقع العميل' : 'Client Location'}</option>
              <option value="action_studio">{language === 'ar' ? 'استوديو أكشن' : 'Action Studio'}</option>
              <option value="external">{language === 'ar' ? 'خارجي' : 'External'}</option>
            </select>
          </div>

          {/* Product Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'فئة المنتج' : 'Product Category'}
            </label>
            <select
              value={formData.product_category_id}
              onChange={(e) => setFormData({ ...formData, product_category_id: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">{language === 'ar' ? 'اختر الفئة' : 'Select Category'}</option>
              {productCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {language === 'ar' ? cat.name_ar : cat.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Product Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'وصف المنتج' : 'Product Description'}
            </label>
            <textarea
              value={formData.product_description}
              onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>

          {/* Estimated Product Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'عدد المنتجات المتوقع' : 'Estimated Product Count'}
            </label>
            <input
              type="number"
              value={formData.estimated_product_count}
              onChange={(e) => setFormData({ ...formData, estimated_product_count: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              min="1"
            />
          </div>

          {/* Preferred Shoot Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'تاريخ التصوير المفضل' : 'Preferred Shoot Date'}
            </label>
            <input
              type="date"
              value={formData.preferred_shoot_date}
              onChange={(e) => setFormData({ ...formData, preferred_shoot_date: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {/* Budget Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'نطاق الميزانية' : 'Budget Range'}
            </label>
            <input
              type="text"
              value={formData.budget_range}
              onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
              placeholder={language === 'ar' ? 'مثال: 10000-15000 ريال' : 'e.g., 10000-15000 SAR'}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {/* Rep Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'ملاحظات المندوب' : 'Rep Notes'}
            </label>
            <textarea
              value={formData.rep_notes}
              onChange={(e) => setFormData({ ...formData, rep_notes: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
              placeholder={language === 'ar' ? 'أضف أي ملاحظات إضافية...' : 'Add any additional notes...'}
            />
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'رفع صور أو فيديوهات من موقع العميل' : 'Upload Photos or Videos from Client Location'}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                {language === 'ar' 
                  ? 'يمكنك رفع الملفات بعد حفظ الزيارة' 
                  : 'You can upload files after saving the visit'}
              </p>
              <p className="text-xs text-gray-500">
                {language === 'ar'
                  ? 'الحد الأقصى: 50 ميجابايت للملف الواحد'
                  : 'Max: 50MB per file'}
              </p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50 font-semibold"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                editVisit ? (t('update') || 'Update') : (t('create') || 'Create')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VisitForm;
