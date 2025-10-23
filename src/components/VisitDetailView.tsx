import React from 'react';
import { X, Calendar, MapPin, User, Phone, Building, Package, DollarSign, FileText, CheckCircle, Clock, XCircle, Download, Printer } from 'lucide-react';
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
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  const isSalesRep = currentUser?.apiRole === 'SALES_REP';
  const isAdmin = currentUser?.apiRole && ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.apiRole);
  const canUpdateStatus = (isSalesRep || isAdmin) && onStatusUpdate !== undefined;
  
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = contentRef.current;
    if (!element) return;

    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Cairo', 'Tajawal', Arial, sans-serif; padding: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
        .header { background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
        .header h1 { font-size: 24px; font-weight: bold; }
        .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1f2937; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .info-item { padding: 10px; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; margin-bottom: 5px; }
        .info-value { color: #111827; font-size: 15px; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
        .status-draft { background-color: #f3f4f6; color: #374151; }
        .status-submitted { background-color: #dbeafe; color: #1e40af; }
        .status-completed { background-color: #d1fae5; color: #065f46; }
        @media print {
          body { padding: 10px; }
          .no-print { display: none !important; }
        }
      </style>
    `;

    const content = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${isRTL ? 'تفاصيل الزيارة' : 'Visit Details'} - ${visit.client?.store_name || ''}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <h1>${isRTL ? 'تفاصيل الزيارة' : 'Visit Details'}</h1>
          <p>${isRTL ? 'رقم الزيارة' : 'Visit'} #${visit.id} - ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</p>
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'الحالة' : 'Status'}</div>
          <span class="status-badge status-${visit.status}">
            ${visit.status.toUpperCase()}
          </span>
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'معلومات العميل' : 'Client Information'}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${isRTL ? 'اسم المتجر' : 'Store Name'}</div>
              <div class="info-value">${visit.client?.store_name || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'جهة الاتصال' : 'Contact Person'}</div>
              <div class="info-value">${visit.client?.contact_person || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'رقم الهاتف' : 'Mobile'}</div>
              <div class="info-value">${visit.client?.mobile || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'البريد الإلكتروني' : 'Email'}</div>
              <div class="info-value">${visit.client?.email || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'العنوان' : 'Address'}</div>
              <div class="info-value">${visit.client?.address || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'نوع النشاط' : 'Business Type'}</div>
              <div class="info-value">${visit.client?.business_type ? (isRTL ? visit.client.business_type.name_ar : visit.client.business_type.name_en) : '-'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'تفاصيل الزيارة' : 'Visit Details'}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${isRTL ? 'تاريخ الزيارة' : 'Visit Date'}</div>
              <div class="info-value">${new Date(visit.visit_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'نوع الزيارة' : 'Visit Type'}</div>
              <div class="info-value">${visit.visit_type || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'نتيجة الزيارة' : 'Visit Result'}</div>
              <div class="info-value">${visit.visit_result || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'سبب الزيارة' : 'Visit Reason'}</div>
              <div class="info-value">${visit.visit_reason || '-'}</div>
            </div>
            ${visit.follow_up_date ? `
            <div class="info-item">
              <div class="info-label">${isRTL ? 'تاريخ المتابعة' : 'Follow-up Date'}</div>
              <div class="info-value">${new Date(visit.follow_up_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
            </div>
            ` : ''}
            ${visit.location_lat && visit.location_lng ? `
            <div class="info-item">
              <div class="info-label">${isRTL ? 'الموقع الجغرافي' : 'GPS Location'}</div>
              <div class="info-value">${visit.location_lat}, ${visit.location_lng}</div>
            </div>
            ` : ''}
          </div>
        </div>

        ${visit.rep_notes ? `
        <div class="section">
          <div class="section-title">${isRTL ? 'ملاحظات المندوب' : 'Sales Rep Notes'}</div>
          <div class="info-value">${visit.rep_notes}</div>
        </div>
        ` : ''}

        ${visit.admin_notes ? `
        <div class="section">
          <div class="section-title">${isRTL ? 'ملاحظات الإدارة' : 'Admin Notes'}</div>
          <div class="info-value">${visit.admin_notes}</div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">${isRTL ? 'معلومات المندوب' : 'Sales Representative'}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${isRTL ? 'الاسم' : 'Name'}</div>
              <div class="info-value">${visit.rep?.name || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'البريد الإلكتروني' : 'Email'}</div>
              <div class="info-value">${visit.rep?.email || '-'}</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };
  
  const availableStatuses = [
    { value: 'draft', label: t('draft') || 'Draft' },
    { value: 'submitted', label: t('submitted') || 'Submitted' },
    { value: 'completed', label: isRTL ? 'مكتملة' : 'Completed' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
          <h2 className="text-xl font-bold">{isRTL ? 'تفاصيل الزيارة' : 'Visit Details'}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              title={isRTL ? 'تحميل وطباعة' : 'Download & Print'}
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline text-sm">{isRTL ? 'طباعة' : 'Print'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="max-w-7xl mx-auto w-full p-6">
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

          {/* Visit Details */}
          {(visit.visit_type || visit.visit_result || visit.visit_reason) && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="text-lg font-bold mb-3 text-purple-900">
                {isRTL ? 'تفاصيل الزيارة' : 'Visit Details'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {visit.visit_type && (
                  <div>
                    <span className="font-semibold text-gray-700">{isRTL ? 'نوع الزيارة:' : 'Visit Type:'}</span>
                    <p className="text-gray-900 capitalize">{visit.visit_type.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {visit.visit_result && (
                  <div>
                    <span className="font-semibold text-gray-700">{isRTL ? 'نتيجة الزيارة:' : 'Visit Result:'}</span>
                    <p className="text-gray-900 capitalize">{visit.visit_result.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {visit.visit_reason && (
                  <div className="md:col-span-2">
                    <span className="font-semibold text-gray-700">{isRTL ? 'سبب الزيارة:' : 'Visit Reason:'}</span>
                    <p className="text-gray-900 capitalize">{visit.visit_reason.replace(/_/g, ' ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location & Follow-up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {(visit.location_lat && visit.location_lng) && (
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-gray-700">{isRTL ? 'الموقع الجغرافي' : 'GPS Location'}</span>
                </div>
                <p className="text-gray-900 text-sm">{visit.location_lat}, {visit.location_lng}</p>
                <a 
                  href={`https://www.google.com/maps?q=${visit.location_lat},${visit.location_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm mt-1 inline-block"
                >
                  {isRTL ? 'عرض على الخريطة' : 'View on Map'}
                </a>
              </div>
            )}

            {visit.follow_up_date && (
              <div className="p-4 bg-pink-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-pink-600" />
                  <span className="font-semibold text-gray-700">{isRTL ? 'تاريخ المتابعة' : 'Follow-up Date'}</span>
                </div>
                <p className="text-gray-900">{new Date(visit.follow_up_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</p>
              </div>
            )}
          </div>

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
                ) : !currentUser ? (
                  <span className="text-sm text-red-500">
                    {isRTL ? 'خطأ: لم يتم العثور على معلومات المستخدم' : 'Error: User information not found'}
                  </span>
                ) : null}
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
