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
    visit_type: editVisit?.visit_type || '',
    visit_result: editVisit?.visit_result || '',
    visit_reason: editVisit?.visit_reason || '',
    rep_notes: editVisit?.rep_notes || '',
    follow_up_date: editVisit?.follow_up_date || '',
    location_lat: editVisit?.location_lat || '',
    location_lng: editVisit?.location_lng || '',
  });

  const [selectedClient, setSelectedClient] = useState<any>(editVisit?.client || null);

  // New client form
  const [newClient, setNewClient] = useState({
    store_name: '',
    contact_person: '',
    email: '',
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert(language === 'ar' ? 'المتصفح لا يدعم تحديد الموقع' : 'Browser does not support geolocation');
      return;
    }

    // Check if we're on HTTPS or localhost
    const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
      alert(language === 'ar' 
        ? 'يتطلب تحديد الموقع اتصال HTTPS آمن. يرجى استخدام HTTPS أو localhost'
        : 'Geolocation requires a secure HTTPS connection. Please use HTTPS or localhost');
      return;
    }

    // Show loading state
    const loadingMsg = language === 'ar' ? 'جاري تحديد الموقع...' : 'Getting location...';
    console.log(loadingMsg);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          location_lat: position.coords.latitude.toFixed(6),
          location_lng: position.coords.longitude.toFixed(6),
        });
        alert(language === 'ar' 
          ? `تم تحديد الموقع بنجاح\nخط العرض: ${position.coords.latitude.toFixed(6)}\nخط الطول: ${position.coords.longitude.toFixed(6)}`
          : `Location determined successfully\nLatitude: ${position.coords.latitude.toFixed(6)}\nLongitude: ${position.coords.longitude.toFixed(6)}`);
      },
      (error) => {
        let errorMsg = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = language === 'ar' 
              ? 'تم رفض إذن الوصول للموقع. يرجى السماح بالوصول للموقع في إعدادات المتصفح'
              : 'Location permission denied. Please allow location access in browser settings';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = language === 'ar'
              ? 'معلومات الموقع غير متوفرة. تأكد من تفعيل GPS على جهازك'
              : 'Location information unavailable. Make sure GPS is enabled on your device';
            break;
          case error.TIMEOUT:
            errorMsg = language === 'ar'
              ? 'انتهت مهلة طلب تحديد الموقع. يرجى المحاولة مرة أخرى'
              : 'Location request timed out. Please try again';
            break;
          default:
            errorMsg = language === 'ar'
              ? `خطأ غير معروف في تحديد الموقع: ${error.message}`
              : `Unknown error occurred: ${error.message}`;
        }
        alert(errorMsg);
        console.error('Geolocation error:', error);
      },
      options
    );
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
          email: '',
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
        location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
        location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null,
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

  const visitTypeOptions = [
    { value: 'new_client', label: language === 'ar' ? 'عميل جديد' : 'New Client' },
    { value: 'follow_up', label: language === 'ar' ? 'متابعة' : 'Follow-up' },
    { value: 'service_delivery', label: language === 'ar' ? 'تسليم خدمة' : 'Service Delivery' },
  ];

  const visitResultOptions = [
    { value: 'interested', label: language === 'ar' ? 'مهتم' : 'Interested' },
    { value: 'not_interested', label: language === 'ar' ? 'غير مهتم' : 'Not Interested' },
    { value: 'needs_follow_up', label: language === 'ar' ? 'يحتاج متابعة' : 'Needs Follow-up' },
    { value: 'deal_closed', label: language === 'ar' ? 'تم إغلاق الصفقة' : 'Deal Closed' },
  ];

  const visitReasonOptions = [
    { value: 'product_presentation', label: language === 'ar' ? 'عرض منتج' : 'Product Presentation' },
    { value: 'price_discussion', label: language === 'ar' ? 'مناقشة الأسعار' : 'Price Discussion' },
    { value: 'contract_signing', label: language === 'ar' ? 'توقيع عقد' : 'Contract Signing' },
    { value: 'service_inquiry', label: language === 'ar' ? 'استفسار عن خدمة' : 'Service Inquiry' },
    { value: 'complaint_resolution', label: language === 'ar' ? 'حل شكوى' : 'Complaint Resolution' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
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

        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-6 space-y-6">
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
            <div className="fixed inset-0 bg-white z-[60] overflow-y-auto">
              <div className="w-full">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
                  <h3 className="text-xl font-bold">{t('addNewClient') || 'Add New Client'}</h3>
                  <button
                    type="button"
                    onClick={() => setShowNewClientForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="max-w-2xl mx-auto p-6 space-y-4">
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
                      {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    </label>
                    <input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
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
                  <div className="flex gap-2 pt-4">
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

          {/* Location Coordinates */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'إحداثيات الموقع (GPS)' : 'Location Coordinates (GPS)'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.location_lat && formData.location_lng ? `${formData.location_lat}, ${formData.location_lng}` : ''}
                placeholder={language === 'ar' ? 'مثال: 46.6753, 24.7136' : 'Example: 46.6753, 24.7136'}
                className="flex-1 px-4 py-2 border rounded-lg bg-gray-50"
                readOnly
              />
              <button
                type="button"
                onClick={handleGetLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                {language === 'ar' ? 'تحديد الموقع' : 'Determine Location'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'ar' ? 'اضغط على "تحديد الموقع" للحصول على الإحداثيات تلقائياً' : 'Click "Determine Location" to get coordinates automatically'}
            </p>
          </div>

          {/* Visit Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'نوع العميل' : 'Visit Type'}
            </label>
            <select
              value={formData.visit_type}
              onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{language === 'ar' ? 'اختر نوع الزيارة' : 'Select Visit Type'}</option>
              {visitTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Visit Details Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">
              {language === 'ar' ? 'تفاصيل الزيارة' : 'Visit Details'}
            </h3>

            {/* Visit Result */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {language === 'ar' ? 'نتيجة الزيارة' : 'Visit Result'}
              </label>
              <select
                value={formData.visit_result}
                onChange={(e) => setFormData({ ...formData, visit_result: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{language === 'ar' ? 'اختر نتيجة الزيارة' : 'Select Visit Result'}</option>
                {visitResultOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Visit Reason */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {language === 'ar' ? 'سبب الزيارة' : 'Visit Reason'}
              </label>
              <select
                value={formData.visit_reason}
                onChange={(e) => setFormData({ ...formData, visit_reason: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{language === 'ar' ? 'اختر سبب الزيارة' : 'Select Visit Reason'}</option>
                {visitReasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Agent Notes */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {language === 'ar' ? 'ملاحظات العميل' : 'Agent Notes'}
              </label>
              <textarea
                value={formData.rep_notes}
                onChange={(e) => setFormData({ ...formData, rep_notes: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder={language === 'ar' ? 'أضف أي ملاحظات إضافية...' : 'Add any additional notes...'}
              />
            </div>
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'تاريخ المتابعة القادمة' : 'Follow-up Date'}
            </label>
            <input
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'صورة الموقع أو الأوساط' : 'Photo from Location or Surroundings'}
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
                  ? 'الحد الأقصى: 5MB. الأنواع المدعومة: JPG, PNG, GIF'
                  : 'Max: 5MB. Supported types: JPG, PNG, GIF'}
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
                editVisit ? (t('update') || 'Update') : (language === 'ar' ? 'حفظ الزيارة' : 'Save Visit')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VisitForm;
