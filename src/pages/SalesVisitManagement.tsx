import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Edit2,
  Trash2
} from 'lucide-react';
import { Visit, VisitFilters, VisitStats } from '../types/visits';
import api from '../lib/api';
import VisitForm from '../components/VisitForm';
import VisitDetailView from '../components/VisitDetailView';

interface SalesVisitManagementProps {
  language: 'en' | 'ar';
  currentUser: {
    id: string | number;
    name: string;
    role: string;
    email?: string;
    apiRole?: string;
  };
  t: (key: string) => string;
}

const SalesVisitManagement: React.FC<SalesVisitManagementProps> = ({ 
  language, 
  currentUser, 
  t 
}) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VisitFilters>({
    search: '',
    status: [],
    date_from: '',
    date_to: '',
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const isSalesRep = currentUser.apiRole === 'SALES_REP';
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.apiRole || '');

  useEffect(() => {
    loadVisits();
    if (isAdmin) {
      loadStats();
    }
  }, [filters]);

  const loadVisits = async () => {
    try {
      setLoading(true);
      const params: any = {
        ...filters,
        per_page: 50,
      };
      
      // Sales reps only see their own visits
      if (isSalesRep) {
        params.rep_id = currentUser.id;
      }

      const response = await api.visits.getVisits(params);
      if (response.success && response.data) {
        setVisits(response.data as Visit[]);
      }
    } catch (error) {
      console.error('Failed to load visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.visits.getVisitStats();
      if (response.success && response.data) {
        setStats(response.data as VisitStats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleStatusUpdate = async (visitId: number, newStatus: string, notes?: string) => {
    try {
      const response = await api.visits.updateVisitStatus(visitId, {
        status: newStatus,
        notes: notes
      });
      if (response.success) {
        // Reload visits to get updated data
        await loadVisits();
        if (isAdmin) {
          await loadStats();
        }
        alert(t('statusUpdated') || 'Status updated successfully');
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      throw error;
    }
  };

  const handleAddNotes = async (visitId: number, notes: string, isAdminNote: boolean) => {
    try {
      const notesData = {
        [isAdminNote ? 'admin_notes' : 'rep_notes']: notes
      };
      
      const response = await api.visits.addVisitNotes(visitId, notesData);
      if (response.success) {
        await loadVisits();
        alert(t('notesAdded') || 'Notes added successfully');
      } else {
        throw new Error('Failed to add notes');
      }
    } catch (error) {
      console.error('Failed to add notes:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-blue-100 text-blue-700',
      pending_review: 'bg-yellow-100 text-yellow-700',
      action_required: 'bg-orange-100 text-orange-700',
      approved: 'bg-green-100 text-green-700',
      quotation_sent: 'bg-purple-100 text-purple-700',
      closed_won: 'bg-emerald-100 text-emerald-700',
      closed_lost: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isSalesRep ? t('myVisits') : t('allVisits')}
          </h1>
          <p className="text-gray-600 mt-1">
            {isSalesRep 
              ? t('manageYourClientVisits') 
              : t('manageAllSalesVisits')
            }
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          {t('newVisit')}
        </button>
      </div>

      {/* Stats Cards (Admin Only) */}
      {isAdmin && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('totalVisits')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('pendingReview')}</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_review}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('approved')}</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('conversionRate')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.total > 0 ? ((stats.closed_won / stats.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('searchVisits')}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filters.status?.[0] || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value ? [e.target.value as any] : [] })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('allStatuses')}</option>
            <option value="draft">{t('draft')}</option>
            <option value="submitted">{t('submitted')}</option>
            <option value="pending_review">{t('pendingReview')}</option>
            <option value="action_required">{t('actionRequired')}</option>
            <option value="approved">{t('approved')}</option>
            <option value="quotation_sent">{t('quotationSent')}</option>
            <option value="closed_won">{t('closedWon')}</option>
            <option value="closed_lost">{t('closedLost')}</option>
          </select>

          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={t('dateFrom')}
          />

          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={t('dateTo')}
          />
        </div>
        
        {/* Export Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={async () => {
              try {
                const exportParams: any = {
                  search: filters.search,
                  status: filters.status?.[0],
                  date_from: filters.date_from,
                  date_to: filters.date_to,
                  business_type_id: filters.business_type_id,
                  rep_id: isSalesRep ? Number(currentUser.id) : undefined,
                };
                await api.visits.exportExcel(exportParams);
              } catch (error) {
                console.error('Export Excel failed:', error);
                alert(t('exportFailed') || 'Failed to export to Excel');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <FileText className="w-5 h-5" />
            {t('exportExcel') || 'Export to Excel'}
          </button>
          
          <button
            onClick={async () => {
              try {
                const exportParams: any = {
                  search: filters.search,
                  status: filters.status?.[0],
                  date_from: filters.date_from,
                  date_to: filters.date_to,
                  business_type_id: filters.business_type_id,
                  rep_id: isSalesRep ? Number(currentUser.id) : undefined,
                };
                await api.visits.exportPdf(exportParams);
              } catch (error) {
                console.error('Export PDF failed:', error);
                alert(t('exportFailed') || 'Failed to export to PDF');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <FileText className="w-5 h-5" />
            {t('exportPdf') || 'Export to PDF'}
          </button>
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('loading')}</p>
          </div>
        ) : visits.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">{t('noVisitsFound')}</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('createFirstVisit')}
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('visitDate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('client')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('salesRep')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('businessType')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('nextAction')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visits.map((visit) => (
                <tr key={visit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(visit.visit_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {visit.client?.store_name || '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {visit.client?.contact_person || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {visit.rep_name || currentUser.name || '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t('salesRepresentative') || 'Sales Rep'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {visit.client?.business_type?.name_en || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(visit.status)}`}>
                      {t(visit.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {visit.preferred_shoot_date ? formatDate(visit.preferred_shoot_date) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedVisit(visit)}
                        className="text-blue-600 hover:text-blue-900"
                        title={t('viewDetails')}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {(isSalesRep || isAdmin) && visit.status === 'draft' && (
                        <button
                          onClick={() => setEditingVisit(visit)}
                          className="text-green-600 hover:text-green-900"
                          title={t('edit')}
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Visit Form Modal - Create */}
      {showCreateForm && (
        <VisitForm
          language={language}
          currentUser={currentUser}
          t={t}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            loadVisits();
            setShowCreateForm(false);
          }}
        />
      )}

      {/* Visit Form Modal - Edit */}
      {editingVisit && (
        <VisitForm
          language={language}
          currentUser={currentUser}
          t={t}
          editVisit={editingVisit}
          onClose={() => setEditingVisit(null)}
          onSuccess={() => {
            loadVisits();
            setEditingVisit(null);
          }}
        />
      )}

      {/* Visit Detail View Modal */}
      {selectedVisit && !editingVisit && (
        <VisitDetailView
          visit={selectedVisit}
          language={language}
          t={t}
          currentUser={currentUser}
          onStatusUpdate={handleStatusUpdate}
          onAddNotes={handleAddNotes}
          onClose={() => setSelectedVisit(null)}
        />
      )}
    </div>
  );
};

export default SalesVisitManagement;
