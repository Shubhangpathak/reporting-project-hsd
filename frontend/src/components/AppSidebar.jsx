import {
  Building2,
  Check,
  ChevronsUpDown,
  LogOut,
  Moon,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "next-themes";
import { NavLink } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import logo from "@/images/logo_hsd.webp";

function initials(name, email) {
  return (name || email)
    .split(/\s+|@/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AppSidebar({ session, onOrganizationChange, onLogout, busy }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { user, organizations, activeOrganization } = session;
  const isAdmin = user.role === "platform_admin";
  const isDark = resolvedTheme === "dark";
  const home = isAdmin ? "/admin" : "/dashboard";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 border-b border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="px-1">
              <NavLink to={home}>
              <span className="flex size-8 items-center justify-center">
                  <img src={logo} alt="" className="size-6 object-contain" />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Health Scale Digital</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {isAdmin ? "Administrator" : "Digital reporting"}
                  </span>
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              variant="outline"
              className="h-9 gap-2 px-2 data-[state=open]:bg-sidebar-accent"
              disabled={busy || (!isAdmin && organizations.length < 2)}
            >
              <Building2 className="text-primary" />
              <span className="flex-1 truncate">
                {activeOrganization?.name || (isAdmin ? "All organizations" : "Choose organization")}
              </span>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-60">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {isAdmin && (
              <DropdownMenuItem onSelect={() => onOrganizationChange(null)}>
                <Building2 />
                <span className="flex-1">All organizations</span>
                {!activeOrganization && <Check />}
              </DropdownMenuItem>
            )}
            {organizations.map((organization) => (
              <DropdownMenuItem
                key={organization.id}
                onSelect={() => onOrganizationChange(organization.id)}
              >
                <Building2 />
                <span className="flex-1 truncate">{organization.name}</span>
                {activeOrganization?.id === organization.id && <Check />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent />

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="px-1 data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                      {initials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium">{user.name || "HSD user"}</span>
                      {isAdmin && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="shrink-0 text-primary">
                              <ShieldCheck className="size-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">Platform administrator</TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/60">{user.email}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="min-w-56">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setTheme(isDark ? "light" : "dark");
                  }}
                >
                  <Moon />
                  <span className="flex-1">Dark mode</span>
                  <Switch checked={isDark} className="pointer-events-none" aria-label="Dark mode" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onLogout} variant="destructive">
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
