import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Clock, 
  CheckSquare, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { DashboardStats } from "@/types";
import { useTranslation } from "@/hooks/use-translation";

interface UserDashboardProps {
  stats: DashboardStats;
  isLoading: boolean;
}

export default function UserDashboard({ stats, isLoading }: UserDashboardProps) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* User Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : (stats.totalRequests || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              All time requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {isLoading ? "..." : (stats.pendingRequests || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? "..." : (stats.approvedRequests || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatCurrency(stats.totalSpent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              This year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Request Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stats.approvedRequests || 0}</span>
                <span className="text-xs text-muted-foreground">
                  ({((stats.approvedRequests || 0) / Math.max(stats.totalRequests || 1, 1) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
            <Progress 
              value={(stats.approvedRequests || 0) / Math.max(stats.totalRequests || 1, 1) * 100} 
              className="h-2" 
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
                <span className="text-sm">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stats.pendingRequests || 0}</span>
                <span className="text-xs text-muted-foreground">
                  ({((stats.pendingRequests || 0) / Math.max(stats.totalRequests || 1, 1) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
            <Progress 
              value={(stats.pendingRequests || 0) / Math.max(stats.totalRequests || 1, 1) * 100} 
              className="h-2" 
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">Rejected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stats.rejectedRequests || 0}</span>
                <span className="text-xs text-muted-foreground">
                  ({((stats.rejectedRequests || 0) / Math.max(stats.totalRequests || 1, 1) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
            <Progress 
              value={(stats.rejectedRequests || 0) / Math.max(stats.totalRequests || 1, 1) * 100} 
              className="h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Success Rate
                </span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {((stats.approvedRequests || 0) / Math.max(stats.totalRequests || 1, 1) * 100).toFixed(0)}%
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Avg Request Value
                </span>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency((stats.totalSpent || 0) / Math.max(stats.totalRequests || 1, 1))}
              </span>
            </div>

            {(stats.rejectedRequests || 0) > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    Rejected Requests
                  </span>
                </div>
                <span className="text-lg font-bold text-red-600">
                  {stats.rejectedRequests}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
