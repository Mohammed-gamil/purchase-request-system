import React, { useState, useEffect } from 'react';
import { Camera, Plus, Search, Filter, Download, Printer, Calendar, User, CheckCircle, XCircle, Clock, Video, X, Eye, ThumbsUp, ThumbsDown, Send, FileText } from 'lucide-react';
import { studioBookingsApi, apiClient } from '@/lib/api';
import StudioBookingPrintView from '@/components/pr/StudioBookingPrintView';

interface StudioBookingManagementProps {
  language: 'en' | 'ar';
  currentUser: {
    id: string | number;
    name: string;
    email: string;
    role: string;
    apiRole?: string;
  };
  t: (key: string) => string;
  viewMode?: 'list' | 'create' | 'edit' | 'detail';
  selectedId?: number;
  onNavigate?: (mode: 'list' | 'create' | 'edit' | 'detail', id?: number) => void;
}

interface StudioBooking {
  id: number;
  request_id: string;
  title: string;
  description: string;
  project_type: 'photography' | 'videography' | 'both' | 'product_photography' | 'podcast' | 'interview' | 'acting' | 'other';
  custom_project_type?: string;
  requester_id: number;
  requester?: any;
  direct_manager_id?: number;
  direct_manager?: any;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours?: number;
  time_preference?: 'morning' | 'evening' | 'flexible';
  equipment_needed?: string[];
  additional_services?: string[];
  crew_size?: number;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  business_name?: string;
  business_type?: string;
  client_agreed?: boolean;
  agreement_date?: string;
  special_notes?: string;
  status: 'draft' | 'submitted' | 'dm_approved' | 'dm_rejected' | 'final_approved' | 'final_rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

const StudioBookingManagement: React.FC<StudioBookingManagementProps> = ({
  language,
  currentUser,
  t,
  viewMode: propViewMode = 'list',
  selectedId,
  onNavigate
}) => {
  const viewMode: 'list' | 'create' | 'edit' | 'detail' = propViewMode;
  const [bookings, setBookings] = useState<StudioBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<StudioBooking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_type: 'photography' as 'photography' | 'videography' | 'both' | 'product_photography' | 'podcast' | 'interview' | 'acting' | 'other',
    custom_project_type: '',
    booking_date: '',
    start_time: '',
    end_time: '',
    duration_hours: 1,
    time_preference: 'flexible' as 'morning' | 'evening' | 'flexible',
    equipment_needed: [] as string[],
    additional_services: [] as string[],
    crew_size: 1,
    client_name: '',
    client_phone: '',
    client_email: '',
    business_name: '',
    business_type: '',
    client_agreed: false,
    special_notes: '',
    direct_manager_id: '',
  });
  const [managers, setManagers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const isRTL = language === 'ar';

  // Handle navigation
  const handleNavigate = (mode: 'list' | 'create' | 'edit' | 'detail', id?: number) => {
    if (onNavigate) {
      onNavigate(mode, id);
    } else {
      // Fallback to old modal behavior if no navigation handler provided
      if (mode === 'create') {
        setShowCreateForm(true);
      } else if (mode === 'list') {
        setShowCreateForm(false);
        setSelectedBooking(null);
        setShowDetailModal(false);
      } else if (mode === 'detail' && id) {
        const booking = bookings.find(b => b.id === id);
        if (booking) {
          setSelectedBooking(booking);
          setShowDetailModal(true);
        }
      }
    }
  };

  // Load selected booking when in detail/edit mode
  useEffect(() => {
    if ((viewMode === 'detail' || viewMode === 'edit') && selectedId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === selectedId);
      if (booking) {
        if (viewMode === 'detail') {
          setSelectedBooking(booking);
          setShowDetailModal(true);
        } else if (viewMode === 'edit') {
          // Handle edit mode - populate form
          setFormData({
            title: booking.title,
            description: booking.description,
            project_type: booking.project_type,
            custom_project_type: booking.custom_project_type || '',
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            duration_hours: booking.duration_hours || 1,
            time_preference: booking.time_preference || 'flexible',
            equipment_needed: booking.equipment_needed || [],
            additional_services: booking.additional_services || [],
            crew_size: booking.crew_size || 1,
            client_name: booking.client_name || '',
            client_phone: booking.client_phone || '',
            client_email: booking.client_email || '',
            business_name: booking.business_name || '',
            business_type: booking.business_type || '',
            client_agreed: booking.client_agreed || false,
            special_notes: booking.special_notes || '',
            direct_manager_id: booking.direct_manager_id?.toString() || '',
          });
          setShowCreateForm(true);
        }
      }
    } else if (viewMode === 'create') {
      setShowCreateForm(true);
    } else if (viewMode === 'list') {
      setShowCreateForm(false);
      setShowDetailModal(false);
      setSelectedBooking(null);
    }
  }, [viewMode, selectedId, bookings]);

  useEffect(() => {
    loadBookings();
    loadManagers();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await studioBookingsApi.getAll();
      setBookings(data);
    } catch (error) {
      console.error('Failed to load studio bookings:', error);
    } finally {
      setLoading(false);
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

  const handleCreateBooking = () => {
    setFormData({
      title: '',
      description: '',
      project_type: 'photography',
      custom_project_type: '',
      booking_date: '',
      start_time: '',
      end_time: '',
      duration_hours: 1,
      time_preference: 'flexible',
      equipment_needed: [],
      additional_services: [],
      crew_size: 1,
      client_name: '',
      client_phone: '',
      client_email: '',
      business_name: '',
      business_type: '',
      client_agreed: false,
      special_notes: '',
      direct_manager_id: '',
    });
    handleNavigate('create');
  };

  const handleSubmitForm = async (isDraft: boolean) => {
    if (!formData.title || !formData.booking_date || !formData.start_time || !formData.end_time || 
        !formData.client_name || !formData.client_phone || !formData.direct_manager_id) {
      alert(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    if (!isDraft && !formData.client_agreed) {
      alert(isRTL ? 'يجب الموافقة على الشروط والأحكام' : 'You must agree to the terms and conditions');
      return;
    }

    if (formData.project_type === 'other' && !formData.custom_project_type) {
      alert(isRTL ? 'يرجى تحديد نوع التصوير المخصص' : 'Please specify custom project type');
      return;
    }

    setSubmitting(true);
    try {
      const newBooking = await studioBookingsApi.create(formData);
      
      if (!isDraft) {
        await studioBookingsApi.submit(newBooking.id);
      }
      
      await loadBookings();
      handleNavigate('list');
      alert(isRTL ? 'تم إنشاء الحجز بنجاح' : 'Booking created successfully');
    } catch (error: any) {
      console.error('Failed to create booking:', error);
      alert(error?.response?.data?.error?.message || (isRTL ? 'فشل في إنشاء الحجز' : 'Failed to create booking'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintBooking = (booking: StudioBooking) => {
    // Print functionality
    window.print();
  };

  const handleViewDetails = (booking: StudioBooking) => {
    handleNavigate('detail', booking.id);
  };

  const handleApprove = async (bookingId: number) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الموافقة على هذا الطلب؟' : 'Are you sure you want to approve this request?')) {
      return;
    }

    try {
      const status = currentUser.apiRole === 'DIRECT_MANAGER' ? 'dm_approved' : 'final_approved';
      await studioBookingsApi.updateStatus(bookingId, status);
      await loadBookings();
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

    if (!selectedBooking) return;

    try {
      const status = currentUser.apiRole === 'DIRECT_MANAGER' ? 'dm_rejected' : 'final_rejected';
      await studioBookingsApi.updateStatus(selectedBooking.id, status, rejectionReason);
      await loadBookings();
      handleNavigate('list');
      setShowRejectModal(false);
      setRejectionReason('');
      alert(isRTL ? 'تم الرفض بنجاح' : 'Rejected successfully');
    } catch (error: any) {
      console.error('Failed to reject:', error);
      alert(error?.response?.data?.error?.message || (isRTL ? 'فشل في الرفض' : 'Failed to reject'));
    }
  };

  const canApprove = (booking: StudioBooking) => {
    if (currentUser.apiRole === 'DIRECT_MANAGER') {
      return booking.status === 'submitted' && booking.direct_manager_id === Number(currentUser.id);
    }
    if (currentUser.apiRole === 'ADMIN') {
      return booking.status === 'dm_approved';
    }
    return false;
  };

  const canReject = (booking: StudioBooking) => {
    return canApprove(booking);
  };

  const handleDownloadPdf = async (bookingId: number) => {
    if (downloading) return;
    
    setDownloading(true);
    try {
      // Fetch the booking data for print view
      const response = await studioBookingsApi.downloadPdf(bookingId);
      if (response.success && response.data) {
        setSelectedBooking(response.data);
        setShowPrintView(true);
      }
    } catch (error: any) {
      console.error('Failed to load print view:', error);
      alert(error?.response?.data?.error?.message || (language === 'ar' ? 'فشل في تحميل بيانات الحجز' : 'Failed to load booking data'));
    } finally {
      setDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'dm_approved': return 'bg-green-100 text-green-800';
      case 'dm_rejected': return 'bg-red-100 text-red-800';
      case 'final_approved': return 'bg-green-100 text-green-800';
      case 'final_rejected': return 'bg-red-100 text-red-800';
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

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'photography':
        return <Camera className="w-4 h-4" />;
      case 'videography':
        return <Video className="w-4 h-4" />;
      case 'both':
        return (
          <div className="flex gap-1">
            <Camera className="w-4 h-4" />
            <Video className="w-4 h-4" />
          </div>
        );
      default:
        return null;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || booking.status === filterStatus;
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
            <div className="p-3 bg-indigo-600 rounded-lg">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {isRTL ? 'حجوزات الاستوديو' : 'Studio Bookings'}
              </h1>
              <p className="text-sm text-gray-600">
                {isRTL ? 'إدارة طلبات حجز الاستوديو للتصوير' : 'Manage studio booking requests for footage'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateBooking}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">{isRTL ? 'حجز جديد' : 'New Booking'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{isRTL ? 'إجمالي الحجوزات' : 'Total Bookings'}</p>
              <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Camera className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{isRTL ? 'قيد الانتظار' : 'Pending'}</p>
              <p className="text-2xl font-bold text-blue-600">
                {bookings.filter(b => b.status === 'submitted').length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{isRTL ? 'موافق عليها' : 'Approved'}</p>
              <p className="text-2xl font-bold text-green-600">
                {bookings.filter(b => b.status === 'final_approved').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{isRTL ? 'مرفوضة' : 'Rejected'}</p>
              <p className="text-2xl font-bold text-red-600">
                {bookings.filter(b => b.status === 'dm_rejected' || b.status === 'final_rejected').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRTL ? 'بحث في الحجوزات...' : 'Search bookings...'}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">{isRTL ? 'كل الحالات' : 'All Status'}</option>
              <option value="draft">{isRTL ? 'مسودة' : 'Draft'}</option>
              <option value="submitted">{isRTL ? 'مقدم' : 'Submitted'}</option>
              <option value="dm_approved">{isRTL ? 'موافقة المدير المباشر' : 'DM Approved'}</option>
              <option value="final_approved">{isRTL ? 'موافقة نهائية' : 'Final Approved'}</option>
              <option value="dm_rejected">{isRTL ? 'مرفوض' : 'Rejected'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isRTL ? 'لا توجد حجوزات' : 'No Bookings'}
          </h3>
          <p className="text-gray-600 mb-6">
            {isRTL ? 'ابدأ بإنشاء حجز استوديو جديد' : 'Start by creating a new studio booking'}
          </p>
          <button
            onClick={handleCreateBooking}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {isRTL ? 'حجز جديد' : 'New Booking'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getProjectTypeIcon(booking.project_type)}
                    <h3 className="font-semibold text-gray-900">{booking.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500">{booking.request_id}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                  {getStatusIcon(booking.status)}
                  {booking.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              {booking.client_name && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">{isRTL ? 'العميل: ' : 'Client: '}</span>
                  {booking.client_name}
                </p>
              )}
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{booking.description}</p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(booking.booking_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {booking.start_time} - {booking.end_time}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewDetails(booking)}
                  className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold flex items-center justify-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  {isRTL ? 'عرض' : 'View'}
                </button>
                <button
                  onClick={() => handleDownloadPdf(booking.id)}
                  disabled={downloading}
                  className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isRTL ? 'تحميل PDF' : 'Download PDF'}
                >
                  <Download className="w-4 h-4" />
                </button>
                {canApprove(booking) && (
                  <button
                    onClick={() => handleApprove(booking.id)}
                    className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-semibold"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                )}
                {canReject(booking) && (
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowRejectModal(true);
                    }}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold"
                  >
                    <ThumbsDown className="w-4 h-4" />
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
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="bg-gray-50 min-h-screen w-full overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="w-full">
            <div className="sticky top-0 bg-white border-b px-4 md:px-6 py-4 flex justify-between items-center shadow-sm z-10">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-indigo-900">
                  {isRTL ? 'نموذج طلب تصوير في مقر أكشن جروب' : 'Studio Booking Request Form'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isRTL ? 'Action Group Studio' : 'Action Group Studio'}
                </p>
              </div>
              <button onClick={() => handleNavigate('list')} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-6">
              {/* General Information Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 md:p-6 rounded-lg border-l-4 border-indigo-600 shadow-sm">
                <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {isRTL ? 'المعلومات العامة' : 'General Information'}
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'اسم العميل' : 'Client Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={isRTL ? 'أدخل اسم العميل' : 'Enter client name'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'رقم الجوال' : 'Phone Number'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={isRTL ? 'أدخل رقم الجوال' : 'Enter phone number'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'البريد الإلكتروني' : 'Email'}
                    </label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={isRTL ? 'أدخل البريد الإلكتروني' : 'Enter email'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'اسم المنشأة / الجهة' : 'Business Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder={isRTL ? 'أدخل اسم المنشأة' : 'Enter business name'}
                    />
                  </div>

                  <div className="lg:col-span-2 xl:col-span-3">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'نوع النشاط' : 'Business Type'}
                    </label>
                    <input
                      type="text"
                      value={formData.business_type}
                      onChange={(e) => setFormData({...formData, business_type: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      placeholder={isRTL ? 'مثلاً: تجميل - مجوهرات - مطاعم - شركات - أفراد' : 'e.g., Beauty - Jewelry - Restaurants - Companies - Individuals'}
                    />
                  </div>
                </div>
              </div>

              {/* Shooting Details Section */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 md:p-6 rounded-lg border-l-4 border-purple-600 shadow-sm">
                <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {isRTL ? 'تفاصيل التصوير' : 'Shooting Details'}
                </h3>

                <div className="space-y-4 md:space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'العنوان' : 'Title'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={isRTL ? 'أدخل عنوان المشروع' : 'Enter project title'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'الوصف' : 'Description'}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      rows={2}
                      placeholder={isRTL ? 'وصف المشروع' : 'Project description'}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        {isRTL ? 'نوع التصوير المطلوب' : 'Project Type'} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.project_type}
                        onChange={(e) => setFormData({...formData, project_type: e.target.value as any})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      >
                        <option value="videography">{isRTL ? 'تصوير فيديو إعلاني' : 'Commercial Video'}</option>
                        <option value="product_photography">{isRTL ? 'تصوير منتجات' : 'Product Photography'}</option>
                        <option value="podcast">{isRTL ? 'تصوير بودكاست' : 'Podcast Recording'}</option>
                        <option value="interview">{isRTL ? 'تصوير مقابلة' : 'Interview Recording'}</option>
                        <option value="acting">{isRTL ? 'تصوير مشهد تمثيلي' : 'Acting Scene'}</option>
                        <option value="photography">{isRTL ? 'تصوير فوتوغرافي' : 'Photography'}</option>
                        <option value="both">{isRTL ? 'فوتوغرافي وفيديو' : 'Photo & Video'}</option>
                        <option value="other">{isRTL ? 'أخرى' : 'Other'}</option>
                      </select>
                    </div>

                    {formData.project_type === 'other' && (
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">
                          {isRTL ? 'حدد النوع' : 'Specify Type'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.custom_project_type}
                          onChange={(e) => setFormData({...formData, custom_project_type: e.target.value})}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder={isRTL ? 'أدخل نوع التصوير' : 'Enter custom type'}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        {isRTL ? 'مدة التصوير (ساعات)' : 'Duration (hours)'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        value={formData.duration_hours}
                        onChange={(e) => setFormData({...formData, duration_hours: parseFloat(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">
                        {isRTL ? 'عدد الأشخاص المشاركين' : 'Crew Size'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.crew_size}
                        onChange={(e) => setFormData({...formData, crew_size: parseInt(e.target.value)})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-700">
                      {isRTL ? 'هل تحتاج إلى تجهيزات إضافية؟' : 'Additional Services Needed?'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: 'special_lighting', label: isRTL ? 'إضاءة خاصة' : 'Special Lighting' },
                        { value: 'makeup', label: isRTL ? 'مكياج' : 'Makeup' },
                        { value: 'decoration', label: isRTL ? 'ديكور' : 'Decoration' },
                        { value: 'catering', label: isRTL ? 'خدمات ضيافة' : 'Catering' },
                      ].map((service) => (
                        <label key={service.value} className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.additional_services.includes(service.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  additional_services: [...formData.additional_services, service.value]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  additional_services: formData.additional_services.filter(s => s !== service.value)
                                });
                              }
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">{service.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scheduling Section */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 md:p-6 rounded-lg border-l-4 border-blue-600 shadow-sm">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {isRTL ? 'الجدولة' : 'Scheduling'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'التاريخ المقترح للتصوير' : 'Booking Date'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.booking_date}
                      onChange={(e) => setFormData({...formData, booking_date: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'وقت البدء' : 'Start Time'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'وقت الانتهاء' : 'End Time'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'الوقت المقترح' : 'Time Preference'}
                    </label>
                    <select
                      value={formData.time_preference}
                      onChange={(e) => setFormData({...formData, time_preference: e.target.value as any})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="morning">{isRTL ? 'صباحًا' : 'Morning'}</option>
                      <option value="evening">{isRTL ? 'مساءً' : 'Evening'}</option>
                      <option value="flexible">{isRTL ? 'مرن' : 'Flexible'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      {isRTL ? 'المدير المباشر' : 'Direct Manager'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.direct_manager_id}
                      onChange={(e) => setFormData({...formData, direct_manager_id: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">{isRTL ? 'اختر المدير' : 'Select Manager'}</option>
                      {managers.map(manager => (
                        <option key={manager.id} value={manager.id}>{manager.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg border-l-4 border-gray-600">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {isRTL ? 'ملاحظات' : 'Notes'}
                </h3>
                <textarea
                  value={formData.special_notes}
                  onChange={(e) => setFormData({...formData, special_notes: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  rows={3}
                  placeholder={isRTL ? 'ملاحظات إضافية أو طلبات خاصة...' : 'Additional notes or special requests...'}
                />
              </div>

              {/* Client Agreement Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-l-4 border-green-600">
                <h3 className="text-lg font-bold text-green-900 mb-4">
                  {isRTL ? 'موافقة العميل' : 'Client Agreement'}
                </h3>
                <label className="flex items-start space-x-3 space-x-reverse cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.client_agreed}
                    onChange={(e) => setFormData({...formData, client_agreed: e.target.checked})}
                    className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    {isRTL ? (
                      <>
                        أقر بأن جميع المعلومات صحيحة، وأن التصوير سيتم وفق سياسات أكشن جروب وتعليمات الفريق الفني
                        <span className="text-red-500"> *</span>
                      </>
                    ) : (
                      <>
                        I confirm all information is correct and shooting will follow Action Group policies and technical team instructions
                        <span className="text-red-500"> *</span>
                      </>
                    )}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleSubmitForm(false)}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 font-semibold shadow-lg transition-all"
                >
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
      {viewMode === 'detail' && selectedBooking && (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="w-full min-h-screen">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedBooking.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedBooking.request_id}</p>
              </div>
              <button onClick={() => handleNavigate('list')} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
              {/* Approval Flow Timeline */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  {isRTL ? 'مسار الموافقة' : 'Approval Flow'}
                </h3>
                <div className="flex items-center justify-between relative">
                  {/* Timeline Line */}
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-300" />
                  
                  {/* Step 1: Submitted */}
                  <div className="relative flex flex-col items-center z-10 bg-white px-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      ['submitted', 'dm_approved', 'dm_rejected', 'final_approved', 'final_rejected'].includes(selectedBooking.status)
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
                      selectedBooking.status === 'dm_approved' || selectedBooking.status === 'final_approved'
                        ? 'bg-green-500 text-white'
                        : selectedBooking.status === 'dm_rejected'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {selectedBooking.status === 'dm_rejected' ? (
                        <XCircle className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-xs font-semibold mt-2 text-center">
                      {isRTL ? 'المدير المباشر' : 'Direct Manager'}
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      {selectedBooking.status === 'dm_approved' ? (isRTL ? 'موافق' : 'Approved') :
                       selectedBooking.status === 'dm_rejected' ? (isRTL ? 'مرفوض' : 'Rejected') :
                       (isRTL ? 'قيد الانتظار' : 'Pending')}
                    </p>
                  </div>

                  {/* Step 3: Final Approval */}
                  <div className="relative flex flex-col items-center z-10 bg-white px-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedBooking.status === 'final_approved'
                        ? 'bg-green-500 text-white'
                        : selectedBooking.status === 'final_rejected'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {selectedBooking.status === 'final_approved' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : selectedBooking.status === 'final_rejected' ? (
                        <XCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-xs font-semibold mt-2 text-center">
                      {isRTL ? 'الموافقة النهائية' : 'Final Approval'}
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      {selectedBooking.status === 'final_approved' ? (isRTL ? 'موافق' : 'Approved') :
                       selectedBooking.status === 'final_rejected' ? (isRTL ? 'مرفوض' : 'Rejected') :
                       (isRTL ? 'قيد الانتظار' : 'Pending')}
                    </p>
                  </div>
                </div>

                {selectedBooking.rejection_reason && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 mb-1">{isRTL ? 'سبب الرفض:' : 'Rejection Reason:'}</p>
                    <p className="text-sm text-red-700">{selectedBooking.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">{isRTL ? 'معلومات العميل' : 'Client Information'}</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-semibold">{isRTL ? 'الاسم:' : 'Name:'}</span> {selectedBooking.client_name}</p>
                    {selectedBooking.client_phone && <p><span className="font-semibold">{isRTL ? 'الهاتف:' : 'Phone:'}</span> {selectedBooking.client_phone}</p>}
                    {selectedBooking.client_email && <p><span className="font-semibold">{isRTL ? 'البريد:' : 'Email:'}</span> {selectedBooking.client_email}</p>}
                    {selectedBooking.business_name && <p><span className="font-semibold">{isRTL ? 'المنشأة:' : 'Business:'}</span> {selectedBooking.business_name}</p>}
                    {selectedBooking.business_type && <p><span className="font-semibold">{isRTL ? 'نوع النشاط:' : 'Type:'}</span> {selectedBooking.business_type}</p>}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">{isRTL ? 'تفاصيل الحجز' : 'Booking Details'}</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-semibold">{isRTL ? 'التاريخ:' : 'Date:'}</span> {new Date(selectedBooking.booking_date).toLocaleDateString()}</p>
                    <p><span className="font-semibold">{isRTL ? 'الوقت:' : 'Time:'}</span> {selectedBooking.start_time} - {selectedBooking.end_time}</p>
                    {selectedBooking.duration_hours && <p><span className="font-semibold">{isRTL ? 'المدة:' : 'Duration:'}</span> {selectedBooking.duration_hours} {isRTL ? 'ساعة' : 'hours'}</p>}
                    <p><span className="font-semibold">{isRTL ? 'نوع المشروع:' : 'Type:'}</span> {selectedBooking.project_type}</p>
                    {selectedBooking.crew_size && <p><span className="font-semibold">{isRTL ? 'عدد الطاقم:' : 'Crew:'}</span> {selectedBooking.crew_size}</p>}
                  </div>
                </div>
              </div>

              {selectedBooking.description && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">{isRTL ? 'الوصف' : 'Description'}</h4>
                  <p className="text-sm text-gray-700">{selectedBooking.description}</p>
                </div>
              )}

              {selectedBooking.additional_services && selectedBooking.additional_services.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">{isRTL ? 'خدمات إضافية' : 'Additional Services'}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedBooking.additional_services.map((service, idx) => (
                      <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                        {service.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedBooking.special_notes && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-2">{isRTL ? 'ملاحظات خاصة' : 'Special Notes'}</h4>
                  <p className="text-sm text-yellow-800">{selectedBooking.special_notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              {(canApprove(selectedBooking) || canReject(selectedBooking)) && (
                <div className="flex gap-3 pt-4 border-t">
                  {canApprove(selectedBooking) && (
                    <button
                      onClick={() => handleApprove(selectedBooking.id)}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-5 h-5" />
                      {isRTL ? 'موافقة' : 'Approve'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadPdf(selectedBooking.id)}
                    disabled={downloading}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    {isRTL ? 'تحميل' : 'Download'}
                  </button>
                  {canReject(selectedBooking) && (
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <ThumbsDown className="w-5 h-5" />
                      {isRTL ? 'رفض' : 'Reject'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedBooking && (
        <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4 z-[60]" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl border border-gray-200">
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

      {/* Print View */}
      {showPrintView && selectedBooking && (
        <StudioBookingPrintView
          booking={selectedBooking}
          language={language}
          t={t}
          onClose={() => {
            setShowPrintView(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
};

export default StudioBookingManagement;
