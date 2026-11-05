import { Brand } from "./Brand";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wallet,
  KeyRound,
  Building2,
  BookOpen,
  Ticket,
  BarChart3,
  FileText,
  Menu,
  X,
  PanelLeftClose,
} from "lucide-react";
import { config } from "../data/config";
import { roleName, type Role } from "../data/users";
const paths = [
  "/workspace",
  "/customers",
  "/collections",
  "/handover-registration",
  "/projects",
  "/faqs",
  "/tickets",
  "/reports",
  "/escalations",
];
const icons = [
  LayoutDashboard,
  Users,
  Wallet,
  KeyRound,
  Building2,
  BookOpen,
  Ticket,
  BarChart3,
  FileText,
];
function NavigationLinks({ role, close }: { role: Role; close?: () => void }) {
  return (
    <nav aria-label="Main navigation">
      {config.role_permission[role].map((name, index) => {
        const Icon = icons[index];
        return (
          <NavLink key={name} to={paths[index]} title={name} onClick={close}>
            <Icon size={19} />
            <span>{name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
export function DesktopNavigation({
  role,
  collapsed,
  toggle,
}: {
  role: Role;
  collapsed: boolean;
  toggle: () => void;
}) {
  return (
    <aside className="desktop-sidebar">
      <Brand />
      <small className="nav-label">{roleName(role).toUpperCase()}</small>
      <NavigationLinks role={role} />
      <div className="sidebar-bottom">
        <div className="demo-dot" />
        <span>Demo workspace</span>
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="icon"
          onClick={toggle}
        >
          <PanelLeftClose size={18} />
        </button>
      </div>
    </aside>
  );
}
export function MobileNavigation({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1025px)");
    const closeOnDesktop = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="mobile-menu-trigger icon"
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="navigation-overlay" />
        <Dialog.Content className="mobile-navigation">
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            {roleName(role)} workspace navigation
          </Dialog.Description>
          <Brand />
          <Dialog.Close
            className="icon navigation-close"
            aria-label="Close navigation"
          >
            <X size={22} />
          </Dialog.Close>
          <small className="nav-label">{roleName(role).toUpperCase()}</small>
          <NavigationLinks role={role} close={() => setOpen(false)} />
          <div className="sidebar-bottom">
            <div className="demo-dot" />
            <span>Demo workspace</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
