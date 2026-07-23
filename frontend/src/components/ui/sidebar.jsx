import * as React from "react";
import { cva } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import { Slot } from "radix-ui";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const SidebarContext = React.createContext(null);
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_ICON = "3rem";

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider.");
  }

  return context;
}

function SidebarProvider({ defaultOpen = true, className, style, children, ...props }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);
  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((value) => !value);
    } else {
      setOpen((value) => !value);
    }
  }, [isMobile]);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const value = React.useMemo(() => ({
    isMobile,
    openMobile,
    setOpenMobile,
    state: open ? "expanded" : "collapsed",
    toggleSidebar,
  }), [isMobile, open, openMobile, toggleSidebar]);

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        style={{
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          ...style,
        }}
        className={cn("group/sidebar-wrapper flex min-h-svh w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({ className, children, ...props }) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          side="left"
          className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Application navigation and account controls.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === "collapsed" ? "icon" : ""}
      className="group peer hidden text-sidebar-foreground md:block"
    >
      <div className="relative w-(--sidebar-width) transition-[width] duration-200 group-data-[collapsible=icon]:w-(--sidebar-width-icon)" />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-10 hidden h-svh w-(--sidebar-width) border-r bg-sidebar transition-[width] duration-200 md:flex",
          "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
          className,
        )}
        {...props}
      >
        <div className="flex size-full flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function SidebarTrigger({ className, ...props }) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      aria-label="Toggle sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cn(
        "absolute inset-y-0 -right-4 z-20 hidden w-4 -translate-x-1/2 cursor-w-resize after:absolute after:inset-y-0 after:left-1/2 after:w-px hover:after:bg-sidebar-border sm:block",
        "group-data-[collapsible=icon]:cursor-e-resize",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }) {
  return (
    <main className={cn("relative flex min-w-0 flex-1 flex-col bg-background", className)} {...props} />
  );
}

function SidebarHeader({ className, ...props }) {
  return <div className={cn("flex flex-col gap-2 p-2", className)} {...props} />;
}

function SidebarContent({ className, ...props }) {
  return <div className={cn("min-h-0 flex-1 overflow-auto", className)} {...props} />;
}

function SidebarFooter({ className, ...props }) {
  return <div className={cn("flex flex-col gap-2 p-2", className)} {...props} />;
}

function SidebarMenu({ className, ...props }) {
  return <ul className={cn("flex min-w-0 flex-col gap-1", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }) {
  return <li className={cn("relative", className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
  "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
  {
    variants: {
      variant: {
        default: "",
        outline: "bg-background shadow-[0_0_0_1px_var(--sidebar-border)]",
      },
      size: {
        default: "h-8",
        lg: "h-12 group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function SidebarMenuButton({ asChild = false, variant, size, className, ...props }) {
  const Component = asChild ? Slot.Root : "button";

  return (
    <Component
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
};
