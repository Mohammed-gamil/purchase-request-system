import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Package, MapPin, Plus, Trash2, Clock, CheckCircle } from 'lucide-react';
import { inventoryRequestsApi, inventoryApi } from '@/lib/api';

interface InventoryRequestCreateProps {
  language: 'en' | 'ar';
  currentUser: {
    id: string | number;
    name: string;
    role: string;
    apiRole?: string;
  };
  t: (key: string) => string;
  onClose: () => void;
  onSuccess: () => void;
}

interface InventoryRequestItem {
  inventory_item_id: string;
  quantity: number;
  purpose: string;
}

const InventoryRequestCreate: React.FC<InventoryRequestCreateProps> = ({
  language,
  currentUser,
  t,
  onClose,
  onSuccess
}) => {
  const isRTL = language === 'ar';
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    employee_name: currentUser.name || '',
    employee_position: '',
    employee_id_number: '',
    project_name: '',
    location: '',
    exit_date: '',
    exit_time: '',
    expected_return_date: '',
    expected_return_time: '',
    notes: ''
  });

  const [requestedItems, setRequestedItems] = useState<InventoryRequestItem[]>([{
    inventory_item_id: '',
    quantity: 1,
    purpose: ''
  }]);

  useEffect(() => {
    loadInventoryItems();
  }, []);

  const loadInventoryItems = async () => {
    try {
      const response = await inventoryApi.getAll({ per_page: 100 });
      if (response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : response.data.data || [];
        setAvailableItems(items.filter((item: any) => item.is_active && item.is_in_stock));
      }
    } catch (error) {
      console.error('Failed to load inventory items:', error);
    }
  };

  const handleAddItem = () => {
    setRequestedItems([...requestedItems, {
      inventory_item_id: '',
      quantity: 1,
      purpose: ''
    }]);
  };

  const handleRemoveItem = (index: number) => {
    if (requestedItems.length > 1) {
      setRequestedItems(requestedItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof InventoryRequestItem, value: any) => {
    const updated = [...requestedItems];
    updated[index] = { ...updated[index], [field]: value };
    setRequestedItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        items: requestedItems.filter(item => item.inventory_item_id && item.quantity > 0)
      };

      const newRequest = await inventoryRequestsApi.create(payload);
      
      // Auto-submit if created successfully
      if (newRequest && newRequest.id) {
        await inventoryRequestsApi.submit(newRequest.id);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create request:', error);
      alert(error.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const getItemName = (itemId: string) => {
    const item = availableItems.find(i => i.id?.toString() === itemId?.toString());
    return item ? item.name : '';
  };

  const getAvailableQuantity = (itemId: string) => {
    const item = availableItems.find(i => i.id?.toString() === itemId?.toString());
    return item ? item.available_quantity || 0 : 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="text-2xl font-bold text-purple-900">
              {isRTL ? 'نموذج إذن خروج معدات تصوير – Action Group' : 'Equipment Exit Permit Form – Action Group'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isRTL ? 'القسم: قسم الإنتاج والتصوير' : 'Department: Production & Photography'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Employee Information */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border-l-4 border-purple-600">
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              {isRTL ? 'معلومات الموظف المسؤول' : 'Responsible Employee Information'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  required
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
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {isRTL ? 'رقم الهوية' : 'ID Number'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.employee_id_number}
                  onChange={(e) => setFormData({...formData, employee_id_number: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder={isRTL ? 'أدخل رقم الهوية' : 'Enter ID number'}
                  required
                />
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              {isRTL ? 'تفاصيل المشروع' : 'Project Details'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {isRTL ? 'اسم المشروع' : 'Project Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.project_name}
                  onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {isRTL ? 'موقع التصوير' : 'Shooting Location'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Equipment List */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                {isRTL ? 'قائمة المعدات المطلوبة' : 'Requested Equipment List'}
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                {isRTL ? 'إضافة معدة' : 'Add Item'}
              </button>
            </div>

            <div className="space-y-3">
              {requestedItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="md:col-span-5">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">
                      {isRTL ? 'المعدة' : 'Equipment'}
                    </label>
                    <select
                      value={item.inventory_item_id}
                      onChange={(e) => handleItemChange(index, 'inventory_item_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    >
                      <option value="">{isRTL ? 'اختر المعدة' : 'Select Equipment'}</option>
                      {availableItems.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} - ({isRTL ? 'متاح' : 'Available'}: {inv.available_quantity || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">
                      {isRTL ? 'الكمية' : 'Quantity'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={getAvailableQuantity(item.inventory_item_id)}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold mb-1 text-gray-600">
                      {isRTL ? 'الغرض من الاستخدام' : 'Purpose'}
                    </label>
                    <input
                      type="text"
                      value={item.purpose}
                      onChange={(e) => handleItemChange(index, 'purpose', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder={isRTL ? 'اختياري' : 'Optional'}
                    />
                  </div>

                  <div className="md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="w-full px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                      disabled={requestedItems.length === 1}
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dates & Times */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              {isRTL ? 'مواعيد الخروج والعودة' : 'Exit & Return Schedule'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {isRTL ? 'تاريخ الخروج' : 'Exit Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.exit_date}
                  onChange={(e) => setFormData({...formData, exit_date: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {isRTL ? 'وقت الخروج' : 'Exit Time'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.exit_time}
                  onChange={(e) => setFormData({...formData, exit_time: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {isRTL ? 'تاريخ العودة المتوقع' : 'Expected Return Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expected_return_date}
                  onChange={(e) => setFormData({...formData, expected_return_date: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  {isRTL ? 'وقت العودة المتوقع' : 'Expected Return Time'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.expected_return_time}
                  onChange={(e) => setFormData({...formData, expected_return_time: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              {isRTL ? 'ملاحظات إضافية' : 'Additional Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={3}
              placeholder={isRTL ? 'أي معلومات إضافية...' : 'Any additional information...'}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  {isRTL ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  {isRTL ? 'إرسال الطلب' : 'Submit Request'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryRequestCreate;
