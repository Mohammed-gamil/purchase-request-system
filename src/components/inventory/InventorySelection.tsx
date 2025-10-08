import React, { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';

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
  is_active: boolean;
  is_in_stock: boolean;
}

interface SelectedInventoryItem {
  inventory_item_id: number;
  quantity_requested: number;
  expected_return_date?: string;
  item?: InventoryItem;
}

interface InventorySelectionProps {
  selectedItems: SelectedInventoryItem[];
  onSelectionChange: (items: SelectedInventoryItem[]) => void;
  projectStartTime?: string;
  projectEndTime?: string;
  readOnly?: boolean;
}

export const InventorySelection: React.FC<InventorySelectionProps> = ({
  selectedItems,
  onSelectionChange,
  projectStartTime,
  projectEndTime,
  readOnly = false,
}) => {
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);

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
        in_stock_only: true,
        active_only: true,
        per_page: 100,
      });
      if (response.data) {
        setAvailableItems(response.data as any);
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

  function addItem(item: InventoryItem) {
    const existing = selectedItems.find(
      (si) => si.inventory_item_id === item.id
    );
    if (existing) return;

    onSelectionChange([
      ...selectedItems,
      {
        inventory_item_id: Number(item.id),
        quantity_requested: 1,
        expected_return_date: projectEndTime || undefined,
        item,
      },
    ]);
  }

  function removeItem(itemId: number) {
    onSelectionChange(
      selectedItems.filter((si) => si.inventory_item_id !== itemId)
    );
  }

  function updateQuantity(itemId: number, quantity: number) {
    onSelectionChange(
      selectedItems.map((si) =>
        si.inventory_item_id === itemId
          ? { ...si, quantity_requested: quantity }
          : si
      )
    );
  }

  function updateReturnDate(itemId: number, date: string) {
    onSelectionChange(
      selectedItems.map((si) =>
        si.inventory_item_id === itemId
          ? { ...si, expected_return_date: date }
          : si
      )
    );
  }

  const getItemDetails = (itemId: number): InventoryItem | undefined => {
    const selected = selectedItems.find((si) => si.inventory_item_id === itemId);
    if (selected?.item) return selected.item;
    return availableItems.find((ai) => ai.id === itemId);
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-sm text-subtext">Loading inventory...</div>
          ) : (
            <div className="rounded-lg border border-border max-h-64 overflow-y-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Item
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Category
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Available
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {availableItems.map((item) => {
                    const isSelected = selectedItems.some(
                      (si) => si.inventory_item_id === item.id
                    );
                    return (
                      <tr key={item.id} className={isSelected ? 'bg-muted/30' : ''}>
                        <td className="px-3 py-2 text-sm">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-subtext">{item.code}</div>
                        </td>
                        <td className="px-3 py-2 text-sm">{item.category}</td>
                        <td className="px-3 py-2 text-sm">
                          {item.available_quantity} {item.unit}
                        </td>
                        <td className="px-3 py-2">
                          {isSelected ? (
                            <span className="text-xs text-green-600 font-medium">
                              ✓ Selected
                            </span>
                          ) : (
                            <button
                              onClick={() => addItem(item)}
                              className="rounded-md bg-warning px-3 py-1 text-xs font-medium text-warning-foreground hover:bg-warning/90"
                              disabled={item.available_quantity === 0}
                            >
                              Add
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {availableItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm text-subtext">
                        No inventory items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          Selected Items ({selectedItems.length})
        </h3>
        {selectedItems.length === 0 ? (
          <p className="text-sm text-subtext">
            No items selected. {!readOnly && 'Add items from the list above.'}
          </p>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((selected) => {
              const item = getItemDetails(selected.inventory_item_id);
              if (!item) return null;

              return (
                <div
                  key={selected.inventory_item_id}
                  className="flex flex-col sm:flex-row gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-subtext">
                      Available: {item.available_quantity} {item.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={item.available_quantity}
                      value={selected.quantity_requested}
                      onChange={(e) =>
                        updateQuantity(
                          selected.inventory_item_id,
                          parseInt(e.target.value) || 1
                        )
                      }
                      disabled={readOnly}
                      className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
                      placeholder="Qty"
                    />
                    <input
                      type="date"
                      value={selected.expected_return_date?.split('T')[0] || ''}
                      onChange={(e) =>
                        updateReturnDate(selected.inventory_item_id, e.target.value)
                      }
                      disabled={readOnly}
                      min={projectStartTime?.split('T')[0]}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
                      placeholder="Return date"
                    />
                    {!readOnly && (
                      <button
                        onClick={() => removeItem(selected.inventory_item_id)}
                        className="rounded-md border border-border px-2 py-1 text-sm hover:bg-secondary"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventorySelection;
