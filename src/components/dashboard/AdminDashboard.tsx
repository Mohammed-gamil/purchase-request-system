import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  FileText, 
  CheckSquare, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Activity,
  RefreshCw,
  Download,
  TrendingDown,
  UserPlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardStats, User } from "@/types";
import { useTranslation } from "@/hooks/use-translation";
import { adminService } from "@/lib/adminApi";
import toast from "react-hot-toast";

interface AdminDashboardProps {
  stats: DashboardStats;
  isLoading: boolean;
}

export default function AdminDashboard({ stats, isLoading }: AdminDashboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const fetchedUsers = await adminService.getUsers({ per_page: 5 });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    setIsRefreshing(false);
    toast.success('Users refreshed');
  };

  const handleDeactivate = async (userId: string) => {
    try {
      await adminService.toggleUserStatus(userId);
      toast.success('User status updated');
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted successfully');
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Admin Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL REQUESTS</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : (stats.totalSystemRequests || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PENDING</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : (stats.pendingSystemApprovals || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">APPROVED</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : (stats.approvedRequests || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TOTAL USERS</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? "..." : (stats.totalUsers || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Visits & Quick Actions Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales Visits Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SALES VISITS</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isLoading ? "..." : (stats.totalSalesVisits || 2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active Sales Reps
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QUICK ACTIONS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/requests/export')}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Requests
            </Button>
            <Button 
              variant="default" 
              className="w-full justify-start bg-orange-600 hover:bg-orange-700"
              onClick={() => navigate('/sales-visits')}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Manage Sales Visits
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? "..." : (stats.approvedThisMonth || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected This Month</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? "..." : (stats.rejectedThisMonth || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              -5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? "..." : "94%"}
            </div>
            <Progress value={94} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">98.5%</div>
              <p className="text-sm text-muted-foreground">System Uptime</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">2.3s</div>
              <p className="text-sm text-muted-foreground">Avg Response Time</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.activeUsers || 0}</div>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Users Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Current Users
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage user accounts and roles
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                size="sm"
                onClick={() => navigate('/admin/users')}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.position || 'Sales Representative'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge 
                      variant={
                        user.role === 'ADMIN' ? 'destructive' :
                        user.role === 'FINAL_MANAGER' ? 'default' :
                        user.role === 'DIRECT_MANAGER' ? 'secondary' :
                        'outline'
                      }
                    >
                      {user.role.replace('_', ' ')}
                    </Badge>
                    <Badge 
                      variant={user.status === "active" ? "default" : "secondary"}
                    >
                      {user.status}
                    </Badge>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeactivate(user.id)}
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-center pt-4">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/admin/users')}
                >
                  View All Users
                  <TrendingUp className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
