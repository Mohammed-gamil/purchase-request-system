import React from 'react';
import { X, Printer, Download } from 'lucide-react';

interface InventoryRequest {
  id: number;
  request_id: string;
  title: string;
  return_date?: string;
  return_supervisor_name?: string;
  return_supervisor_phone?: string;
  equipment_condition_on_return?: string;
  supervisor_notes?: string;
  returned_by_employee?: string;
  requester?: {
    id: number;
    name: string;
    email: string;
  };
  items: Array<{
    id?: number;
    quantity_requested: number;
    quantity_returned?: number;
    condition_after_return?: string;
    return_notes?: string;
    inventoryItem?: {
      id: number;
      name: string;
      category?: string;
    };
  }>;
}

interface ReturnReceiptPrintViewProps {
  request: InventoryRequest;
  language: 'en' | 'ar';
  t: (key: string) => string;
  onClose: () => void;
}

const ReturnReceiptPrintView: React.FC<ReturnReceiptPrintViewProps> = ({ request, language, t, onClose }) => {
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
        .header { background: linear-gradient(to right, #059669, #047857); color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
        .header h1 { font-size: 24px; font-weight: bold; }
        .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1f2937; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .info-item { padding: 10px; }
        .info-label { font-weight: 600; color: #6b7280; font-size: 14px; margin-bottom: 5px; }
        .info-value { color: #111827; font-size: 15px; }
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
        <title>${isRTL ? 'إيصال إرجاع' : 'Return Receipt'} - ${request.request_id}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <h1>${isRTL ? 'إيصال إرجاع المعدات' : 'Equipment Return Receipt'}</h1>
          <p>${isRTL ? 'رقم الطلب' : 'Request'} #${request.request_id} - ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</p>
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'معلومات الإرجاع' : 'Return Information'}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${isRTL ? 'تاريخ الإرجاع' : 'Return Date'}</div>
              <div class="info-value">${request.return_date ? new Date(request.return_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'اسم المشرف' : 'Supervisor Name'}</div>
              <div class="info-value">${request.return_supervisor_name || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'هاتف المشرف' : 'Supervisor Phone'}</div>
              <div class="info-value">${request.return_supervisor_phone || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${isRTL ? 'أعاد بواسطة' : 'Returned By'}</div>
              <div class="info-value">${request.returned_by_employee || '-'}</div>
            </div>
          </div>
          ${request.equipment_condition_on_return ? `
          <div class="info-item" style="margin-top: 10px;">
            <div class="info-label">${isRTL ? 'حالة المعدات عند الإرجاع' : 'Equipment Condition on Return'}</div>
            <div class="info-value">${request.equipment_condition_on_return}</div>
          </div>
          ` : ''}
          ${request.supervisor_notes ? `
          <div class="info-item" style="margin-top: 10px;">
            <div class="info-label">${isRTL ? 'ملاحظات المشرف' : 'Supervisor Notes'}</div>
            <div class="info-value">${request.supervisor_notes}</div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">${isRTL ? 'الأصناف المرتجعة' : 'Returned Items'}</div>
          <table>
            <thead>
              <tr>
                <th>${isRTL ? 'اسم الصنف' : 'Item Name'}</th>
                <th>${isRTL ? 'الفئة' : 'Category'}</th>
                <th>${isRTL ? 'المطلوب' : 'Requested'}</th>
                <th>${isRTL ? 'المرتجع' : 'Returned'}</th>
                <th>${isRTL ? 'الحالة' : 'Condition'}</th>
              </tr>
            </thead>
            <tbody>
              ${request.items.map(item => `
                <tr>
                  <td>${item.inventoryItem?.name || '-'}</td>
                  <td>${item.inventoryItem?.category || '-'}</td>
                  <td>${item.quantity_requested}</td>
                  <td>${item.quantity_returned || 0}</td>
                  <td>${item.condition_after_return || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:relative print:bg-transparent print:block">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:overflow-visible">
        {/* Header - Hidden when printing */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between no-print z-10">
          <h2 className={`text-2xl font-bold ${isRTL ? 'font-arabic' : ''}`}>
            {isRTL ? 'إيصال إرجاع' : 'Return Receipt'} #{request.request_id}
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
          {/* Return Information */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-green-50">
            <h3 className="text-lg font-semibold mb-4">{isRTL ? 'معلومات الإرجاع' : 'Return Information'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'تاريخ الإرجاع' : 'Return Date'}</p>
                <p className="text-base">
                  {request.return_date ? new Date(request.return_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'اسم المشرف' : 'Supervisor Name'}</p>
                <p className="text-base">{request.return_supervisor_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'هاتف المشرف' : 'Supervisor Phone'}</p>
                <p className="text-base">{request.return_supervisor_phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'أعاد بواسطة' : 'Returned By'}</p>
                <p className="text-base">{request.returned_by_employee || '-'}</p>
              </div>
            </div>
            {request.equipment_condition_on_return && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'حالة المعدات عند الإرجاع' : 'Equipment Condition on Return'}</p>
                <p className="text-base">{request.equipment_condition_on_return}</p>
              </div>
            )}
            {request.supervisor_notes && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-600">{isRTL ? 'ملاحظات المشرف' : 'Supervisor Notes'}</p>
                <p className="text-base">{request.supervisor_notes}</p>
              </div>
            )}
          </div>

          {/* Returned Items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">{isRTL ? 'الأصناف المرتجعة' : 'Returned Items'}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-3 text-left font-semibold">{isRTL ? 'اسم الصنف' : 'Item Name'}</th>
                    <th className="p-3 text-left font-semibold">{isRTL ? 'الفئة' : 'Category'}</th>
                    <th className="p-3 text-left font-semibold">{isRTL ? 'المطلوب' : 'Requested'}</th>
                    <th className="p-3 text-left font-semibold">{isRTL ? 'المرتجع' : 'Returned'}</th>
                    <th className="p-3 text-left font-semibold">{isRTL ? 'الحالة' : 'Condition'}</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((item, index) => (
                    <tr key={item.id || index} className="border-b hover:bg-gray-50">
                      <td className="p-3">{item.inventoryItem?.name || '-'}</td>
                      <td className="p-3">{item.inventoryItem?.category || '-'}</td>
                      <td className="p-3">{item.quantity_requested}</td>
                      <td className="p-3 font-semibold">{item.quantity_returned || 0}</td>
                      <td className="p-3">{item.condition_after_return || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnReceiptPrintView;
