import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Calendar,
  DollarSign
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ar as arSA } from "date-fns/locale";
import { Request } from "@/types";
import { requestService } from "@/lib/requestsApi";
import { useTranslation } from "@/hooks/use-translation";

// Backend-driven pending approvals state
const isDate = (val: any) => val instanceof Date || (!isNaN(Date.parse(val)));

export default function Approvals() {
  const { t, language } = useTranslation();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created");
  const [pendingPRs, setPendingPRs] = useState<Request[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await requestService.getPendingApprovals();
        if (!cancelled) setPendingPRs(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load approvals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'DM_APPROVED': return 'bg-green-100 text-green-800';
      case 'ACCT_APPROVED': return 'bg-purple-100 text-purple-800';
      case 'FINAL_APPROVED': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getUrgencyLevel = (neededByDate: Date) => {
    const daysUntilNeeded = Math.ceil((neededByDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilNeeded <= 3) return { level: 'urgent', color: 'text-red-600', icon: AlertTriangle };
    if (daysUntilNeeded <= 7) return { level: 'medium', color: 'text-amber-600', icon: Clock };
    return { level: 'normal', color: 'text-green-600', icon: CheckCircle };
  };

  // Normalizers for backend fields
  const getIdText = (pr: any) => String(pr?.request_id ?? pr?.id ?? '');
  const getTitleText = (pr: any) => String(pr?.title ?? '');
  const getRequester = (pr: any) => pr?.requester;
  const getRequesterName = (pr: any) => String(getRequester(pr)?.name ?? '');
  const getCurrency = (pr: any) => String(pr?.currency ?? 'USD');
  const getDesiredCost = (pr: any) => Number(pr?.desired_cost ?? pr?.desiredCost ?? 0);
  const getStateVal = (pr: any) => String(pr?.state ?? '');
  const getCreatedAt = (pr: any) => new Date(pr?.created_at ?? pr?.createdAt ?? Date.now());
  const getNeededByDate = (pr: any) => {
    const d = pr?.needed_by_date ?? pr?.neededByDate;
    return d ? new Date(d) : new Date();
  };

  const getFilteredPRs = () => {
    let filtered: any[] = pendingPRs.slice();

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(pr =>
        getTitleText(pr).toLowerCase().includes(q) ||
        getIdText(pr).toLowerCase().includes(q) ||
        getRequesterName(pr).toLowerCase().includes(q)
      );
    }

    if (stateFilter !== 'all') {
      filtered = filtered.filter(pr => getStateVal(pr) === stateFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return getDesiredCost(b) - getDesiredCost(a);
        case 'urgency':
          return getNeededByDate(a).getTime() - getNeededByDate(b).getTime();
        case 'created':
        default:
          return getCreatedAt(b).getTime() - getCreatedAt(a).getTime();
      }
    });

    return filtered as Request[];
  };

  const filteredPRs = getFilteredPRs();

  const getPageTitle = () => {
    switch (user?.role) {
      case 'DIRECT_MANAGER':
        return t('nav.approvals');
      case 'ACCOUNTANT':
        return t('nav.approvals');
      case 'FINAL_MANAGER':
        return t('nav.approvals');
      default:
        return t('nav.approvals');
    }
  };

  const getPageDescription = () => {
    switch (user?.role) {
      case 'DIRECT_MANAGER':
        return t('dashboard.reviewPending');
      case 'ACCOUNTANT':
        return t('dashboard.reviewPending');
      case 'FINAL_MANAGER':
        return t('dashboard.reviewPending');
      default:
        return t('dashboard.reviewPending');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
        <p className="text-gray-600 mt-1">{getPageDescription()}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('common.pending')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '…' : filteredPRs.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.requiresAttention')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('common.priority.high')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '…' : filteredPRs.filter(pr => getUrgencyLevel(getNeededByDate(pr as any)).level === 'urgent').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('approvals.stats.urgentWithin3Days')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.totalSpend')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '…' : new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US').format(filteredPRs.reduce((sum, pr: any) => sum + getDesiredCost(pr), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.pendingApprovals')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('reports.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('common.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('reports.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="SUBMITTED">{t('status.SUBMITTED')}</SelectItem>
                <SelectItem value="DM_APPROVED">{t('status.DM_APPROVED')}</SelectItem>
                <SelectItem value="ACCT_APPROVED">{t('status.ACCT_APPROVED')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('common.filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">{t('prDetails.created')}</SelectItem>
                <SelectItem value="amount">{t('reports.totalSpend')}</SelectItem>
                <SelectItem value="urgency">{t('common.priority.high')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Approvals List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('nav.approvals')} ({filteredPRs.length})
          </CardTitle>
          <CardDescription>
            {t('dashboard.reviewPending')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
          )}
          {error && !loading && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && filteredPRs.length > 0 ? (
            <div className="space-y-4">
              {filteredPRs.map((pr: any) => {
                const neededDate = getNeededByDate(pr);
                const urgency = getUrgencyLevel(neededDate);
                const UrgencyIcon = urgency.icon;
                
                return (
                  <div key={getIdText(pr)} className="border rounded-lg p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{getTitleText(pr)}</h3>
                          <Badge className={getStateColor(getStateVal(pr))}>
                            {t((`status.${getStateVal(pr)}`) as any)}
                          </Badge>
                          <div className={`flex items-center gap-1 ${urgency.color}`}>
                            <UrgencyIcon className="h-4 w-4" />
                            <span className="text-xs font-medium capitalize">{urgency.level === 'urgent' ? t('common.priority.high') : urgency.level === 'medium' ? t('common.priority.medium') : t('common.priority.low')}</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">{String(pr?.description ?? '')}</p>
                        
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={getRequester(pr)?.avatar} />
                              <AvatarFallback className="text-xs">
                                {getRequesterName(pr).split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-gray-600">
                              {getRequesterName(pr)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {formatCurrency(getDesiredCost(pr), getCurrency(pr))}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>
                              {t('approvals.labels.due')} {format(neededDate, "MMM d", { locale: language === 'ar' ? arSA : undefined })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>
                              {formatDistanceToNow(getCreatedAt(pr), { addSuffix: true, locale: language === 'ar' ? arSA : undefined })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {language === 'ar' ? `${(pr as any)?.items?.length ?? 0} بند` : `${(pr as any)?.items?.length ?? 0} item${((pr as any)?.items?.length ?? 0) !== 1 ? 's' : ''}`}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500">
                            {String(pr?.category ?? '')}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500">
                            {t('approvals.labels.id')}: {getIdText(pr)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button asChild>
                          <Link to={`/prs/${getIdText(pr)}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('prDetails.review')}
                          </Link>
                        </Button>
                        
                        <div className="text-xs text-center text-gray-500">
                          {t('approvals.labels.sla')}: {Math.ceil((getNeededByDate(pr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} {language === 'ar' ? 'يوم' : 'days'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('approvals.empty.title')}
              </h3>
              <p className="text-gray-600">
                {searchQuery || stateFilter !== 'all' 
                  ? t('approvals.empty.filtered')
                  : t('approvals.empty.allCaughtUp')
                }
              </p>
              {(searchQuery || stateFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setStateFilter('all');
                  }}
                >
                  {t('common.reset')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
