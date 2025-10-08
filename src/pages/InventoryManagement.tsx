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
            className="inline-flex items-center gap-2 rounded-md bg-warning px-4 py-2 text-sm font-medium text-warning-foreground hover:bg-warning/90"
          >
            <Plus className="h-4 w-4" />
            {t ? t('addItem') : 'Add Item'}
          </button>
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtext" />
              <input
                type="text"
                placeholder={t ? t('searchInventoryPlaceholder') : 'Search by name, code, or description...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
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
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-subtext animate-pulse" />
              <p className="mt-2 text-sm text-subtext">{t ? t('loadingInventory') : 'Loading inventory...'}</p>
            </div>
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
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-card p-4 space-y-3"
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
                      className="rounded p-1 hover:bg-secondary"
                      title={t ? t('edit') : 'Edit'}
                    >
                      <Edit className="h-4 w-4" />
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
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${conditionBadge(
                      item.condition
                    )}`}
                  >
                    {conditionLabel(item.condition)}
                  </span>
                  {item.needs_maintenance && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      <AlertTriangle className="h-3 w-3" />
                      {t ? t('maintenanceDue') : 'Maintenance Due'}
                    </span>
                  )}
                  {!item.is_active && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
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
                    {categories.map(cat => (
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
                  <input type="number" min={0} value={form.quantity} onChange={e=>updateForm('quantity', e.target.value)} className={`w-full rounded-md border bg-background px-3 py-2 ${formErrors.quantity ? 'border-red-500' : 'border-border'}`} />
                  {formErrors.quantity && <p className="mt-1 text-xs text-red-600">{formErrors.quantity}</p>}
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
                <div>
                  <label className="block mb-1 font-medium">{t ? t('lastMaintenanceDate') : 'Last Maintenance Date'}</label>
                  <input type="date" value={form.last_maintenance_date} onChange={e=>updateForm('last_maintenance_date', e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">{t ? t('nextMaintenanceDate') : 'Next Maintenance Date'}</label>
                  <input type="date" value={form.next_maintenance_date} onChange={e=>updateForm('next_maintenance_date', e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
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
                <button type="button" onClick={()=>setShowCreateModal(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
                  {t ? t('cancelSmall') : 'Cancel'}
                </button>
                <button type="submit" disabled={creating} className="rounded-md bg-warning px-4 py-2 text-sm font-medium text-warning-foreground hover:bg-warning/90 disabled:opacity-60">
                  {creating ? (t ? t('saving') : 'Saving...') : (t ? t('save') : 'Save')}
                </button>
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
    </div>
  );
};

export default InventoryManagement;
