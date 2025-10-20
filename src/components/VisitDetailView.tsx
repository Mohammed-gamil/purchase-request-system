import React from 'react';
import { X, Calendar, MapPin, User, Phone, Building, Package, DollarSign, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Visit } from '../types/visits';

interface VisitDetailViewProps {
  visit: Visit;
  language: 'en' | 'ar';
  t: (key: string) => string;
  onClose: () => void;
  currentUser?: {
    id: string | number;
    apiRole?: string;
  };
  onStatusUpdate?: (visitId: number, newStatus: string, notes?: string) => Promise<void>;
  onAddNotes?: (visitId: number, notes: string, isAdmin: boolean) => Promise<void>;
}

const VisitDetailView: React.FC<VisitDetailViewProps> = ({ visit, language, t, onClose, currentUser, onStatusUpdate, onAddNotes }) => {
  const [showStatusUpdate, setShowStatusUpdate] = React.useState(false);
  const [showAddNotes, setShowAddNotes] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState<string>(visit.status);
  const [statusNotes, setStatusNotes] = React.useState('');
  const [newNotes, setNewNotes] = React.useState('');
  const [updatingNotes, setUpdatingNotes] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const isRTL = language === 'ar';
  
  const isSalesRep = currentUser?.apiRole === 'SALES_REP';
  const isAdmin = currentUser?.apiRole && ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.apiRole);
  const canUpdateStatus = (isSalesRep || isAdmin) && visit.status !== 'closed_won' && visit.status !== 'closed_lost' && onStatusUpdate !== undefined;
  
  // Debug: Log to help troubleshoot
  React.useEffect(() => {
    console.log('VisitDetailView Debug:', {
      currentUserRole: currentUser?.apiRole,
      isSalesRep,
      isAdmin,
      visitStatus: visit.status,
      hasOnStatusUpdate: !!onStatusUpdate,
      canUpdateStatus
    });
  }, [currentUser, visit.status, onStatusUpdate]);
  
  const handleStatusUpdate = async () => {
    if (!onStatusUpdate || selectedStatus === visit.status) return;
    
    try {
      setUpdating(true);
      await onStatusUpdate(visit.id, selectedStatus, statusNotes);
      setShowStatusUpdate(false);
      onClose();
    } catch (error) {
      alert(t('updateFailed') || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };
  
  const handleAddNotes = async () => {
    if (!onAddNotes || !newNotes.trim()) return;
    
    try {
      setUpdatingNotes(true);
      await onAddNotes(visit.id, newNotes, isAdmin || false);
      setShowAddNotes(false);
      setNewNotes('');
      onClose();
    } catch (error) {
      alert(t('updateFailed') || 'Failed to add notes');
    } finally {
      setUpdatingNotes(false);
    }
  };
  
  const availableStatuses = [
    { value: 'draft', label: t('draft') || 'Draft' },
    { value: 'submitted', label: t('submitted') || 'Submitted' },
    { value: 'pending_review', label: t('pending_review') || 'Pending Review' },
    { value: 'action_required', label: t('action_required') || 'Action Required' },
    { value: 'approved', label: t('approved') || 'Approved' },
    { value: 'quotation_sent', label: t('quotation_sent') || 'Quotation Sent' },
    { value: 'closed_won', label: t('closed_won') || 'Closed Won' },
    { value: 'closed_lost', label: t('closed_lost') || 'Closed Lost' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'action_required': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'quotation_sent': return 'bg-purple-100 text-purple-800';
      case 'closed_won': return 'bg-green-600 text-white';
      case 'closed_lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'closed_won':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending_review':
      case 'action_required':
        return <Clock className="w-4 h-4" />;
      case 'closed_lost':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold">{isRTL ? 'تفاصيل الزيارة' : 'Visit Details'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(visit.status)}`}>
              {getStatusIcon(visit.status)}
              {visit.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>

          {/* Client Information */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-blue-900">
              <Building className="w-5 h-5" />
              {isRTL ? 'معلومات العميل' : 'Client Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-semibold text-gray-700">{isRTL ? 'اسم المحل:' : 'Store Name:'}</span>
                <p className="text-gray-900">{visit.client?.store_name || 'N/A'}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">{isRTL ? 'الشخص المسؤول:' : 'Contact Person:'}</span>
                <p className="text-gray-900">{visit.client?.contact_person || 'N/A'}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-700">{isRTL ? 'رقم الجوال:' : 'Mobile:'}</span>
                <p className="text-gray-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  {visit.client?.mobile || 'N/A'}
                </p>
              </div>
              {visit.client?.business_type && (
                <div>
                  <span className="font-semibold text-gray-700">{isRTL ? 'نوع النشاط:' : 'Business Type:'}</span>
                  <p className="text-gray-900">
                    {isRTL ? visit.client.business_type.name_ar : visit.client.business_type.name_en}
                  </p>
                </div>
              )}
              {visit.client?.address && (
                <div className="md:col-span-2">
                  <span className="font-semibold text-gray-700">{isRTL ? 'العنوان:' : 'Address:'}</span>
                  <p className="text-gray-900 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                    {visit.client.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Visit Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Visit Date */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-700">{isRTL ? 'تاريخ الزيارة' : 'Visit Date'}</span>
              </div>
              <p className="text-gray-900">{new Date(visit.visit_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</p>
            </div>

            {/* Sales Rep */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="font-semibold text-gray-700">{isRTL ? 'مندوب المبيعات' : 'Sales Representative'}</span>
              </div>
              <p className="text-gray-900 font-medium">{visit.rep_name || 'N/A'}</p>
            </div>
          </div>

          {/* Agency & Voiceover */}
          {(visit.has_previous_agency || visit.needs_voiceover) && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="text-lg font-bold mb-3 text-purple-900">
                {isRTL ? 'معلومات إضافية' : 'Additional Information'}
              </h3>
              {visit.has_previous_agency && (
                <div className="mb-3">
                  <span className="font-semibold text-gray-700">{isRTL ? 'وكالة سابقة:' : 'Previous Agency:'}</span>
                  <p className="text-gray-900">{visit.previous_agency_name || 'Yes'}</p>
                </div>
              )}
              {visit.needs_voiceover && (
                <div>
                  <span className="font-semibold text-gray-700">{isRTL ? 'يحتاج تعليق صوتي:' : 'Needs Voiceover:'}</span>
                  <p className="text-gray-900">{visit.voiceover_language || 'Yes'}</p>
                </div>
              )}
            </div>
          )}

          {/* Shooting Goals */}
          {visit.shooting_goals && (Array.isArray(visit.shooting_goals) ? visit.shooting_goals.length > 0 : visit.shooting_goals) && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-900">{isRTL ? 'أهداف التصوير' : 'Shooting Goals'}</h3>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(visit.shooting_goals) ? visit.shooting_goals : JSON.parse(visit.shooting_goals as string)).map((goal: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {goal.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              {visit.shooting_goals_other_text && (
                <p className="mt-2 text-sm text-gray-600">{visit.shooting_goals_other_text}</p>
              )}
            </div>
          )}

          {/* Service Types */}
          {visit.service_types && (Array.isArray(visit.service_types) ? visit.service_types.length > 0 : visit.service_types) && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-900">{isRTL ? 'أنواع الخدمات' : 'Service Types'}</h3>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(visit.service_types) ? visit.service_types : JSON.parse(visit.service_types as string)).map((service: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {service.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              {visit.service_types_other_text && (
                <p className="mt-2 text-sm text-gray-600">{visit.service_types_other_text}</p>
              )}
            </div>
          )}

          {/* Product Details */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-green-900">
              <Package className="w-5 h-5" />
              {isRTL ? 'تفاصيل المنتج' : 'Product Details'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {visit.product_category && (
                <div>
                  <span className="font-semibold text-gray-700">{isRTL ? 'فئة المنتج:' : 'Product Category:'}</span>
                  <p className="text-gray-900">
                    {isRTL ? visit.product_category.name_ar : visit.product_category.name_en}
                  </p>
                </div>
              )}
              {visit.estimated_product_count && (
                <div>
                  <span className="font-semibold text-gray-700">{isRTL ? 'عدد المنتجات:' : 'Product Count:'}</span>
                  <p className="text-gray-900">{visit.estimated_product_count}</p>
                </div>
              )}
              {visit.product_description && (
                <div className="md:col-span-2">
                  <span className="font-semibold text-gray-700">{isRTL ? 'وصف المنتج:' : 'Description:'}</span>
                  <p className="text-gray-900">{visit.product_description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location & Budget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {visit.preferred_location && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-gray-700">{isRTL ? 'الموقع المفضل' : 'Preferred Location'}</span>
                </div>
                <p className="text-gray-900">{visit.preferred_location.replace(/_/g, ' ')}</p>
              </div>
            )}

            {visit.budget_range && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-gray-700">{isRTL ? 'نطاق الميزانية' : 'Budget Range'}</span>
                </div>
                <p className="text-gray-900">{visit.budget_range}</p>
              </div>
            )}
          </div>

          {/* Preferred Shoot Date */}
          {visit.preferred_shoot_date && (
            <div className="mb-6 p-4 bg-pink-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-pink-600" />
                <span className="font-semibold text-gray-700">{isRTL ? 'تاريخ التصوير المفضل' : 'Preferred Shoot Date'}</span>
              </div>
              <p className="text-gray-900">{new Date(visit.preferred_shoot_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</p>
            </div>
          )}

          {/* Notes */}
          {(visit.rep_notes || visit.admin_notes) && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                <FileText className="w-5 h-5" />
                {isRTL ? 'الملاحظات' : 'Notes'}
              </h3>
              {visit.rep_notes && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="font-semibold text-sm text-blue-900">{isRTL ? 'ملاحظات المندوب' : 'Rep Notes'}</span>
                  </div>
                  <div className="space-y-2">
                    {visit.rep_notes.split('\n\n').map((note, idx) => {
                      const match = note.match(/^\[([\d-: ]+)\]\s*([^:]+):\s*(.+)$/s);
                      if (match) {
                        const [, timestamp, username, content] = match;
                        return (
                          <div key={idx} className="bg-white p-3 rounded border-l-4 border-blue-500 shadow-sm">
                            <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
                              <span className="font-medium text-blue-700">{username}</span>
                              <span className="text-gray-500">{timestamp}</span>
                            </div>
                            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{content.trim()}</p>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="bg-white p-3 rounded border-l-4 border-blue-500 shadow-sm">
                          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {visit.admin_notes && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <span className="font-semibold text-sm text-purple-900">{isRTL ? 'ملاحظات الإدارة' : 'Admin Notes'}</span>
                  </div>
                  <div className="space-y-2">
                    {visit.admin_notes.split('\n\n').map((note, idx) => {
                      const match = note.match(/^\[([\d-: ]+)\]\s*([^:]+):\s*(.+)$/s);
                      if (match) {
                        const [, timestamp, username, content] = match;
                        return (
                          <div key={idx} className="bg-white p-3 rounded border-l-4 border-purple-500 shadow-sm">
                            <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
                              <span className="font-medium text-purple-700">{username}</span>
                              <span className="text-gray-500">{timestamp}</span>
                            </div>
                            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{content.trim()}</p>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="bg-white p-3 rounded border-l-4 border-purple-500 shadow-sm">
                          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{note}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Files */}
          {visit.files && visit.files.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-gray-900">{isRTL ? 'الملفات المرفقة' : 'Attached Files'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visit.files.map((file, index) => (
                  <a
                    key={index}
                    href={file.storage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <FileText className="w-5 h-5 text-gray-600" />
                    <span className="text-sm truncate">{file.original_filename}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>{isRTL ? 'تاريخ الإنشاء:' : 'Created:'} {new Date(visit.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}</span>
              {visit.updated_at && (
                <span>{isRTL ? 'آخر تحديث:' : 'Updated:'} {new Date(visit.updated_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Always Visible */}
        <div className="px-6 py-4 bg-gray-50 border-t flex-shrink-0">
          {!showStatusUpdate && !showAddNotes ? (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {/* Add Notes Button - Always visible for sales reps and admins */}
                {(isSalesRep || isAdmin) && onAddNotes && (
                  <button
                    onClick={() => setShowAddNotes(true)}
                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold shadow-sm"
                  >
                    <FileText className="w-5 h-5" />
                    {isRTL ? 'إضافة ملاحظات' : 'Add Notes'}
                  </button>
                )}
                
                {/* Update Status Button */}
                {canUpdateStatus ? (
                  <button
                    onClick={() => setShowStatusUpdate(true)}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold shadow-sm"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {isRTL ? 'تحديث الحالة' : 'Update Status'}
                  </button>
                ) : (
                  visit.status === 'closed_won' || visit.status === 'closed_lost' ? (
                    <span className="text-sm text-gray-500 italic">
                      {isRTL ? 'لا يمكن تحديث الزيارات المغلقة' : 'Closed visits cannot be updated'}
                    </span>
                  ) : !currentUser ? (
                    <span className="text-sm text-red-500">
                      {isRTL ? 'خطأ: لم يتم العثور على معلومات المستخدم' : 'Error: User information not found'}
                    </span>
                  ) : null
                )}
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </button>
            </div>
          ) : showAddNotes ? (
            /* Add Notes Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {isRTL ? 'الملاحظات الجديدة' : 'New Notes'}
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder={isRTL ? 'أضف ملاحظاتك هنا...' : 'Add your notes here...'}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {isSalesRep && (
                  <p className="text-xs text-gray-500 mt-1">
                    {isRTL ? 'سيتم إضافة هذه الملاحظات كملاحظات مندوب المبيعات' : 'These notes will be added as sales rep notes'}
                  </p>
                )}
                {isAdmin && (
                  <p className="text-xs text-gray-500 mt-1">
                    {isRTL ? 'سيتم إضافة هذه الملاحظات كملاحظات إدارية' : 'These notes will be added as admin notes'}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddNotes(false);
                    setNewNotes('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  disabled={updatingNotes}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleAddNotes}
                  disabled={updatingNotes || !newNotes.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingNotes ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {isRTL ? 'جاري الإضافة...' : 'Adding...'}
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      {isRTL ? 'إضافة الملاحظات' : 'Add Notes'}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {isRTL ? 'الحالة الجديدة' : 'New Status'}
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {availableStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {isRTL ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder={isRTL ? 'أضف ملاحظة حول التغيير' : 'Add a note about this change'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowStatusUpdate(false);
                    setSelectedStatus(visit.status);
                    setStatusNotes('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  disabled={updating}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating || selectedStatus === visit.status}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {isRTL ? 'جاري التحديث...' : 'Updating...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {isRTL ? 'تأكيد التحديث' : 'Confirm Update'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitDetailView;
