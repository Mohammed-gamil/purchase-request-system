import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, Download, Printer, Calendar, User, CheckCircle, XCircle, Clock, X, Eye, ThumbsUp, ThumbsDown, Send, FileText, MapPin, Briefcase, Camera } from 'lucide-react';
import { inventoryRequestsApi, inventoryApi, apiClient } from '@/lib/api';
import InventoryRequestPrintView from '@/components/inventory/InventoryRequestPrintView';
import ReturnReceiptPrintView from '@/components/inventory/ReturnReceiptPrintView';

interface InventoryRequestManagementProps {
  language: 'en' | 'ar';
  currentUser: {
    id: string | number;
    name: string;
    email: string;
    role: string;
    apiRole?: string;
  };
  t: (key: string) => string;
  viewMode?: 'list' | 'create' | 'detail';
  selectedId?: number;
  onNavigate?: (mode: 'list' | 'create' | 'detail', id?: number) => void;
}

interface InventoryRequestItem {
  inventory_item_id: number;
  inventory_item?: any;
  quantity_requested: number;
  quantity_approved?: number;
  expected_return_date?: string;
  serial_number?: string;
  condition_before_exit?: string;
  // Return tracking
  quantity_returned?: number;
  condition_after_return?: string;
  return_notes?: string;
}

interface InventoryRequest {
  id: number;
  request_id: string;
  title: string;
  description: string;
  requester_id: number;
  requester?: any;
  direct_manager_id?: number;
  direct_manager?: any;
  status: 'draft' | 'submitted' | 'dm_approved' | 'dm_rejected' | 'final_approved' | 'final_rejected' | 'returned';
  rejection_reason?: string;
  items: InventoryRequestItem[];
  // Employee Information
  employee_name?: string;
  employee_position?: string;
  employee_phone?: string;
  // Exit Details
  exit_purpose?: 'client_shoot' | 'field_shoot' | 'podcast_ad' | 'equipment_test' | 'other';
  custom_exit_purpose?: string;
  client_entity_name?: string;
  shoot_location?: string;
  exit_duration_from?: string;
  exit_duration_to?: string;
  // Responsible Persons
  warehouse_manager_id?: number;
  warehouse_manager?: any;
  // Return Information
  return_date?: string;
  return_supervisor_name?: string;
  return_supervisor_phone?: string;
  equipment_condition_on_return?: 'excellent' | 'needs_cleaning' | 'needs_maintenance' | 'damaged_or_lost';
  supervisor_notes?: string;
  returned_by_employee?: string;
  created_at: string;
  updated_at: string;
}

const InventoryRequestManagement: React.FC<InventoryRequestManagementProps> = ({
  language,
  currentUser,
  t,
  viewMode = 'list',
  selectedId,
  onNavigate
}) => {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InventoryRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showReturnReceiptPrintView, setShowReturnReceiptPrintView] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [returnFormData, setReturnFormData] = useState({
    return_date: new Date().toISOString().split('T')[0],
    return_supervisor_name: '',
    return_supervisor_phone: '',
    equipment_condition_on_return: 'excellent' as 'excellent' | 'needs_cleaning' | 'needs_maintenance' | 'damaged_or_lost',
    supervisor_notes: '',
    returned_by_employee: '',
    items: [] as any[],
  });
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    direct_manager_id: '',
    items: [] as any[],
    // Employee Information
    employee_name: '',
    employee_position: '',
    employee_phone: '',
    // Exit Details
    exit_purpose: 'client_shoot' as 'client_shoot' | 'field_shoot' | 'podcast_ad' | 'equipment_test' | 'other',
    custom_exit_purpose: '',
    client_entity_name: '',
    shoot_location: '',
    exit_duration_from: '',
    exit_duration_to: '',
    // Responsible Persons
    warehouse_manager_id: '',
  });
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const isRTL = language === 'ar';

  // Handle navigation
  const handleNavigate = (mode: 'list' | 'create' | 'detail', id?: number) => {
    if (onNavigate) {
      onNavigate(mode, id);
    } else {
      // Fallback to old modal behavior if no navigation handler provided
      if (mode === 'create') {
        setShowCreateForm(true);
      } else if (mode === 'list') {
        setShowCreateForm(false);
        setSelectedRequest(null);
        setShowDetailModal(false);
        setShowReturnForm(false);
      } else if (mode === 'detail' && id) {
        const request = requests.find(r => r.id === id);
        if (request) {
          setSelectedRequest(request);
          setShowDetailModal(true);
        }
      }
    }
  };

  // Load selected request when in detail mode
  useEffect(() => {
    if (viewMode === 'detail' && selectedId && requests.length > 0) {
      const request = requests.find(r => r.id === selectedId);
      if (request) {
        setSelectedRequest(request);
        setShowDetailModal(true);
      }
    } else if (viewMode === 'create') {
      setShowCreateForm(true);
    } else if (viewMode === 'list') {
      setShowCreateForm(false);
      setShowDetailModal(false);
      setShowReturnForm(false);
      setSelectedRequest(null);
    }
  }, [viewMode, selectedId, requests]);

  useEffect(() => {
    loadRequests();
    loadInventoryItems();
    loadManagers();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await inventoryRequestsApi.getAll();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load inventory requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      console.log('Loading inventory items...');
      const response = await inventoryApi.getItems();
      console.log('Inventory API response:', response);
      console.log('Inventory items data:', response.data);
      setInventoryItems(response.data || []);
      console.log('Inventory items set:', response.data?.length || 0, 'items');
    } catch (error) {
      console.error('Failed to load inventory items:', error);
      console.error('Error details:', error);
    }
  };

  const loadManagers = async () => {
    try {
      const response = await apiClient.get('/users/by-role?role=DIRECT_MANAGER');
      setManagers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load managers:', error);
    }
  };

  const handleCreateRequest = () => {
    console.log('Creating new request. Inventory items available:', inventoryItems.length);
    console.log('Inventory items:', inventoryItems);
    setFormData({
      title: '',
      description: '',
      direct_manager_id: '',
      items: [],
      employee_name: '',
      employee_position: '',
      employee_phone: '',
      exit_purpose: 'client_shoot',
      custom_exit_purpose: '',
      client_entity_name: '',
      shoot_location: '',
      exit_duration_from: '',
      exit_duration_to: '',
      warehouse_manager_id: '',
    });
    handleNavigate('create');
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { 
        inventory_item_id: '', 
        quantity_requested: 1, 
        expected_return_date: '',
        serial_number: '',
        condition_before_exit: 'good'
      }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleSubmitForm = async (isDraft: boolean) => {
    if (!formData.title || !formData.direct_manager_id || formData.items.length === 0) {
      alert(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    // Client-side validation for items
    for (let i = 0; i < formData.items.length; i++) {
      const it = formData.items[i];
      if (!it.inventory_item_id) {
        alert(isRTL ? `اختر المعدة للعنصر ${i + 1}` : `Please select equipment for item ${i + 1}`);
        return;
      }
      if (!it.quantity_requested || Number(it.quantity_requested) < 1) {
        alert(isRTL ? `حدد كمية صحيحة للعنصر ${i + 1}` : `Please enter a valid quantity for item ${i + 1}`);
        return;
      }
    }

    // Prepare payload that matches backend validation rules
    const exitPurposeMap: Record<string, string> = {
      client_shoot: 'client_project',
      field_shoot: 'event_coverage',
      podcast_ad: 'product_photography',
      equipment_test: 'maintenance',
      other: 'other',
    };

    const payload: any = {
      title: formData.title,
      description: formData.description || null,
      direct_manager_id: formData.direct_manager_id ? Number(formData.direct_manager_id) : null,
      warehouse_manager_id: formData.warehouse_manager_id ? Number(formData.warehouse_manager_id) : null,
      employee_name: formData.employee_name || null,
      employee_position: formData.employee_position || null,
      employee_phone: formData.employee_phone || null,
      exit_purpose: exitPurposeMap[formData.exit_purpose] || formData.exit_purpose,
      custom_exit_purpose: formData.custom_exit_purpose || null,
      client_entity_name: formData.client_entity_name || null,
      shoot_location: formData.shoot_location || null,
      exit_duration_from: formData.exit_duration_from || null,
      exit_duration_to: formData.exit_duration_to || null,
      items: formData.items.map((it: any) => ({
        inventory_item_id: Number(it.inventory_item_id) || null,
        quantity_requested: Number(it.quantity_requested) || 0,
        expected_return_date: it.expected_return_date || null,
        serial_number: it.serial_number || null,
        condition_before_exit: it.condition_before_exit || null,
      })),
    };

    setSubmitting(true);
    try {
      console.log('Submitting inventory request payload:', payload);
      const newRequest = await inventoryRequestsApi.create(payload);

      if (!isDraft) {
        await inventoryRequestsApi.submit(newRequest.id);
      }

      await loadRequests();
      handleNavigate('list');
      alert(isRTL ? 'تم إنشاء الطلب بنجاح' : 'Request created successfully');
    } catch (error: any) {
      // Show detailed server validation errors or raw response to help debugging
      console.error('Failed to create request (axios error):', error);
      const resp = error?.response;
      let message = (isRTL ? 'فشل في إنشاء الطلب' : 'Failed to create request');

      if (resp) {
        console.error('Server response status:', resp.status, resp.statusText);
        console.error('Server response headers:', resp.headers);
        console.error('Server response data:', resp.data);

        // If server returned JSON
        if (typeof resp.data === 'object' && resp.data !== null) {
          // Try known shapes
          if (resp.data.error?.message) message = resp.data.error.message;
          else if (resp.data.message && typeof resp.data.message === 'string') message = resp.data.message;
          else if (resp.data.errors) {
            const firstField = Object.keys(resp.data.errors)[0];
            if (firstField) message = resp.data.errors[firstField][0];
          }
        } else if (typeof resp.data === 'string') {
          // Sometimes Laravel returns HTML stack trace on 500 — log it and show a small hint
          const snippet = resp.data.substring(0, 1000);
          console.error('Server returned HTML (first 1KB):', snippet);
          message = `${isRTL ? 'خطأ في الخادم' : 'Server error'} ${resp.status} - check server logs`;
        }
      } else {
        console.error('No response received from server, network error or CORS');
        message = (isRTL ? 'تعذر الوصول إلى الخادم' : 'Unable to reach server');
      }

      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintRequest = (request: InventoryRequest) => {
    // Print functionality
    window.print();
  };

  const handleViewDetails = (request: InventoryRequest) => {
    handleNavigate('detail', request.id);
  };

  const handleApprove = async (requestId: number) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الموافقة على هذا الطلب؟' : 'Are you sure you want to approve this request?')) {
      return;
    }

    try {
      const status = currentUser.apiRole === 'DIRECT_MANAGER' ? 'dm_approved' : 'final_approved';
      await inventoryRequestsApi.updateStatus(requestId, status);
      await loadRequests();
      handleNavigate('list');
      alert(isRTL ? 'تمت الموافقة بنجاح' : 'Approved successfully');
    } catch (error: any) {
      console.error('Failed to approve:', error);
      alert(error?.response?.data?.error?.message || (isRTL ? 'فشل في الموافقة' : 'Failed to approve'));
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert(isRTL ? 'يرجى إدخال سبب الرفض' : 'Please enter rejection reason');
      return;
    }

    if (!selectedRequest) return;

    try {
      const status = currentUser.apiRole === 'DIRECT_MANAGER' ? 'dm_rejected' : 'final_rejected';
      await inventoryRequestsApi.updateStatus(selectedRequest.id, status, rejectionReason);
      await loadRequests();
      handleNavigate('list');
      setShowRejectModal(false);
      setRejectionReason('');
      alert(isRTL ? 'تم الرفض بنجاح' : 'Rejected successfully');
    } catch (error: any) {
      console.error('Failed to reject:', error);
      alert(error?.response?.data?.error?.message || (isRTL ? 'فشل في الرفض' : 'Failed to reject'));
    }
  };

  const canApprove = (request: InventoryRequest) => {
    if (currentUser.apiRole === 'DIRECT_MANAGER') {
      return request.status === 'submitted' && request.direct_manager_id === Number(currentUser.id);
    }
    if (currentUser.apiRole === 'ADMIN') {
      return request.status === 'dm_approved';
    }
    return false;
  };

  const canReject = (request: InventoryRequest) => {
    return canApprove(request);
  };

  const handleOpenReturnForm = (request: InventoryRequest) => {
    setSelectedRequest(request);
    setReturnFormData({
      return_date: new Date().toISOString().split('T')[0],
      return_supervisor_name: '',
      return_supervisor_phone: '',
      equipment_condition_on_return: 'excellent',
      supervisor_notes: '',
      returned_by_employee: request.employee_name || '',
      items: request.items.map(item => ({
        inventory_item_id: item.inventory_item_id,
        quantity_returned: item.quantity_requested,
        condition_after_return: 'excellent',
        return_notes: ''
      })),
    });
    setShowReturnForm(true);
  };

  const handleReturnItemChange = (index: number, field: string, value: any) => {
    setReturnFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleSubmitReturn = async () => {
    if (!returnFormData.return_supervisor_name || !returnFormData.return_supervisor_phone) {
      alert(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if (!selectedRequest) return;

    try {
      // Here you would call the API to update the request with return information
      // await inventoryRequestsApi.recordReturn(selectedRequest.id, returnFormData);
      
      await inventoryRequestsApi.updateStatus(selectedRequest.id, 'returned');
      await loadRequests();
      setShowReturnForm(false);
      handleNavigate('list');
      alert(isRTL ? 'تم تسجيل استلام المعدات بنجاح' : 'Equipment return recorded successfully');
    } catch (error: any) {
      console.error('Failed to record return:', error);
      alert(error?.response?.data?.error?.message || (isRTL ? 'فشل في تسجيل الاستلام' : 'Failed to record return'));
    }
  };

  const handleDownloadPdf = async (requestId: number) => {
    if (downloading) return;
    
    setDownloading(true);
    try {
      // Fetch the request data
      const response = await inventoryRequestsApi.downloadPdf(requestId);
      if (response.success && response.data) {
        setSelectedRequest(response.data);
        setShowPrintView(true);
      }
    } catch (error: any) {
      console.error('Failed to load print view:', error);
      alert(error?.response?.data?.error?.message || (isRTL ? 'فشل في تحميل بيانات الطلب' : 'Failed to load request data'));
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadReturnReceipt = async (requestId: number) => {
    if (downloading) return;
    
    setDownloading(true);
    try {
      // Fetch the request data
      const response = await inventoryRequestsApi.downloadReturnReceipt(requestId);
      if (response.success && response.data) {
        setSelectedRequest(response.data);
        setShowReturnReceiptPrintView(true);
      }
    } catch (error: any) {
      console.error('Failed to load return receipt:', error);
      alert(error?.response?.data?.error?.message || (isRTL ? 'فشل في تحميل إيصال الإرجاع' : 'Failed to load return receipt'));
    } finally {
      setDownloading(false);
    }
  };

  const canReturn = (request: InventoryRequest) => {
    return request.status === 'final_approved' && currentUser.apiRole === 'ADMIN';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'dm_approved': return 'bg-green-100 text-green-800';
      case 'dm_rejected': return 'bg-red-100 text-red-800';
      case 'final_approved': return 'bg-green-100 text-green-800';
      case 'final_rejected': return 'bg-red-100 text-red-800';
      case 'returned': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'final_approved':
      case 'dm_approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'dm_rejected':
      case 'final_rejected':
        return <XCircle className="w-4 h-4" />;
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.request_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || request.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Main List View */}
      {viewMode === 'list' && (
        <>
          {/* Header */}
          <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-600 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {isRTL ? 'طلبات المخزون' : 'Inventory Requests'}
              </h1>
              <p className="text-sm text-gray-600">
                {isRTL ? 'إدارة طلبات عناصر المخزون' : 'Manage inventory item requests'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateRequest}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">{isRTL ? 'طلب جديد' : 'New Request'}</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRTL ? 'بحث في الطلبات...' : 'Search requests...'}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">{isRTL ? 'كل الحالات' : 'All Status'}</option>
              <option value="draft">{isRTL ? 'مسودة' : 'Draft'}</option>
              <option value="submitted">{isRTL ? 'مقدم' : 'Submitted'}</option>
              <option value="dm_approved">{isRTL ? 'موافقة المدير المباشر' : 'DM Approved'}</option>
              <option value="final_approved">{isRTL ? 'موافقة نهائية' : 'Final Approved'}</option>
              <option value="returned">{isRTL ? 'تم الإرجاع' : 'Returned'}</option>
              <option value="dm_rejected">{isRTL ? 'مرفوض' : 'Rejected'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isRTL ? 'لا توجد طلبات' : 'No Requests'}
          </h3>
          <p className="text-gray-600 mb-6">
            {isRTL ? 'ابدأ بإنشاء طلب مخزون جديد' : 'Start by creating a new inventory request'}
          </p>
          <button
            onClick={handleCreateRequest}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {isRTL ? 'طلب جديد' : 'New Request'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{request.title}</h3>
                  <p className="text-xs text-gray-500">{request.request_id}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                  {getStatusIcon(request.status)}
                  {request.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              {request.client_entity_name && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">{isRTL ? 'العميل/الجهة: ' : 'Client/Entity: '}</span>
                  {request.client_entity_name}
                </p>
              )}
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{request.description}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(request.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                </div>
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {request.items?.length || 0} {isRTL ? 'عنصر' : 'items'}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewDetails(request)}
                  className="flex-1 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-semibold flex items-center justify-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  {isRTL ? 'عرض' : 'View'}
                </button>
                <button
                  onClick={() => handleDownloadPdf(request.id)}
                  disabled={downloading}
                  className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isRTL ? 'تحميل PDF' : 'Download PDF'}
                >
                  <Download className="w-4 h-4" />
                </button>
                {request.status === 'returned' && (
                  <button
                    onClick={() => handleDownloadReturnReceipt(request.id)}
                    disabled={downloading}
                    className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isRTL ? 'إيصال الإرجاع' : 'Return Receipt'}
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                )}
                {canApprove(request) && (
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-semibold"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                )}
                {canReject(request) && (
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowRejectModal(true);
                    }}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                )}
                {canReturn(request) && (
                  <button
                    onClick={() => handleOpenReturnForm(request)}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold"
                    title={isRTL ? 'تسجيل الإرجاع' : 'Record Return'}
                  >
                    <Package className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* Create Form Modal */}
      {viewMode === 'create' && (
        <div className="bg-gray-50 min-h-screen w-full overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="w-full">
            <div className="sticky top-0 bg-white border-b px-4 md:px-6 py-4 flex justify-between items-center shadow-sm z-10">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-purple-900">
                  {isRTL ? 'نموذج إذن خروج معدات تصوير – Action Group' : 'Equipment Exit Permit Form – Action Group'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isRTL ? 'القسم: قسم الإنتاج والتصوير' : 'Department: Production & Photography'}
                </p>
              </div>
              <button onClick={() => handleNavigate('list')} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-6">
              {/* Employee Information Section */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 md:p-6 rounded-lg border-l-4 border-purple-600 shadow-sm">
                <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {isRTL ? 'معلومات الموظف المسؤول' : 'Responsible Employee Information'}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'اسم الموظف' : 'Employee Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.employee_name}
                      onChange={(e) => setFormData({...formData, employee_name: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={isRTL ? 'أدخل اسم الموظف' : 'Enter employee name'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'الوظيفة' : 'Position'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.employee_position}
                      onChange={(e) => setFormData({...formData, employee_position: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={isRTL ? 'أدخل الوظيفة' : 'Enter position'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'رقم الجوال' : 'Mobile Number'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.employee_phone}
                      onChange={(e) => setFormData({...formData, employee_phone: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={isRTL ? 'أدخل رقم الجوال' : 'Enter mobile number'}
                    />
                  </div>
                </div>
              </div>

              {/* Exit Details Section */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 md:p-6 rounded-lg border-l-4 border-blue-600 shadow-sm">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  {isRTL ? 'تفاصيل الخروج' : 'Exit Details'}
                </h3>

                <div className="space-y-4 md:space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'العنوان / الغرض من الخروج' : 'Title / Purpose of Exit'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={isRTL ? 'أدخل عنوان/غرض الخروج' : 'Enter exit title/purpose'}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-700">
                        {isRTL ? 'الغرض من الخروج' : 'Exit Purpose'} <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'client_shoot', label: isRTL ? 'تصوير خارجي لعميل' : 'External Client Shoot' },
                          { value: 'field_shoot', label: isRTL ? 'تصوير ميداني' : 'Field Shoot' },
                          { value: 'podcast_ad', label: isRTL ? 'تصوير بودكاست / إعلان' : 'Podcast / Ad Shoot' },
                          { value: 'equipment_test', label: isRTL ? 'تجربة ميدانية للمعدات' : 'Equipment Field Test' },
                          { value: 'other', label: isRTL ? 'أخرى' : 'Other' },
                        ].map((purpose) => (
                          <label key={purpose.value} className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                            <input
                              type="radio"
                              name="exit_purpose"
                              value={purpose.value}
                              checked={formData.exit_purpose === purpose.value}
                              onChange={(e) => setFormData({...formData, exit_purpose: e.target.value as any})}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{purpose.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {formData.exit_purpose === 'other' && (
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          {isRTL ? 'حدد الغرض' : 'Specify Purpose'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.custom_exit_purpose}
                          onChange={(e) => setFormData({...formData, custom_exit_purpose: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={isRTL ? 'أدخل الغرض' : 'Enter custom purpose'}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        {isRTL ? 'اسم العميل أو الجهة' : 'Client or Entity Name'}
                      </label>
                      <input
                        type="text"
                        value={formData.client_entity_name}
                        onChange={(e) => setFormData({...formData, client_entity_name: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder={isRTL ? 'أدخل اسم العميل أو الجهة' : 'Enter client/entity name'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        {isRTL ? 'موقع التصوير' : 'Shoot Location'} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={formData.shoot_location}
                          onChange={(e) => setFormData({...formData, shoot_location: e.target.value})}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={isRTL ? 'أدخل موقع التصوير' : 'Enter shoot location'}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        {isRTL ? 'مدة الخروج - من' : 'Exit Duration - From'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.exit_duration_from}
                        onChange={(e) => setFormData({...formData, exit_duration_from: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        {isRTL ? 'مدة الخروج - إلى' : 'Exit Duration - To'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.exit_duration_to}
                        onChange={(e) => setFormData({...formData, exit_duration_to: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'ملاحظات إضافية' : 'Additional Notes'}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder={isRTL ? 'ملاحظات إضافية عن الخروج...' : 'Additional notes about the exit...'}
                    />
                  </div>
                </div>
              </div>

              {/* Equipment List Section */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border-l-4 border-orange-600">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {isRTL ? 'المعدات المطلوب إخراجها' : 'Equipment to be Taken Out'}
                  </h3>
                  <button
                    onClick={handleAddItem}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'إضافة معدة' : 'Add Equipment'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300 rounded-lg">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'رقم' : '#'}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'اسم المعدة' : 'Equipment Name'}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'الكمية' : 'Quantity'}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'الرقم التسلسلي' : 'Serial Number'}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'حالة المعدة قبل الخروج' : 'Condition Before Exit'}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'تاريخ الإرجاع المتوقع' : 'Expected Return'}</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700 border-b">{isRTL ? 'إجراء' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-orange-50">
                          <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                          <td className="px-4 py-3">
                            <select
                              value={item.inventory_item_id}
                              onChange={(e) => handleItemChange(index, 'inventory_item_id', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="">{isRTL ? 'اختر المعدة' : 'Select Equipment'}</option>
                              {inventoryItems.map(invItem => (
                                <option key={invItem.id} value={invItem.id}>
                                  {invItem.name} ({invItem.code})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity_requested}
                              onChange={(e) => handleItemChange(index, 'quantity_requested', parseInt(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.serial_number || ''}
                              onChange={(e) => handleItemChange(index, 'serial_number', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                              placeholder={isRTL ? 'إن وجد' : 'If any'}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={item.condition_before_exit || 'good'}
                              onChange={(e) => handleItemChange(index, 'condition_before_exit', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="excellent">{isRTL ? 'ممتازة' : 'Excellent'}</option>
                              <option value="good">{isRTL ? 'جيدة' : 'Good'}</option>
                              <option value="fair">{isRTL ? 'مقبولة' : 'Fair'}</option>
                              <option value="needs_maintenance">{isRTL ? 'تحتاج صيانة' : 'Needs Maintenance'}</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={item.expected_return_date || ''}
                              onChange={(e) => handleItemChange(index, 'expected_return_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {formData.items.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500 bg-gray-50">
                            {isRTL ? 'لا توجد معدات. انقر على "إضافة معدة" للبدء' : 'No equipment. Click "Add Equipment" to start'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Responsible Persons Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-l-4 border-green-600">
                <h3 className="text-lg font-bold text-green-900 mb-4">
                  {isRTL ? 'المسؤولون' : 'Responsible Persons'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'مسؤول المستودع / المدير المباشر' : 'Warehouse Manager / Direct Manager'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.direct_manager_id}
                      onChange={(e) => setFormData({...formData, direct_manager_id: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">{isRTL ? 'اختر المسؤول' : 'Select Manager'}</option>
                      {managers.map(manager => (
                        <option key={manager.id} value={manager.id}>{manager.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'اسم المستلم (الموظف)' : 'Receiver Name (Employee)'}
                    </label>
                    <input
                      type="text"
                      value={formData.employee_name}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                      placeholder={isRTL ? 'سيتم ملؤه تلقائياً' : 'Auto-filled'}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleSubmitForm(false)}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 font-semibold shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? (isRTL ? 'جاري الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال الطلب' : 'Submit Request')}
                </button>
                <button
                  onClick={() => handleSubmitForm(true)}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-semibold transition-all"
                >
                  {isRTL ? 'حفظ كمسودة' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => handleNavigate('list')}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal with Approval Flow */}
      {viewMode === 'detail' && selectedRequest && (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="w-full min-h-screen">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedRequest.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedRequest.request_id}</p>
              </div>
              <button onClick={() => handleNavigate('list')} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
              {/* Approval Flow Timeline */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 md:p-6 rounded-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  {isRTL ? 'مسار الموافقة' : 'Approval Flow'}
                </h3>
                <div className="flex items-center justify-between relative">
                  {/* Timeline Line */}
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-300" />
                  
                  {/* Step 1: Submitted */}
                  <div className="relative flex flex-col items-center z-10 bg-white px-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      ['submitted', 'dm_approved', 'dm_rejected', 'final_approved', 'final_rejected'].includes(selectedRequest.status)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      <Send className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold mt-2 text-center">
                      {isRTL ? 'مقدم' : 'Submitted'}
                    </p>
                  </div>

                  {/* Step 2: DM Approval */}
                  <div className="relative flex flex-col items-center z-10 bg-white px-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedRequest.status === 'dm_approved' || selectedRequest.status === 'final_approved'
                        ? 'bg-green-500 text-white'
                        : selectedRequest.status === 'dm_rejected'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {selectedRequest.status === 'dm_rejected' ? (
                        <XCircle className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-xs font-semibold mt-2 text-center">
                      {isRTL ? 'المدير المباشر' : 'Direct Manager'}
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      {selectedRequest.status === 'dm_approved' ? (isRTL ? 'موافق' : 'Approved') :
                       selectedRequest.status === 'dm_rejected' ? (isRTL ? 'مرفوض' : 'Rejected') :
                       (isRTL ? 'قيد الانتظار' : 'Pending')}
                    </p>
                  </div>

                  {/* Step 3: Final Approval */}
                  <div className="relative flex flex-col items-center z-10 bg-white px-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedRequest.status === 'final_approved'
                        ? 'bg-green-500 text-white'
                        : selectedRequest.status === 'final_rejected'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {selectedRequest.status === 'final_approved' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : selectedRequest.status === 'final_rejected' ? (
                        <XCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-xs font-semibold mt-2 text-center">
                      {isRTL ? 'الموافقة النهائية' : 'Final Approval'}
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      {selectedRequest.status === 'final_approved' ? (isRTL ? 'موافق' : 'Approved') :
                       selectedRequest.status === 'final_rejected' ? (isRTL ? 'مرفوض' : 'Rejected') :
                       (isRTL ? 'قيد الانتظار' : 'Pending')}
                    </p>
                  </div>
                </div>

                {selectedRequest.rejection_reason && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 mb-1">{isRTL ? 'سبب الرفض:' : 'Rejection Reason:'}</p>
                    <p className="text-sm text-red-700">{selectedRequest.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Employee Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">{isRTL ? 'معلومات الموظف' : 'Employee Information'}</h4>
                <div className="space-y-2 text-sm">
                  {selectedRequest.employee_name && <p><span className="font-semibold">{isRTL ? 'الاسم:' : 'Name:'}</span> {selectedRequest.employee_name}</p>}
                  {selectedRequest.employee_position && <p><span className="font-semibold">{isRTL ? 'الوظيفة:' : 'Position:'}</span> {selectedRequest.employee_position}</p>}
                  {selectedRequest.employee_phone && <p><span className="font-semibold">{isRTL ? 'الهاتف:' : 'Phone:'}</span> {selectedRequest.employee_phone}</p>}
                </div>
              </div>

              {/* Exit Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">{isRTL ? 'تفاصيل الخروج' : 'Exit Details'}</h4>
                  <div className="space-y-2 text-sm">
                    {selectedRequest.exit_purpose && (
                      <p><span className="font-semibold">{isRTL ? 'الغرض:' : 'Purpose:'}</span> {selectedRequest.exit_purpose.replace('_', ' ')}</p>
                    )}
                    {selectedRequest.client_entity_name && (
                      <p><span className="font-semibold">{isRTL ? 'العميل/الجهة:' : 'Client/Entity:'}</span> {selectedRequest.client_entity_name}</p>
                    )}
                    {selectedRequest.shoot_location && (
                      <p><span className="font-semibold">{isRTL ? 'الموقع:' : 'Location:'}</span> {selectedRequest.shoot_location}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">{isRTL ? 'المدة' : 'Duration'}</h4>
                  <div className="space-y-2 text-sm">
                    {selectedRequest.exit_duration_from && (
                      <p><span className="font-semibold">{isRTL ? 'من:' : 'From:'}</span> {new Date(selectedRequest.exit_duration_from).toLocaleString()}</p>
                    )}
                    {selectedRequest.exit_duration_to && (
                      <p><span className="font-semibold">{isRTL ? 'إلى:' : 'To:'}</span> {new Date(selectedRequest.exit_duration_to).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment List */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">{isRTL ? 'المعدات' : 'Equipment'}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left">{isRTL ? '#' : '#'}</th>
                        <th className="px-3 py-2 text-left">{isRTL ? 'المعدة' : 'Item'}</th>
                        <th className="px-3 py-2 text-left">{isRTL ? 'الكمية' : 'Qty'}</th>
                        <th className="px-3 py-2 text-left">{isRTL ? 'الحالة' : 'Condition'}</th>
                        <th className="px-3 py-2 text-left">{isRTL ? 'الإرجاع المتوقع' : 'Return Date'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items?.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">{item.inventory_item?.name || 'N/A'}</td>
                          <td className="px-3 py-2">{item.quantity_requested}</td>
                          <td className="px-3 py-2">{item.condition_before_exit || 'N/A'}</td>
                          <td className="px-3 py-2">{item.expected_return_date || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedRequest.description && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">{isRTL ? 'ملاحظات' : 'Notes'}</h4>
                  <p className="text-sm text-yellow-800">{selectedRequest.description}</p>
                </div>
              )}

              {/* Action Buttons */}
              {(canApprove(selectedRequest) || canReject(selectedRequest) || canReturn(selectedRequest)) && (
                <div className="flex gap-3 pt-4 border-t">
                  {canApprove(selectedRequest) && (
                    <button
                      onClick={() => handleApprove(selectedRequest.id)}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-5 h-5" />
                      {isRTL ? 'موافقة' : 'Approve'}
                    </button>
                  )}
                  {canReject(selectedRequest) && (
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <ThumbsDown className="w-5 h-5" />
                      {isRTL ? 'رفض' : 'Reject'}
                    </button>
                  )}
                  {canReturn(selectedRequest) && (
                    <button
                      onClick={() => handleOpenReturnForm(selectedRequest)}
                      className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <Package className="w-5 h-5" />
                      {isRTL ? 'تسجيل الإرجاع' : 'Record Return'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadPdf(selectedRequest.id)}
                    disabled={downloading}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    {isRTL ? 'تحميل الطلب' : 'Download Request'}
                  </button>
                  {selectedRequest.status === 'returned' && (
                    <button
                      onClick={() => handleDownloadReturnReceipt(selectedRequest.id)}
                      disabled={downloading}
                      className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileText className="w-4 h-4" />
                      {isRTL ? 'إيصال الإرجاع' : 'Return Receipt'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{isRTL ? 'سبب الرفض' : 'Rejection Reason'}</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={4}
              placeholder={isRTL ? 'أدخل سبب رفض الطلب...' : 'Enter rejection reason...'}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                {isRTL ? 'تأكيد الرفض' : 'Confirm Reject'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Return Form Modal */}
      {showReturnForm && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-lg w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-indigo-900">
                  {isRTL ? 'استلام معدات التصوير بعد العودة – Action Group' : 'Equipment Return Receipt Form – Action Group'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isRTL ? 'القسم: قسم الإنتاج والتصوير' : 'Department: Production & Photography'}
                </p>
              </div>
              <button onClick={() => setShowReturnForm(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Supervisor Information Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border-l-4 border-indigo-600">
                <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {isRTL ? 'معلومات المشرف' : 'Supervisor Information'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'التاريخ' : 'Date'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={returnFormData.return_date}
                      onChange={(e) => setReturnFormData({...returnFormData, return_date: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'اسم المشرف المستلم' : 'Receiving Supervisor Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={returnFormData.return_supervisor_name}
                      onChange={(e) => setReturnFormData({...returnFormData, return_supervisor_name: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={isRTL ? 'أدخل اسم المشرف' : 'Enter supervisor name'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'رقم الجوال' : 'Mobile Number'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={returnFormData.return_supervisor_phone}
                      onChange={(e) => setReturnFormData({...returnFormData, return_supervisor_phone: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={isRTL ? 'أدخل رقم الجوال' : 'Enter mobile number'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'اسم الموظف الذي أعاد المعدات' : 'Employee Who Returned Equipment'}
                    </label>
                    <input
                      type="text"
                      value={returnFormData.returned_by_employee}
                      onChange={(e) => setReturnFormData({...returnFormData, returned_by_employee: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={isRTL ? 'أدخل اسم الموظف' : 'Enter employee name'}
                    />
                  </div>
                </div>
              </div>

              {/* Shooting Details Section */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border-l-4 border-blue-600">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {isRTL ? 'تفاصيل التصوير' : 'Shooting Details'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{isRTL ? 'اسم العميل أو المشروع:' : 'Client or Project Name:'}</span> {selectedRequest.client_entity_name || selectedRequest.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{isRTL ? 'موقع التصوير:' : 'Shooting Location:'}</span> {selectedRequest.shoot_location || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{isRTL ? 'تاريخ الخروج:' : 'Exit Date:'}</span> {selectedRequest.exit_duration_from ? new Date(selectedRequest.exit_duration_from).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{isRTL ? 'تاريخ العودة:' : 'Return Date:'}</span> {returnFormData.return_date}
                    </p>
                  </div>
                </div>
              </div>

              {/* Equipment Returned Section */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border-l-4 border-orange-600">
                <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {isRTL ? 'المعدات المُعادة' : 'Equipment Returned'}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300 rounded-lg">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? '#' : '#'}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'اسم المعدة' : 'Equipment Name'}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'الكمية المطلوبة' : 'Qty Requested'}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'الكمية المُعادة' : 'Qty Returned'}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'الحالة عند العودة' : 'Condition on Return'}</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 border-b">{isRTL ? 'ملاحظات' : 'Notes'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-orange-50">
                          <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {item.inventory_item?.name || 'N/A'}
                            {item.serial_number && <div className="text-xs text-gray-500">SN: {item.serial_number}</div>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.quantity_requested}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity_requested}
                              value={returnFormData.items[index]?.quantity_returned || item.quantity_requested}
                              onChange={(e) => handleReturnItemChange(index, 'quantity_returned', parseInt(e.target.value))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={returnFormData.items[index]?.condition_after_return || 'excellent'}
                              onChange={(e) => handleReturnItemChange(index, 'condition_after_return', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="excellent">{isRTL ? 'ممتازة' : 'Excellent'}</option>
                              <option value="good">{isRTL ? 'جيدة' : 'Good'}</option>
                              <option value="needs_cleaning">{isRTL ? 'تحتاج تنظيف' : 'Needs Cleaning'}</option>
                              <option value="needs_maintenance">{isRTL ? 'تحتاج صيانة' : 'Needs Maintenance'}</option>
                              <option value="damaged">{isRTL ? 'تالفة' : 'Damaged'}</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={returnFormData.items[index]?.return_notes || ''}
                              onChange={(e) => handleReturnItemChange(index, 'return_notes', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                              placeholder={isRTL ? 'ملاحظات' : 'Notes'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Equipment Condition Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-l-4 border-green-600">
                <h3 className="text-lg font-bold text-green-900 mb-4">
                  {isRTL ? 'حالة المعدات عند الاستلام' : 'Equipment Condition on Receipt'}
                </h3>

                <div className="space-y-2">
                  <p className="text-sm text-gray-700 mb-3">{isRTL ? 'يرجى تحديد حالة المعدات بعد الفحص:' : 'Please specify equipment condition after inspection:'}</p>
                  {[
                    { value: 'excellent', label: isRTL ? 'ممتازة' : 'Excellent' },
                    { value: 'needs_cleaning', label: isRTL ? 'تحتاج تنظيف' : 'Needs Cleaning' },
                    { value: 'needs_maintenance', label: isRTL ? 'تحتاج صيانة' : 'Needs Maintenance' },
                    { value: 'damaged_or_lost', label: isRTL ? 'تم الإبلاغ عن فقد أو ضرر (يُوضح في الملاحظات أدناه)' : 'Reported Loss or Damage (specify in notes below)' },
                  ].map((condition) => (
                    <label key={condition.value} className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                      <input
                        type="radio"
                        name="equipment_condition"
                        value={condition.value}
                        checked={returnFormData.equipment_condition_on_return === condition.value}
                        onChange={(e) => setReturnFormData({...returnFormData, equipment_condition_on_return: e.target.value as any})}
                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{condition.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Supervisor Notes Section */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg border-l-4 border-gray-600">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {isRTL ? 'ملاحظات المشرف' : 'Supervisor Notes'}
                </h3>
                <textarea
                  value={returnFormData.supervisor_notes}
                  onChange={(e) => setReturnFormData({...returnFormData, supervisor_notes: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  rows={4}
                  placeholder={isRTL ? 'أدخل أي ملاحظات حول حالة المعدات أو مشاكل تم اكتشافها...' : 'Enter any notes about equipment condition or issues found...'}
                />
              </div>

              {/* Signatures Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-l-4 border-blue-600">
                <h3 className="text-lg font-bold text-blue-900 mb-4">
                  {isRTL ? '✅ توقيعات الاستلام' : '✅ Receipt Signatures'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {isRTL ? 'اسم الموظف الذي أعاد المعدات:' : 'Employee Who Returned Equipment:'}
                    </p>
                    <p className="text-base text-gray-900">{returnFormData.returned_by_employee || selectedRequest.employee_name}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {isRTL ? 'اسم المشرف المستلم:' : 'Receiving Supervisor:'}
                    </p>
                    <p className="text-base text-gray-900">{returnFormData.return_supervisor_name || '_______________'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleSubmitReturn}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {isRTL ? 'إرسال نموذج الاستلام' : 'Submit Return Form'}
                </button>
                <button
                  onClick={() => setShowReturnForm(false)}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Views */}
      {showPrintView && selectedRequest && (
        <InventoryRequestPrintView
          request={selectedRequest}
          language={language}
          t={t}
          onClose={() => {
            setShowPrintView(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {showReturnReceiptPrintView && selectedRequest && (
        <ReturnReceiptPrintView
          request={selectedRequest}
          language={language}
          t={t}
          onClose={() => {
            setShowReturnReceiptPrintView(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
};

export default InventoryRequestManagement;
