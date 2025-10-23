import React from 'react';
import { X, Printer, Download } from 'lucide-react';

interface StudioBooking {
  id: number;
  booking_number?: string;
  request_id?: string;
  title: string;
  description?: string;
  status: string;
  project_type: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours?: number;
  time_preference?: string;
  equipment_needed?: string | string[];
  additional_services?: string | string[];
  crew_size?: number;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  business_name?: string;
  business_type?: string;
  client_agreed?: boolean;
  agreement_date?: string;
  special_notes?: string;
  requester?: {
    id: number;
    name: string;
    email: string;
  };
  directManager?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

interface StudioBookingPrintViewProps {
  booking: StudioBooking;
  language: 'en' | 'ar';
  t: (key: string) => string;
  onClose: () => void;
}

const StudioBookingPrintView: React.FC<StudioBookingPrintViewProps> = ({ booking, language, t, onClose }) => {
  const isRTL = language === 'ar';
  const contentRef = React.useRef<HTMLDivElement>(null);

  const parseJsonField = (field: string | string[] | undefined): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const bookingNumber = booking.booking_number || booking.request_id || `${booking.id}`;

  const equipment = parseJsonField(booking.equipment_needed);
  const services = parseJsonField(booking.additional_services);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = contentRef.current;
    if (!element) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Cairo', 'Tajawal', Arial, sans-serif; padding: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
        .header { background: linear-gradient(to right, #7c3aed, #6d28d9); color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
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
        .status-dm_approved { background-color: #d1fae5; color: #065f46; }
        .status-final_approved { background-color: #d1fae5; color: #065f46; }
        .status-dm_rejected { background-color: #fee2e2; color: #991b1b; }
        .status-final_rejected { background-color: #fee2e2; color: #991b1b; }
        .list-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
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
        <title>${isRTL ? 'حجز استديو' : 'Studio Booking'} - ${bookingNumber}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <h1>${isRTL ? 'حجز استديو' : 'Studio Booking'}</h1>
          <p>${isRTL ? 'رقم الحجز' : 'Booking'} #${bookingNumber} - ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</p>
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'الحالة' : 'Status'}</div>
          <span class="status-badge status-${booking.status}">
            ${booking.status.toUpperCase().replace('_', ' ')}
          </span>
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'تفاصيل الحجز' : 'Booking Details'}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${isRTL ? 'العنوان' : 'Title'}</div>
              <div class="info-value">${booking.title || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'نوع المشروع' : 'Project Type'}</div>
              <div class="info-value">${booking.project_type || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'تاريخ الحجز' : 'Booking Date'}</div>
              <div class="info-value">${new Date(booking.booking_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'الوقت' : 'Time'}</div>
              <div class="info-value">${booking.start_time} - ${booking.end_time}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'عدد الطاقم' : 'Crew Size'}</div>
              <div class="info-value">${booking.crew_size || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'المدة (ساعات)' : 'Duration (hours)'}</div>
              <div class="info-value">${booking.duration_hours || '-'}</div>
            </div>
          </div>
          ${booking.description ? `
          <div class="info-item" style="margin-top: 10px;">
            <div class="info-label">${isRTL ? 'الوصف' : 'Description'}</div>
            <div class="info-value">${booking.description}</div>
          </div>
          ` : ''}
        </div>

        ${equipment.length > 0 ? `
        <div class="section">
          <div class="section-title">${isRTL ? 'المعدات المطلوبة' : 'Equipment Needed'}</div>
          ${equipment.map(item => `<div class="list-item">${item}</div>`).join('')}
        </div>
        ` : ''}

        ${services.length > 0 ? `
        <div class="section">
          <div class="section-title">${isRTL ? 'الخدمات الإضافية' : 'Additional Services'}</div>
          ${services.map(item => `<div class="list-item">${item}</div>`).join('')}
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">${isRTL ? 'معلومات العميل' : 'Client Information'}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${isRTL ? 'اسم العميل' : 'Client Name'}</div>
              <div class="info-value">${booking.client_name || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'الهاتف' : 'Phone'}</div>
              <div class="info-value">${booking.client_phone || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'البريد الإلكتروني' : 'Email'}</div>
              <div class="info-value">${booking.client_email || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'اسم الشركة' : 'Business Name'}</div>
              <div class="info-value">${booking.business_name || '-'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'معلومات الموظفين' : 'Staff Information'}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${isRTL ? 'مقدم الطلب' : 'Requester'}</div>
              <div class="info-value">${booking.requester?.name || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'المدير المباشر' : 'Direct Manager'}</div>
              <div class="info-value">${booking.directManager?.name || '-'}</div>
            </div>
          </div>
        </div>

        ${booking.special_notes ? `
        <div class="section">
          <div class="section-title">${isRTL ? 'ملاحظات خاصة' : 'Special Notes'}</div>
          <div class="info-value">${booking.special_notes}</div>
        </div>
        ` : ''}

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'dm_approved': return 'bg-green-100 text-green-800';
      case 'final_approved': return 'bg-green-100 text-green-800';
      case 'dm_rejected': return 'bg-red-100 text-red-800';
      case 'final_rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:relative print:bg-transparent print:block">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:overflow-visible">
        {/* Header - Hidden when printing */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between no-print z-10">
          <h2 className={`text-2xl font-bold ${isRTL ? 'font-arabic' : ''}`}>
            {isRTL ? 'حجز استديو' : 'Studio Booking'} #{bookingNumber}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isRTL ? 'تحميل وطباعة' : 'Download & Print'}
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isRTL ? 'طباعة' : 'Print'}
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Print optimized */}
        <div ref={contentRef} className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Status */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{isRTL ? 'الحالة' : 'Status'}</h3>
            <span className={`inline-block px-4 py-2 rounded-full font-semibold ${getStatusColor(booking.status)}`}>
              {booking.status.toUpperCase().replace('_', ' ')}
            </span>
          </div>

          {/* Booking Details */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{isRTL ? 'تفاصيل الحجز' : 'Booking Details'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'العنوان' : 'Title'}</p>
                <p className="text-base">{booking.title || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'نوع المشروع' : 'Project Type'}</p>
                <p className="text-base">{booking.project_type || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'تاريخ الحجز' : 'Booking Date'}</p>
                <p className="text-base">{new Date(booking.booking_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'الوقت' : 'Time'}</p>
                <p className="text-base">{booking.start_time} - {booking.end_time}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'عدد الطاقم' : 'Crew Size'}</p>
                <p className="text-base">{booking.crew_size || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'المدة (ساعات)' : 'Duration (hours)'}</p>
                <p className="text-base">{booking.duration_hours || '-'}</p>
              </div>
            </div>
            {booking.description && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'الوصف' : 'Description'}</p>
                <p className="text-base">{booking.description}</p>
              </div>
            )}
          </div>

          {/* Equipment Needed */}
          {equipment.length > 0 && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{isRTL ? 'المعدات المطلوبة' : 'Equipment Needed'}</h3>
              <ul className="list-disc list-inside space-y-2">
                {equipment.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Additional Services */}
          {services.length > 0 && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">{isRTL ? 'الخدمات الإضافية' : 'Additional Services'}</h3>
              <ul className="list-disc list-inside space-y-2">
                {services.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Client Information */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{isRTL ? 'معلومات العميل' : 'Client Information'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'اسم العميل' : 'Client Name'}</p>
                <p className="text-base">{booking.client_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'الهاتف' : 'Phone'}</p>
                <p className="text-base">{booking.client_phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'البريد الإلكتروني' : 'Email'}</p>
                <p className="text-base">{booking.client_email || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'اسم الشركة' : 'Business Name'}</p>
                <p className="text-base">{booking.business_name || '-'}</p>
              </div>
            </div>
          </div>

          {/* Staff Information */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{isRTL ? 'معلومات الموظفين' : 'Staff Information'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'مقدم الطلب' : 'Requester'}</p>
                <p className="text-base">{booking.requester?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'المدير المباشر' : 'Direct Manager'}</p>
                <p className="text-base">{booking.directManager?.name || '-'}</p>
              </div>
            </div>
          </div>

          {/* Special Notes */}
          {booking.special_notes && (
            <div className="p-4 border border-gray-200 rounded-lg bg-yellow-50">
              <h3 className="text-lg font-semibold mb-2">{isRTL ? 'ملاحظات خاصة' : 'Special Notes'}</h3>
              <p className="text-base">{booking.special_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioBookingPrintView;
