import { Bell, Check, X, Clock, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { notificationsApi, type NotificationItem } from "@/lib/notificationsApi";

function formatRelativeTime(iso: string, t: (k: any) => string) {
  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return t('notifications.time.seconds').replace('{value}', String(diffSec));
  if (diffMin < 60) return t('notifications.time.minutes').replace('{value}', String(diffMin));
  if (diffHr < 24) return t('notifications.time.hours').replace('{value}', String(diffHr));
  return t('notifications.time.days').replace('{value}', String(diffDay));
}

type UIMessage = { title: string; message?: string; icon: any; color: string };

function mapNotificationToUI(n: NotificationItem, t: (k: any) => string): UIMessage {
  // Default mapping; can be refined by n.type and n.data
  let icon = Bell;
  let color = 'text-blue-500';
  if (n.type?.toLowerCase().includes('approve') || n.data?.status === 'APPROVED') {
    icon = Check; color = 'text-green-500';
  } else if (n.type?.toLowerCase().includes('reject') || n.data?.status === 'REJECTED') {
    icon = X; color = 'text-red-500';
  } else if (n.type?.toLowerCase().includes('assign')) {
    icon = User; color = 'text-purple-500';
  } else if (n.type?.toLowerCase().includes('remind')) {
    icon = Clock; color = 'text-orange-500';
  } else if (n.type?.toLowerCase().includes('request')) {
    icon = FileText; color = 'text-blue-500';
  }

  // Text: prefer data.title/message or fallback
  const title = n.data?.title || t('notifications.generic.title');
  const message = n.data?.message || n.data?.body || t('notifications.generic.message');

  return { title, message, icon, color };
}

export function NotificationDropdown() {
  const { t } = useTranslation();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  const refresh = async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        notificationsApi.list({ per_page: 20 }),
        notificationsApi.unreadCount(),
      ]);
      setItems(list.items);
      setUnread(count);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const markAsRead = async (id: string) => {
    await notificationsApi.markAsRead(id);
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllAsRead = async () => {
    await notificationsApi.markAllAsRead();
    setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
  };

  const unreadCount = useMemo(() => items.filter(n => !n.read_at).length || unread, [items, unread]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs min-w-[20px] rounded-full bg-destructive text-destructive-foreground border-2 border-background">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="font-semibold">{t('common.notifications')}</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs h-auto p-1"
            >
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {items.length > 0 ? (
            items.map((n) => {
              const ui = mapNotificationToUI(n, t);
              const IconComponent = ui.icon;
              return (
                <DropdownMenuItem
                  key={n.id}
                  className="flex items-start p-4 cursor-pointer"
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex-shrink-0 mr-3 rtl:mr-0 rtl:ml-3 mt-1">
                    <div className={`p-2 rounded-full bg-muted`}>
                      <IconComponent className={`h-4 w-4 ${ui.color}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${!n.read_at ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {ui.title}
                      </p>
                      {!n.read_at && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 rtl:ml-0 rtl:mr-2"></div>
                      )}
                    </div>
                    {ui.message && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {ui.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(n.created_at, t)}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('notifications.empty')}</p>
            </div>
          )}
        </ScrollArea>
        {items.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                {t('notifications.viewAll')}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}