import React from 'react';
import { Bell, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const sample = [
  { id: 1, title: 'New rating received', detail: '5★ on “Ivory Crucifix”', time: '2m' },
  { id: 2, title: 'Artifact published', detail: '“Silver Chalice” is now live', time: '1h' },
  { id: 3, title: 'New user signed up', detail: 'maria.santos@example.com', time: '3h' },
];

export default function NotificationDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl border border-border bg-muted/30 hover:bg-muted/60"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 rounded-2xl border-border bg-popover/95 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
          Notifications
          <button className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground/80 hover:text-foreground">
            <Check className="h-3 w-3" /> Mark all read
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sample.map((n) => (
          <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2.5">
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-medium text-foreground">{n.title}</span>
              <span className="text-[10px] text-muted-foreground">{n.time}</span>
            </div>
            <span className="text-xs text-muted-foreground">{n.detail}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
