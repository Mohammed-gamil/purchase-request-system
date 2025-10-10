import React, { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';

interface InventoryItem {
  id: string | number;
  name: string;
  code: string;
  description?: string;
  category: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit: string;
  unit_cost?: number;
  location?: string;
  condition: 'good' | 'fair' | 'needs_maintenance';
  needs_maintenance?: boolean;
  is_active: boolean;
  is_in_stock: boolean;
  created_at: string;
}

type Language = "en" | "ar";
type User = {
  id: string | number;
  name: string;
  role: string;
  apiRole?: string;
};

interface InventoryManagementProps {
  language?: Language;
  currentUser?: User;
  t?: (k: string) => string;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({ language = 'en', currentUser, t }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    quantity: '0',
    unit: '',
    unit_cost: '',
    location: '',
    condition: 'good' as 'good'|'fair'|'needs_maintenance',
    last_maintenance_date: '',
    next_maintenance_date: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string,string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function validateForm(): boolean {
    const errs: Record<string,string> = {};
    if (!form.name.trim()) errs.name = t ? t('requiredField') : 'Required';
    if (!form.category.trim()) {
      errs.category = t ? t('requiredField') : 'Required';
    } else if (form.category === '__custom') {
      errs.category = t ? t('enterCustomCategory') : 'Enter custom category';
    }
    const qty = Number(form.quantity);
    if (!isFinite(qty) || qty < 0) errs.quantity = t ? t('numberMustBePositive') : 'Must be a positive number';
    if (form.unit_cost) {
      const uc = Number(form.unit_cost);
      if (!isFinite(uc) || uc < 0) errs.unit_cost = t ? t('numberMustBePositive') : 'Must be a positive number';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setCreating(true);
    setFeedback(null);
    try {
      await inventoryApi.createItem({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim(),
        quantity: Number(form.quantity) || 0,
        unit: form.unit.trim() || 'unit',
        unit_cost: form.unit_cost ? Number(form.unit_cost) : undefined,
        location: form.location.trim() || undefined,
        condition: form.condition,
        last_maintenance_date: form.last_maintenance_date || undefined,
        next_maintenance_date: form.next_maintenance_date || undefined,
        notes: form.notes.trim() || undefined,
      });
      setFeedback(t ? t('itemCreated') : 'Item created');
      setShowCreateModal(false);
      // Reset form
      setForm({
        name: '', description: '', category: '', quantity: '0', unit: '', unit_cost: '', location: '', condition: 'good', last_maintenance_date: '', next_maintenance_date: '', notes: ''
      });
      await loadInventory();
    } catch (err) {
      console.error('Create failed', err);
      setFeedback(t ? t('createFailed') : 'Create failed');
    } finally {
      setCreating(false);
      // Auto-clear feedback after a while
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  function openEdit(item: InventoryItem) {
    setEditingItem(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      category: item.category || '',
      quantity: String(item.quantity ?? 0),
      unit: item.unit || '',
      unit_cost: item.unit_cost != null ? String(item.unit_cost) : '',
      location: item.location || '',
      condition: item.condition,
      last_maintenance_date: '',
      next_maintenance_date: '',
      notes: '',
    });
    setFormErrors({});
    setShowCreateModal(false); // ensure only one modal open
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    if (!validateForm()) return;
    setUpdating(true);
    setFeedback(null);
    try {
      await inventoryApi.updateItem(editingItem.id, {
        name: form.name.trim() || undefined,
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        unit: form.unit.trim() || undefined,
        unit_cost: form.unit_cost ? Number(form.unit_cost) : undefined,
        location: form.location.trim() || undefined,
        condition: form.condition,
        notes: form.notes.trim() || undefined,
      });
      setFeedback(t ? t('itemUpdated') : 'Item updated');
      setEditingItem(null);
      await loadInventory();
    } catch (err) {
      console.error('Update failed', err);
      setFeedback(t ? t('updateFailed') : 'Update failed');
    } finally {
      setUpdating(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await inventoryApi.deleteItem(itemToDelete.id);
      setFeedback(t ? t('itemDeleted') : 'Item deleted successfully');
      setItemToDelete(null);
      await loadInventory();
    } catch (err: any) {
      console.error('Delete failed', err);
      const errorMsg = err?.message || '';
      let displayMsg = t ? t('deleteFailed') : 'Delete failed';
      
      if (errorMsg.includes('reserved quantity') || errorMsg.includes('reservations')) {
        displayMsg = t ? t('cannotDeleteReservedItem') : 'Cannot delete: This item has reserved quantity. Please release all reservations first.';
      } else if (errorMsg.includes('administrators') || errorMsg.includes('permission')) {
        displayMsg = t ? t('adminOnlyDelete') : 'Only administrators can delete inventory items.';
      } else if (errorMsg) {
        displayMsg = errorMsg;
      }
      
      setFeedback(displayMsg);
    } finally {
      setDeleting(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  }

  useEffect(() => {
    loadInventory();
    loadCategories();
  }, [search, categoryFilter]);

  async function loadInventory() {
    try {
      setLoading(true);
      const response = await inventoryApi.getItems({
        search,
        category: categoryFilter || undefined,
        active_only: false,
        per_page: 100,
      });
      if (response.data) {
        setItems(response.data as any);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await inventoryApi.getCategories();
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  const conditionBadge = (condition: string) => {
    const colors = {
      good: 'bg-green-100 text-green-800',
      fair: 'bg-yellow-100 text-yellow-800',
      needs_maintenance: 'bg-red-100 text-red-800',
    };
    return colors[condition as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const isAr = language === 'ar';
  const conditionLabel = (condition: InventoryItem['condition']) => {
    if (!t) return condition.replace('_', ' ');
    switch (condition) {
      case 'good': return t('conditionGood');
      case 'fair': return t('conditionFair');
      case 'needs_maintenance': return t('conditionNeedsMaintenance');
      default: {
        const c: string = String(condition);
        return c.replace('_', ' ');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {isAr ? (
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-md bg-warning px-4 py-2 text-sm font-medium text-warning-foreground hover:bg-warning/90 transition-all duration-200 hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                {t ? t('addItem') : 'Add Item'}
              </button>
              <div className="text-right">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {t ? t('inventoryManagement') : 'Inventory Management'}
                </h1>
                <p className="text-sm text-subtext mt-1">
                  {t ? t('inventoryManageSubtitle') : 'Manage tools, equipment, and materials'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {t ? t('inventoryManagement') : 'Inventory Management'}
                </h1>
                <p className="text-sm text-subtext mt-1">
                  {t ? t('inventoryManageSubtitle') : 'Manage tools, equipment, and materials'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-md bg-warning px-4 py-2 text-sm font-medium text-warning-foreground hover:bg-warning/90 transition-all duration-200 hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                {t ? t('addItem') : 'Add Item'}
              </button>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtext" />
              <input
                type="text"
                placeholder={t ? t('searchInventoryPlaceholder') : 'Search by name, code, or description...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
            >
              <option value="">{t ? t('allCategories') : 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="rounded-lg border border-border bg-card p-4 space-y-3 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-secondary rounded w-3/4"></div>
                    <div className="h-3 bg-secondary rounded w-1/2"></div>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-8 w-8 bg-secondary rounded"></div>
                    <div className="h-8 w-8 bg-secondary rounded"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-secondary rounded w-full"></div>
                  <div className="h-3 bg-secondary rounded w-full"></div>
                  <div className="h-3 bg-secondary rounded w-4/5"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-secondary rounded-full"></div>
                  <div className="h-5 w-20 bg-secondary rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-subtext" />
            <h3 className="mt-4 text-lg font-semibold">{t ? t('noInventoryItems') : 'No inventory items'}</h3>
            <p className="mt-2 text-sm text-subtext">
              {t ? t('inventoryEmptyHelp') : 'Get started by adding your first inventory item.'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-warning px-4 py-2 text-sm font-medium text-warning-foreground hover:bg-warning/90"
            >
              <Plus className="h-4 w-4" />
              {t ? t('addItem') : 'Add Item'}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-card p-4 space-y-3 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                    <p className="text-xs text-subtext">{item.code}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(item)}
                      className="rounded p-1.5 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                      title={t ? t('edit') : 'Edit'}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setItemToDelete(item)}
                      disabled={item.reserved_quantity > 0}
                      className={`rounded p-1.5 transition-all duration-200 ${
                        item.reserved_quantity > 0
                          ? 'opacity-40 cursor-not-allowed text-gray-400'
                          : 'hover:bg-red-100 text-red-600'
                      }`}
                      title={
                        item.reserved_quantity > 0
                          ? (t ? t('cannotDeleteReserved') : 'Cannot delete: item has reserved quantity')
                          : (t ? t('delete') : 'Delete')
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-subtext">{t ? t('category') : 'Category'}:</span>
                    <span className="font-medium">{item.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-subtext">{t ? t('total') : 'Total'}:</span>
                    <span className="font-medium">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-subtext">{t ? t('reserved') : 'Reserved'}:</span>
                    <span className="font-medium text-orange-600">
                      {item.reserved_quantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-subtext">{t ? t('available') : 'Available'}:</span>
                    <span
                      className={`font-semibold ${
                        item.available_quantity > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {item.available_quantity} {item.unit}
                    </span>
                  </div>
                  {item.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-subtext">{t ? t('location') : 'Location'}:</span>
                      <span className="font-medium">{item.location}</span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-transform duration-200 hover:scale-105 ${conditionBadge(
                      item.condition
                    )}`}
                  >
                    {conditionLabel(item.condition)}
                  </span>
                  {item.needs_maintenance && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 transition-transform duration-200 hover:scale-105 animate-pulse">
                      <AlertTriangle className="h-3 w-3" />
                      {t ? t('maintenanceDue') : 'Maintenance Due'}
                    </span>
                  )}
                  {!item.is_active && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 transition-transform duration-200 hover:scale-105">
                      {t ? t('inactive') : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals would go here */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowCreateModal(false); }}
          role="dialog"
          aria-modal="true"
        >
            <div className="w-full max-w-2xl rounded-xl shadow-xl border border-border ring-1 ring-border/50 p-0 relative animate-in fade-in zoom-in bg-card bg-white bg-background">
            <div className="h-1 w-full bg-gradient-to-r from-warning via-warning/90 to-warning/40 rounded-t-xl" />
            <div className="p-6">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute top-3 end-3 h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-secondary text-sm"
              aria-label={t ? t('close') : 'Close'}
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">
              {t ? t('addItemTitle') : 'Add Inventory Item'}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4 text-sm" dir={isAr ? 'rtl' : 'ltr'}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-bold text-primary uppercase tracking-wide">{t ? t('name') : 'Item Name'}</label>
                  <input value={form.name} onChange={e=>updateForm('name', e.target.value)} placeholder="e.g., Drill Machine, Paint Roller" className={`w-full rounded-lg border-2 bg-background px-3 py-2.5 font-medium shadow-sm focus:outline-none focus:ring-2 transition-colors duration-200 ${formErrors.name ? 'border-red-500 focus:ring-red-200' : 'border-border focus:border-primary focus:ring-primary/20'}`} />
                  {formErrors.name && <p className="mt-1 text-xs text-red-600 font-semibold">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-primary uppercase tracking-wide">{t ? t('categoryField') : 'Category'}</label>
                  <select
                    value={form.category}
                    onChange={(e)=>updateForm('category', e.target.value)}
                    className={`w-full rounded-lg border-2 bg-background px-3 py-2.5 font-semibold shadow-sm focus:outline-none focus:ring-2 transition-colors duration-200 ${formErrors.category ? 'border-red-500 focus:ring-red-200' : 'border-border focus:border-primary focus:ring-primary/20'}`}
                  >
                    <option value="">{t ? t('selectCategory') : 'Select Category'}</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom">{t ? t('customCategory') : '+ Custom Category'}</option>
                  </select>
                  {form.category === '__custom' && (
                    <input
                      autoFocus
                      placeholder={t ? t('enterCustomCategory') : 'Enter custom category name'}
                      className={`mt-2 w-full rounded-lg border-2 bg-background px-3 py-2.5 font-medium shadow-sm focus:outline-none focus:ring-2 transition-colors duration-200 ${formErrors.category ? 'border-red-500 focus:ring-red-200' : 'border-border focus:border-primary focus:ring-primary/20'}`}
                      onChange={(e)=>updateForm('category', e.target.value.trim())}
                    />
                  )}
                  {formErrors.category && <p className="mt-1 text-xs text-red-600 font-semibold">{formErrors.category}</p>}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-primary uppercase tracking-wide">{t ? t('quantityField') : 'Quantity'}</label>
                  <input type="number" min={0} value={form.quantity} onChange={e=>updateForm('quantity', e.target.value)} placeholder="e.g., 50" className={`w-full rounded-lg border-2 bg-background px-3 py-2.5 font-semibold shadow-sm focus:outline-none focus:ring-2 transition-colors duration-200 ${formErrors.quantity ? 'border-red-500 focus:ring-red-200' : 'border-border focus:border-primary focus:ring-primary/20'}`} />
                  {formErrors.quantity && <p className="mt-1 text-xs text-red-600 font-semibold">{formErrors.quantity}</p>}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-primary uppercase tracking-wide">{t ? t('unitField') : 'Unit'}</label>
                  <input value={form.unit} onChange={e=>updateForm('unit', e.target.value)} placeholder="e.g., pieces, kg, liters" className="w-full rounded-lg border-2 border-border bg-background px-3 py-2.5 font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200" />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-warning uppercase tracking-wide">{t ? t('unitCostField') : 'Unit Cost (SAR)'}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-subtext">SAR</span>
                    <input type="number" min={0} step="0.01" value={form.unit_cost} onChange={e=>updateForm('unit_cost', e.target.value)} placeholder="0.00" className={`w-full rounded-lg border-2 bg-background pl-14 pr-3 py-2.5 font-bold shadow-sm focus:outline-none focus:ring-2 transition-colors duration-200 ${formErrors.unit_cost ? 'border-red-500 focus:ring-red-200' : 'border-border focus:border-warning focus:ring-warning/20'}`} />
                  </div>
                  {formErrors.unit_cost && <p className="mt-1 text-xs text-red-600 font-semibold">{formErrors.unit_cost}</p>}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-primary uppercase tracking-wide">{t ? t('locationField') : 'Location'}</label>
                  <input value={form.location} onChange={e=>updateForm('location', e.target.value)} placeholder="e.g., Warehouse A, Shelf 3" className="w-full rounded-lg border-2 border-border bg-background px-3 py-2.5 font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200" />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-primary uppercase tracking-wide">{t ? t('conditionField') : 'Condition'}</label>
                  <select value={form.condition} onChange={e=>updateForm('condition', e.target.value as any)} className="w-full rounded-lg border-2 border-border bg-background px-3 py-2.5 font-semibold shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200">
                    <option value="good">{t ? t('conditionGood') : 'Good'}</option>
                    <option value="fair">{t ? t('conditionFair') : 'Fair'}</option>
                    <option value="needs_maintenance">{t ? t('conditionNeedsMaintenance') : 'Needs maintenance'}</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-primary uppercase tracking-wide">{t ? t('lastMaintenanceDate') : 'Last Maintenance Date'}</label>
                  <input type="date" value={form.last_maintenance_date} onChange={e=>updateForm('last_maintenance_date', e.target.value)} className="w-full rounded-lg border-2 border-border bg-background px-3 py-2.5 font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200" />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-primary uppercase tracking-wide">{t ? t('nextMaintenanceDate') : 'Next Maintenance Date'}</label>
                  <input type="date" value={form.next_maintenance_date} onChange={e=>updateForm('next_maintenance_date', e.target.value)} className="w-full rounded-lg border-2 border-border bg-background px-3 py-2.5 font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200" />
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-bold text-primary uppercase tracking-wide">{t ? t('descriptionField') : 'Description'}</label>
                <textarea value={form.description} onChange={e=>updateForm('description', e.target.value)} rows={3} placeholder="Detailed description of the item..." className="w-full rounded-lg border-2 border-border bg-background px-3 py-2.5 font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-bold text-primary uppercase tracking-wide">{t ? t('notesField') : 'Notes'}</label>
                <textarea value={form.notes} onChange={e=>updateForm('notes', e.target.value)} rows={2} placeholder="Additional notes or comments..." className="w-full rounded-lg border-2 border-border bg-background px-3 py-2.5 font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200" />
              </div>
              {feedback && <div className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg p-2">{feedback}</div>}
              <div className="flex justify-between items-center gap-3 pt-4 border-t border-border">
                <div className="text-xs">
                  {Object.keys(formErrors).length > 0 && <span className="text-red-600 font-semibold">⚠ {Object.keys(formErrors).length} error(s) to fix</span>}
                  {Object.keys(formErrors).length === 0 && !creating && <span className="text-green-600 font-semibold">✓ Ready to save</span>}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={()=>setShowCreateModal(false)} className="rounded-lg border-2 border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary hover:border-primary transition-all duration-200">
                    {t ? t('cancelSmall') : 'Cancel'}
                  </button>
                  <button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-lg bg-warning px-6 py-2.5 text-sm font-bold text-warning-foreground hover:bg-warning/90 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                    {creating && (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {creating ? (t ? t('saving') : 'Saving...') : (t ? t('save') : 'Save')}
                  </button>
                </div>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setEditingItem(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditingItem(null); }}
          role="dialog" aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-xl shadow-xl border border-border ring-1 ring-border/50 p-0 relative animate-in fade-in zoom-in bg-card bg-white bg-background">
            <div className="h-1 w-full bg-gradient-to-r from-warning via-warning/90 to-warning/40 rounded-t-xl" />
            <div className="p-6">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="absolute top-3 end-3 h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-secondary text-sm"
                aria-label={t ? t('close') : 'Close'}
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-4">{t ? t('editItemTitle') : 'Edit Inventory Item'}</h2>
              <form onSubmit={handleUpdate} className="space-y-4 text-sm" dir={isAr ? 'rtl' : 'ltr'}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block mb-1 font-medium">{t ? t('name') : 'Name'}</label>
                    <input value={form.name} onChange={e=>updateForm('name', e.target.value)} className={`w-full rounded-md border bg-background px-3 py-2 ${formErrors.name ? 'border-red-500' : 'border-border'}`} />
                    {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{t ? t('categoryField') : 'Category'}</label>
                    <select
                      value={form.category}
                      onChange={(e)=>updateForm('category', e.target.value)}
                      className={`w-full rounded-md border bg-background px-3 py-2 ${formErrors.category ? 'border-red-500' : 'border-border'}`}
                    >
                      <option value="">{t ? t('selectCategory') : 'Select Category'}</option>
                      {/* Ensure existing item category appears even if not in categories list */}
                      {[...new Set([...(categories||[]), form.category].filter(Boolean))].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__custom">{t ? t('customCategory') : 'Custom Category'}</option>
                    </select>
                    {form.category === '__custom' && (
                      <input
                        autoFocus
                        placeholder={t ? t('enterCustomCategory') : 'Enter custom category'}
                        className={`mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm ${formErrors.category ? 'border-red-500' : 'border-border'}`}
                        onChange={(e)=>updateForm('category', e.target.value.trim())}
                      />
                    )}
                    {formErrors.category && <p className="mt-1 text-xs text-red-600">{formErrors.category}</p>}
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{t ? t('quantityField') : 'Quantity'}</label>
                    <input disabled value={form.quantity} className="w-full rounded-md border border-border bg-background px-3 py-2 opacity-70 cursor-not-allowed" />
                    <p className="mt-1 text-[10px] text-subtext">(Adjust quantity via dedicated adjustments feature if implemented)</p>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{t ? t('unitField') : 'Unit'}</label>
                    <input value={form.unit} onChange={e=>updateForm('unit', e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{t ? t('unitCostField') : 'Unit Cost'}</label>
                    <input type="number" min={0} step="0.01" value={form.unit_cost} onChange={e=>updateForm('unit_cost', e.target.value)} className={`w-full rounded-md border bg-background px-3 py-2 ${formErrors.unit_cost ? 'border-red-500' : 'border-border'}`} />
                    {formErrors.unit_cost && <p className="mt-1 text-xs text-red-600">{formErrors.unit_cost}</p>}
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{t ? t('locationField') : 'Location'}</label>
                    <input value={form.location} onChange={e=>updateForm('location', e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">{t ? t('conditionField') : 'Condition'}</label>
                    <select value={form.condition} onChange={e=>updateForm('condition', e.target.value as any)} className="w-full rounded-md border border-border bg-background px-3 py-2">
                      <option value="good">{t ? t('conditionGood') : 'Good'}</option>
                      <option value="fair">{t ? t('conditionFair') : 'Fair'}</option>
                      <option value="needs_maintenance">{t ? t('conditionNeedsMaintenance') : 'Needs maintenance'}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 font-medium">{t ? t('descriptionField') : 'Description'}</label>
                  <textarea value={form.description} onChange={e=>updateForm('description', e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">{t ? t('notesField') : 'Notes'}</label>
                  <textarea value={form.notes} onChange={e=>updateForm('notes', e.target.value)} rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2" />
                </div>
                {feedback && <div className="text-xs text-subtext">{feedback}</div>}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={()=>setEditingItem(null)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
                    {t ? t('cancelSmall') : 'Cancel'}
                  </button>
                  <button type="submit" disabled={updating} className="rounded-md bg-warning px-4 py-2 text-sm font-medium text-warning-foreground hover:bg-warning/90 disabled:opacity-60">
                    {updating ? (t ? t('saving') : 'Saving...') : (t ? t('save') : 'Save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setItemToDelete(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setItemToDelete(null); }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl shadow-xl border border-border ring-1 ring-border/50 p-0 relative animate-in fade-in zoom-in bg-card bg-white bg-background">
            <div className="h-1 w-full bg-gradient-to-r from-red-500 via-red-400 to-red-300 rounded-t-xl" />
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 rounded-full bg-red-100 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-foreground mb-2">
                    {t ? t('deleteItemTitle') : 'Delete Inventory Item'}
                  </h2>
                  <p className="text-sm text-subtext mb-4">
                    {t ? t('deleteItemConfirmation') : 'Are you sure you want to delete'}
                    {' '}
                    <span className="font-semibold text-foreground">"{itemToDelete.name}"</span>?
                    {' '}
                    {t ? t('deleteItemWarning') : 'This action cannot be undone.'}
                  </p>
                  {itemToDelete.reserved_quantity > 0 && (
                    <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded p-3 mb-4">
                      <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-orange-800">
                        <p className="font-semibold mb-1">{t ? t('reservedWarning') : 'Warning: Reserved Quantity'}</p>
                        <p>
                          {t ? t('reservedWarningMsg') : 'This item has'} {itemToDelete.reserved_quantity} {itemToDelete.unit} {t ? t('reserved') : 'reserved'}.
                          {' '}{t ? t('deletionBlocked') : 'Deletion will be blocked by the system.'}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-subtext bg-secondary/50 rounded p-3 mb-4">
                    <div className="flex justify-between mb-1">
                      <span>{t ? t('code') : 'Code'}:</span>
                      <span className="font-medium">{itemToDelete.code}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>{t ? t('category') : 'Category'}:</span>
                      <span className="font-medium">{itemToDelete.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t ? t('quantity') : 'Quantity'}:</span>
                      <span className="font-medium">
                        {itemToDelete.quantity} {itemToDelete.unit}
                      </span>
                    </div>
                  </div>
                  {feedback && (
                    <div className={`text-xs mb-4 p-3 rounded ${
                      feedback.includes('success') || feedback.includes('deleted successfully')
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {feedback}
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setItemToDelete(null)}
                      disabled={deleting}
                      className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-60"
                    >
                      {t ? t('cancel') : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || itemToDelete.reserved_quantity > 0}
                      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                      {deleting && (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {deleting ? (t ? t('deleting') : 'Deleting...') : (t ? t('delete') : 'Delete')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
