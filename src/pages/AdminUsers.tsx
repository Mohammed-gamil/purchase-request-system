import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  Mail,
  Calendar,
  Shield,
  Users,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ar as arSA } from "date-fns/locale";
import { User, UserRole } from "@/types";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/use-translation";
import { adminService } from "@/lib/adminApi";

export default function AdminUsers() {
  const { t, language } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "password123", // Default password
    role: "USER" as UserRole,
    first_name: "",
    last_name: "",
    phone: "",
    position: "",
    language_preference: "en",
    timezone: "UTC",
    currency: "USD"
  });

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const fetchedUsers = await adminService.getUsers({
          per_page: 50,
          search: searchTerm,
          role: roleFilter === "all" ? undefined : roleFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
        });
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to fetch users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [searchTerm, roleFilter, statusFilter]);

  const stats = [
    { title: t('admin.users.stats.total'), value: users.length, icon: Users },
    { title: t('admin.users.stats.active'), value: users.filter(u => u.status === "active").length, icon: UserCheck },
    { title: t('admin.users.stats.inactive'), value: users.filter(u => u.status === "inactive").length, icon: UserX },
    { title: t('admin.users.stats.admins'), value: users.filter(u => u.role === "ADMIN").length, icon: Shield }
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateUser = async () => {
    try {
      setIsCreating(true);
      await adminService.createUser(newUser);
      toast.success(t('admin.users.toast.created').replace('{name}', newUser.name));
      setIsCreateDialogOpen(false);
      setNewUser({
        name: "",
        email: "",
        password: "password123",
        role: "USER",
        first_name: "",
        last_name: "",
        phone: "",
        position: "",
        language_preference: "en",
        timezone: "UTC",
        currency: "USD"
      });
      // Refresh users list
      const fetchedUsers = await adminService.getUsers({ per_page: 50 });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      setIsUpdating(true);
      await adminService.updateUser(selectedUser.id.toString(), {
        name: selectedUser.name,
        role: selectedUser.role,
        position: selectedUser.position,
      });
      toast.success(t('admin.users.toast.updated'));
      setIsEditDialogOpen(false);
      // Refresh users list
      const fetchedUsers = await adminService.getUsers({ per_page: 50 });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminService.deleteUser(userId);
      toast.success(t('admin.users.toast.deleted'));
      // Refresh users list
      const fetchedUsers = await adminService.getUsers({ per_page: 50 });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await adminService.toggleUserStatus(userId);
      toast.success(t('admin.users.toast.statusUpdated'));
      // Refresh users list
      const fetchedUsers = await adminService.getUsers({ per_page: 50 });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "ADMIN": return "destructive";
      case "FINAL_MANAGER": return "default";
      case "DIRECT_MANAGER": return "secondary";
      case "ACCOUNTANT": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('admin.users.title')}</h1>
          <p className="text-muted-foreground">
            {t('admin.users.subtitle')}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.users.addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.users.createDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('admin.users.createDialog.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('admin.users.createDialog.fullName')}</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('admin.users.createDialog.fullNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('admin.users.createDialog.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t('admin.users.createDialog.emailPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('admin.users.createDialog.role')}</Label>
                <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">{t('roles.USER')}</SelectItem>
                    <SelectItem value="DIRECT_MANAGER">{t('roles.DIRECT_MANAGER')}</SelectItem>
                    <SelectItem value="ACCOUNTANT">{t('roles.ACCOUNTANT')}</SelectItem>
                    <SelectItem value="FINAL_MANAGER">{t('roles.FINAL_MANAGER')}</SelectItem>
                    <SelectItem value="ADMIN">{t('roles.ADMIN')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateUser} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('admin.users.createDialog.createUser')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.users.list.title')}</CardTitle>
          <CardDescription>
            {t('admin.users.list.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.users.list.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('admin.users.list.filterRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.users.list.allRoles')}</SelectItem>
                <SelectItem value="USER">{t('roles.USER')}</SelectItem>
                <SelectItem value="DIRECT_MANAGER">{t('roles.DIRECT_MANAGER')}</SelectItem>
                <SelectItem value="ACCOUNTANT">{t('roles.ACCOUNTANT')}</SelectItem>
                <SelectItem value="FINAL_MANAGER">{t('roles.FINAL_MANAGER')}</SelectItem>
                <SelectItem value="ADMIN">{t('roles.ADMIN')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('admin.users.list.filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.users.list.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('admin.users.list.statusActive')}</SelectItem>
                <SelectItem value="inactive">{t('admin.users.list.statusInactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading users...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      {t('admin.users.list.lastLogin')}: {user.last_login_at ? format(new Date(user.last_login_at), "MMM dd, yyyy", { locale: language === 'ar' ? arSA : undefined }) : t('admin.users.list.never')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {t((`roles.${user.role}`) as any)}
                  </Badge>
                  <Badge variant={user.status === "active" ? "default" : "secondary"}>
                    {user.status === 'active' ? t('admin.users.list.statusActive') : t('admin.users.list.statusInactive')}
                  </Badge>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(user.id)}
                    >
                      {user.status === "active" ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.editDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('admin.users.editDialog.description')}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('admin.users.createDialog.fullName')}</Label>
                <Input
                  id="edit-name"
                  defaultValue={selectedUser.name}
                  placeholder={t('admin.users.createDialog.fullNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">{t('admin.users.createDialog.email')}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  defaultValue={selectedUser.email}
                  placeholder={t('admin.users.createDialog.emailPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">{t('admin.users.createDialog.role')}</Label>
                <Select defaultValue={selectedUser.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">{t('roles.USER')}</SelectItem>
                    <SelectItem value="DIRECT_MANAGER">{t('roles.DIRECT_MANAGER')}</SelectItem>
                    <SelectItem value="ACCOUNTANT">{t('roles.ACCOUNTANT')}</SelectItem>
                    <SelectItem value="FINAL_MANAGER">{t('roles.FINAL_MANAGER')}</SelectItem>
                    <SelectItem value="ADMIN">{t('roles.ADMIN')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('admin.users.editDialog.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
