import React from 'react';
import { X, Printer, Download } from 'lucide-react';

interface InventoryRequest {
  id: number;
  request_id: string;
  title: string;
  description?: string;
  status: string;
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
  warehouseManager?: {
    id: number;
    name: string;
    email: string;
  };
  employee_name?: string;
  employee_position?: string;
  employee_phone?: string;
  exit_purpose?: string;
  custom_exit_purpose?: string;
  client_entity_name?: string;
  shoot_location?: string;
  exit_duration_from?: string;
  exit_duration_to?: string;
  items: Array<{
    id?: number;
    inventory_item_id: number;
    quantity_requested: number;
    expected_return_date?: string;
    serial_number?: string;
    condition_before_exit?: string;
    inventoryItem?: {
      id: number;
      name: string;
      category?: string;
    };
  }>;
  created_at: string;
  updated_at: string;
}

interface InventoryRequestPrintViewProps {
  request: InventoryRequest;
  language: 'en' | 'ar';
  t: (key: string) => string;
  onClose: () => void;
}

const InventoryRequestPrintView: React.FC<InventoryRequestPrintViewProps> = ({ request, language, t, onClose }) => {
  const isRTL = language === 'ar';
  const contentRef = React.useRef<HTMLDivElement>(null);

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
        .status-dm_approved { background-color: #d1fae5; color: #065f46; }
        .status-final_approved { background-color: #d1fae5; color: #065f46; }
        .status-dm_rejected { background-color: #fee2e2; color: #991b1b; }
        .status-final_rejected { background-color: #fee2e2; color: #991b1b; }
        .status-returned { background-color: #e0e7ff; color: #3730a3; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: ${isRTL ? 'right' : 'left'}; }
        th { background-color: #f3f4f6; font-weight: 600; }
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
        <title>${isRTL ? 'طلب مخزون' : 'Inventory Request'} - ${request.request_id}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <h1>${isRTL ? 'طلب مخزون' : 'Inventory Request'}</h1>
          <p>${isRTL ? 'رقم الطلب' : 'Request'} #${request.request_id} - ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</p>
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'الحالة' : 'Status'}</div>
          <span class="status-badge status-${request.status}">
            ${request.status.toUpperCase().replace('_', ' ')}
          </span>
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'تفاصيل الطلب' : 'Request Details'}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${isRTL ? 'العنوان' : 'Title'}</div>
              <div class="info-value">${request.title || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'اسم الموظف' : 'Employee Name'}</div>
              <div class="info-value">${request.employee_name || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'المنصب' : 'Position'}</div>
              <div class="info-value">${request.employee_position || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'الهاتف' : 'Phone'}</div>
              <div class="info-value">${request.employee_phone || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'اسم الجهة' : 'Client Entity'}</div>
              <div class="info-value">${request.client_entity_name || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'موقع التصوير' : 'Shoot Location'}</div>
              <div class="info-value">${request.shoot_location || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'مدة الخروج من' : 'Exit From'}</div>
              <div class="info-value">${request.exit_duration_from ? new Date(request.exit_duration_from).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'مدة الخروج إلى' : 'Exit To'}</div>
              <div class="info-value">${request.exit_duration_to ? new Date(request.exit_duration_to).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}</div>
            </div>
          </div>
          ${request.description ? `
          <div class="info-item" style="margin-top: 10px;">
            <div class="info-label">${isRTL ? 'الوصف' : 'Description'}</div>
            <div class="info-value">${request.description}</div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'الأصناف المطلوبة' : 'Requested Items'}</div>
          <table>
            <thead>
              <tr>
                <th>${isRTL ? 'اسم الصنف' : 'Item Name'}</th>
                <th>${isRTL ? 'الفئة' : 'Category'}</th>
                <th>${isRTL ? 'الكمية' : 'Quantity'}</th>
                <th>${isRTL ? 'تاريخ العودة المتوقع' : 'Expected Return'}</th>
              </tr>
            </thead>
            <tbody>
              ${request.items.map(item => `
                <tr>
                  <td>${item.inventoryItem?.name || '-'}</td>
                  <td>${item.inventoryItem?.category || '-'}</td>
                  <td>${item.quantity_requested}</td>
                  <td>${item.expected_return_date ? new Date(item.expected_return_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'معلومات الموظفين' : 'Staff Information'}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${isRTL ? 'مقدم الطلب' : 'Requester'}</div>
              <div class="info-value">${request.requester?.name || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'المدير المباشر' : 'Direct Manager'}</div>
              <div class="info-value">${request.directManager?.name || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'مدير المستودع' : 'Warehouse Manager'}</div>
              <div class="info-value">${request.warehouseManager?.name || '-'}</div>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'dm_approved': return 'bg-green-100 text-green-800';
      case 'final_approved': return 'bg-green-100 text-green-800';
      case 'dm_rejected': return 'bg-red-100 text-red-800';
      case 'final_rejected': return 'bg-red-100 text-red-800';
      case 'returned': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:relative print:bg-transparent print:block">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:overflow-visible">
        {/* Header - Hidden when printing */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between no-print z-10">
          <h2 className={`text-2xl font-bold ${isRTL ? 'font-arabic' : ''}`}>
            {isRTL ? 'طلب مخزون' : 'Inventory Request'} #{request.request_id}
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
            <span className={`inline-block px-4 py-2 rounded-full font-semibold ${getStatusColor(request.status)}`}>
              {request.status.toUpperCase().replace('_', ' ')}
            </span>
          </div>

          {/* Request Details */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{isRTL ? 'تفاصيل الطلب' : 'Request Details'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'العنوان' : 'Title'}</p>
                <p className="text-base">{request.title || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'اسم الموظف' : 'Employee Name'}</p>
                <p className="text-base">{request.employee_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'المنصب' : 'Position'}</p>
                <p className="text-base">{request.employee_position || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'الهاتف' : 'Phone'}</p>
                <p className="text-base">{request.employee_phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'اسم الجهة' : 'Client Entity'}</p>
                <p className="text-base">{request.client_entity_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'موقع التصوير' : 'Shoot Location'}</p>
                <p className="text-base">{request.shoot_location || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'مدة الخروج من' : 'Exit From'}</p>
                <p className="text-base">
                  {request.exit_duration_from ? new Date(request.exit_duration_from).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'مدة الخروج إلى' : 'Exit To'}</p>
                <p className="text-base">
                  {request.exit_duration_to ? new Date(request.exit_duration_to).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}
                </p>
              </div>
            </div>
            {request.description && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'الوصف' : 'Description'}</p>
                <p className="text-base">{request.description}</p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">{isRTL ? 'الأصناف المطلوبة' : 'Requested Items'}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-3 text-left font-semibold">{isRTL ? 'اسم الصنف' : 'Item Name'}</th>
                    <th className="p-3 text-left font-semibold">{isRTL ? 'الفئة' : 'Category'}</th>
                    <th className="p-3 text-left font-semibold">{isRTL ? 'الكمية' : 'Quantity'}</th>
                    <th className="p-3 text-left font-semibold">{isRTL ? 'تاريخ العودة المتوقع' : 'Expected Return'}</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((item, index) => (
                    <tr key={item.id || index} className="border-b hover:bg-gray-50">
                      <td className="p-3">{item.inventoryItem?.name || '-'}</td>
                      <td className="p-3">{item.inventoryItem?.category || '-'}</td>
                      <td className="p-3">{item.quantity_requested}</td>
                      <td className="p-3">
                        {item.expected_return_date ? new Date(item.expected_return_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staff Information */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">{isRTL ? 'معلومات الموظفين' : 'Staff Information'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'مقدم الطلب' : 'Requester'}</p>
                <p className="text-base">{request.requester?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'المدير المباشر' : 'Direct Manager'}</p>
                <p className="text-base">{request.directManager?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'مدير المستودع' : 'Warehouse Manager'}</p>
                <p className="text-base">{request.warehouseManager?.name || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryRequestPrintView;
