import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguageStore } from "@/hooks/use-language";
import { dashboardService, type ExtendedDashboardStats } from "@/lib/dashboardApi";
import { requestService } from "@/lib/requestsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { CustomCard } from "@/components/ui/custom-card";
import { 
  Activity, 
  ArrowRight, 
  FileText, 
  Plus, 
  TrendingUp,
  Clock,
  DollarSign,
  CheckSquare,
  AlertTriangle,
  BarChart3,
  Briefcase,
  LineChart,
  Sparkles,
  Star
} from "lucide-react";
import { 
  DashboardStats, 
  ProjectRequest, 
  Request, 
  RequestType 
} from "@/types";
import { formatDistanceToNow } from "date-fns";
import RoleGuard from "@/components/auth/RoleGuard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import UserDashboard from "@/components/dashboard/UserDashboard";

// Default stats for fallback
const defaultStats: ExtendedDashboardStats = {
  totalPRs: 0,
  pendingApprovals: 0,
  approvedThisMonth: 0,
  averageApprovalTime: 0,
  budgetUtilization: 0,
  totalProjects: 0,
  totalProjectValue: 0,
  totalProjectBenefit: 0,
  projectsCompletionRate: 0,
  recentActivity: []
};

// We'll fetch real data from API instead of using mock data

export default function Dashboard() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { direction } = useLanguageStore();
  const [selectedRequestType, setSelectedRequestType] = useState<RequestType | "all">("all");
  const [stats, setStats] = useState<ExtendedDashboardStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);

  // Fetch dashboard stats and recent requests on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch dashboard stats, recent activity, and recent requests
        const [dashboardStats, recentActivity, recent] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRecentActivity(5),
          requestService.getRequests({ per_page: 5 })
        ]);
        
        setStats({ ...defaultStats, ...dashboardStats, recentActivity });
        setRecentRequests(recent || []);
        
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setStats(defaultStats);
        setRecentRequests([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Note: filteredRequests can be used for future filtering functionality

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'DRAFT': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
      case 'SUBMITTED': return 'bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200';
      case 'DM_APPROVED': return 'bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200';
      case 'ACCT_APPROVED': return 'bg-purple-100 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200';
      case 'FINAL_APPROVED': return 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200';
      case 'FUNDS_TRANSFERRED': return 'bg-cyan-100 dark:bg-cyan-800/50 text-cyan-800 dark:text-cyan-200';
      default: return 'bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-200';
    }
  };
  
  // Get request type badge color
  const getRequestTypeColor = (type: RequestType) => {
    switch (type) {
      case 'purchase': return 'bg-indigo-100 dark:bg-indigo-800/50 text-indigo-800 dark:text-indigo-200';
      case 'project': return 'bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`page-header flex items-center ${direction === 'rtl' ? 'flex-row-reverse' : ''} justify-between`}>
        <div className="text-start">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.welcome')}, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Request Type Filter */}
          <div className="flex items-center">
            <select 
              className="border border-input rounded px-3 py-1 bg-background text-foreground text-sm"
              value={selectedRequestType}
              onChange={(e) => setSelectedRequestType(e.target.value as RequestType | "all")}
            >
              <option value="all">{t('dashboard.filters.allRequests')}</option>
              <option value="purchase">{t('dashboard.filters.purchaseRequests')}</option>
              <option value="project">{t('dashboard.filters.projectRequests')}</option>
            </select>
          </div>
          
          <RoleGuard allowedRoles={['USER']}>
            <Button asChild>
              <Link to="/prs/create">
                <Plus className="mr-2 h-4 w-4" />
                {t('nav.createPR')}
              </Link>
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Role-based Dashboard Content */}
      {user?.role === 'ADMIN' ? (
        <AdminDashboard stats={{ ...stats, recentActivity: (stats.recentActivity || []).map((a: any) => ({
          id: String(a.id),
          userId: String(a.user_id || a.userId || ''),
          user: a.user,
          action: String(a.action || ''),
          entityType: String(a.entity_type || a.entityType || 'Request'),
          entityId: String(a.entity_id || a.entityId || ''),
          meta: a.meta,
          ip: a.ip,
          userAgent: a.user_agent || a.userAgent,
          createdAt: new Date(a.created_at || a.createdAt || Date.now())
        })) } as unknown as DashboardStats} isLoading={isLoading} />
      ) : user?.role === 'USER' ? (
        <UserDashboard stats={{ ...stats, recentActivity: (stats.recentActivity || []).map((a: any) => ({
          id: String(a.id),
          userId: String(a.user_id || a.userId || ''),
          user: a.user,
          action: String(a.action || ''),
          entityType: String(a.entity_type || a.entityType || 'Request'),
          entityId: String(a.entity_id || a.entityId || ''),
          meta: a.meta,
          ip: a.ip,
          userAgent: a.user_agent || a.userAgent,
          createdAt: new Date(a.created_at || a.createdAt || Date.now())
        })) } as unknown as DashboardStats} isLoading={isLoading} />
      ) : (
        // Default stats for managers/approvers
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalPRs')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : (stats.totalRequests || stats.totalPRs || stats.totalSystemRequests || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.fromLastMonth')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.pendingApprovals')}</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : (stats.pendingApprovals || stats.pendingRequests || stats.pendingSystemApprovals || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.requiresAttention')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.approvedThisMonth')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : (stats.approvedThisMonth || stats.approvedRequests || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.fromLastMonth')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.budgetUtilization')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : `${stats.budgetUtilization || 0}%`}
            </div>
            <Progress value={stats.budgetUtilization || 0} className="mt-2" />
            {(stats.budgetUtilization || 0) > 80 && (
              <div className="flex items-center mt-2 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t('dashboard.approachingBudget')}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}
      
      {/* Project Request Stats */}
      {(selectedRequestType === 'all' || selectedRequestType === 'project') && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalProjects')}</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : (stats.totalProjects || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.activeProjects')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalProjectValue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : formatCurrency(stats.totalProjectValue ?? 0, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.estimatedValue')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.totalProjectBenefit')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : formatCurrency(stats.totalProjectBenefit ?? 0, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.projectedBenefit')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.projectsCompletionRate')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : `${stats.projectsCompletionRate || 0}%`}
              </div>
              <Progress value={stats.projectsCompletionRate || 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent PRs */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className={`flex flex-row items-center ${direction === 'rtl' ? 'flex-row-reverse' : ''} justify-between`}>
              <CardTitle className="flex items-center gap-2">
                <FileText className={`h-5 w-5 ${direction === 'rtl' ? 'ml-2' : 'mr-0'}`} />
                {t('dashboard.recentRequests')}
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/prs">
                  {t('dashboard.viewAll')}
                  <ArrowRight className={`${direction === 'rtl' ? 'mr-1 rtl-flip' : 'ml-1'} h-4 w-4`} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentRequests.length > 0 ? recentRequests.map((pr) => (
                <div key={pr.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:border-gray-700 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{pr.title}</h4>
                      <Badge className={getStateColor(pr.state)}>
                        {pr.state.replace('_', ' ')}
                      </Badge>
                      <Badge className={getRequestTypeColor(pr.type)}>
                        {t(`dashboard.requestType.${pr.type}`)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{pr.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatCurrency(pr.desired_cost, pr.currency)}</span>
                      <span>•</span>
                      {pr.type === 'project' && (
                        <>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {t('dashboard.client')}: {(pr as ProjectRequest).client_name}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}</span>
                      <span>•</span>
                      <span>{t('common.by')} {pr.requester?.name}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-100" asChild>
                    <Link to={`/prs/${pr.id}`}>{t('dashboard.view')}</Link>
                  </Button>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent requests</p>
                  <RoleGuard allowedRoles={['USER']}>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link to="/prs/create">
                        <Plus className="mr-2 h-4 w-4" />
                        {t('dashboard.createNewRequest')}
                      </Link>
                    </Button>
                  </RoleGuard>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className={`h-5 w-5 ${direction === 'rtl' ? 'ml-0' : 'mr-0'}`} />
                {t('dashboard.recentActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(stats.recentActivity || []).map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 last:pb-0 border-b last:border-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user?.avatar} />
                      <AvatarFallback className="text-xs">
                        {activity.user ? getInitials(activity.user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{activity.user?.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.action}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {String(activity.entity_type || 'Request')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {activity.action} on {String(activity.entity_type || 'entity')} #{String(activity.entity_id || '').slice(-3)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Insights */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className={`${direction === 'rtl' ? 'text-right w-full' : ''}`}>{t('dashboard.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <RoleGuard allowedRoles={['USER']}>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/prs/create">
                    <Plus className={`${direction === 'rtl' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                    {t('dashboard.createNewRequest')}
                  </Link>
                </Button>
              </RoleGuard>
              
              <RoleGuard allowedRoles={['DIRECT_MANAGER', 'ACCOUNTANT', 'FINAL_MANAGER']}>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/approvals">
                    <CheckSquare className={`${direction === 'rtl' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                    {t('dashboard.reviewPending')} ({stats.pendingApprovals || 0})
                  </Link>
                </Button>
              </RoleGuard>
              
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/prs">
                  <FileText className={`${direction === 'rtl' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                  {t('dashboard.myRequests')}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${direction === 'rtl' ? 'justify-end' : ''}`}>
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" />
                {t('dashboard.insights')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800/80">
                <div className={`flex items-center gap-2 mb-1 ${direction === 'rtl' ? 'justify-end' : ''}`}>
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">{t('dashboard.approvalRate')}</span>
                </div>
                <p className={`text-xs text-gray-600 dark:text-gray-300 ${direction === 'rtl' ? 'text-right' : ''}`}>
                  {t('dashboard.approvalRateDesc')}
                </p>
              </div>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800/80">
                <div className={`flex items-center gap-2 mb-1 ${direction === 'rtl' ? 'justify-end' : ''}`}>
                  <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{t('dashboard.budgetAlert')}</span>
                </div>
                <p className={`text-xs text-gray-600 dark:text-gray-300 ${direction === 'rtl' ? 'text-right' : ''}`}>
                  {t('dashboard.budgetAlertDesc')}
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800/80">
                <div className={`flex items-center gap-2 mb-1 ${direction === 'rtl' ? 'justify-end' : ''}`}>
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{t('dashboard.performance')}</span>
                </div>
                <p className={`text-xs text-gray-600 dark:text-gray-300 ${direction === 'rtl' ? 'text-right' : ''}`}>
                  {t('dashboard.performanceDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* New Featured Insights Section using CustomCard */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">{t('dashboard.featuredInsights')}</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <CustomCard 
            title={t('dashboard.performanceMetrics')} 
            subtitle={t('dashboard.performanceMetricsDesc')}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">{t('dashboard.approvalEfficiency')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-blue-500">94%</span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">+5%</span>
                </div>
              </div>
              <div className="h-2 w-full bg-blue-100 dark:bg-blue-900/30 rounded">
                <div className="h-2 bg-blue-500 dark:bg-blue-400 rounded" style={{ width: '94%' }}></div>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">{t('dashboard.costOptimization')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-amber-500">82%</span>
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded">+2%</span>
                </div>
              </div>
              <div className="h-2 w-full bg-amber-100 dark:bg-amber-900/30 rounded">
                <div className="h-2 bg-amber-500 dark:bg-amber-400 rounded" style={{ width: '82%' }}></div>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{t('dashboard.userSatisfaction')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-green-500">88%</span>
                  <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded">+7%</span>
                </div>
              </div>
              <div className="h-2 w-full bg-green-100 dark:bg-green-900/30 rounded">
                <div className="h-2 bg-green-500 dark:bg-green-400 rounded" style={{ width: '88%' }}></div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border/40">
              <Button variant="outline" size="sm" className="w-full">
                {t('dashboard.viewDetailedAnalytics')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CustomCard>
          
          <CustomCard 
            title={t('dashboard.resourceAllocation')} 
            subtitle={t('dashboard.resourceAllocationDesc')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/80 border border-border/30 rounded-lg p-3 text-center">
                  <DollarSign className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                  <div className="text-xl font-bold">$178,400</div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.totalBudget')}</div>
                </div>
                <div className="bg-background/80 border border-border/30 rounded-lg p-3 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-1 text-green-500" />
                  <div className="text-xl font-bold">$82,150</div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.availableFunds')}</div>
                </div>
                <div className="bg-background/80 border border-border/30 rounded-lg p-3 text-center">
                  <CheckSquare className="h-6 w-6 mx-auto mb-1 text-purple-500" />
                  <div className="text-xl font-bold">31</div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.completedRequests')}</div>
                </div>
                <div className="bg-background/80 border border-border/30 rounded-lg p-3 text-center">
                  <Clock className="h-6 w-6 mx-auto mb-1 text-amber-500" />
                  <div className="text-xl font-bold">2.8 {t('dashboard.days')}</div>
                  <div className="text-xs text-muted-foreground">{t('dashboard.avgProcessTime')}</div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 p-3 rounded-lg border border-blue-200/30 dark:border-blue-800/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('dashboard.budgetForecast')}</span>
                  <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700">Q3 2024</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.budgetForecastDesc')}
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border/40">
              <Button variant="outline" size="sm" className="w-full">
                {t('dashboard.viewResourceDashboard')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CustomCard>
        </div>
      </div>
    </div>
  );
}