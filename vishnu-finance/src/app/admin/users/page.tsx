"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, PauseCircle, PlayCircle, ShieldAlert } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { formatDistanceToNowStrict } from "date-fns";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "SUPERUSER";
  isActive: boolean;
  status: "ACTIVE" | "FROZEN" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  documentsCount: number;
  transactionsCount: number;
  lastDocumentAt: string | null;
  lastTransactionAt: string | null;
  lastStatementAt: string | null;
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return `${date.toLocaleString()} (${formatDistanceToNowStrict(date, { addSuffix: true })})`;
};

export default function AdminUsersPage() {
  const { error: showError } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "USER" | "SUPERUSER">("ALL");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "frozen" | "suspended">("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const isRoleFilterValue = (value: string): value is "ALL" | "USER" | "SUPERUSER" =>
    value === "ALL" || value === "USER" || value === "SUPERUSER";
  const isStatusFilterValue = (value: string): value is "all" | "active" | "inactive" | "frozen" | "suspended" =>
    value === "all" || value === "active" || value === "inactive" || value === "frozen" || value === "suspended";

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter === "active" || statusFilter === "inactive") {
        params.set("status", statusFilter);
      } else if (statusFilter === "frozen") {
        params.set("userStatus", "FROZEN");
      } else if (statusFilter === "suspended") {
        params.set("userStatus", "SUSPENDED");
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load users");
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Admin users fetch failed:", error);
      showError("Error", "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => users, [users]);

  const handleStatusChange = async (user: AdminUser, updates: Partial<Pick<AdminUser, "isActive" | "status">>) => {
    setUpdatingUserId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(typeof updates.isActive !== "undefined" ? { isActive: updates.isActive } : {}),
          ...(updates.status ? { status: updates.status } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      await fetchUsers();
    } catch (error) {
      console.error("Update user status failed:", error);
      showError("Error", "Unable to update user status.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const renderStatusBadge = (user: AdminUser) => {
    if (!user.isActive) {
      return <Badge variant="destructive">deactivated</Badge>;
    }
    if (user.status === "SUSPENDED") {
      return <Badge variant="destructive">suspended</Badge>;
    }
    if (user.status === "FROZEN") {
      return <Badge variant="outline">frozen</Badge>;
    }
    return <Badge variant="secondary">active</Badge>;
  };

  const flagged = (user: AdminUser) => {
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    const now = Date.now();
    const rapidDocs = user.documentsCount > 100 && (!lastLogin || now - lastLogin.getTime() < 1000 * 60 * 60);
    return rapidDocs || user.status === "SUSPENDED" || !user.isActive;
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-lg font-bold leading-none tracking-tight flex items-center gap-2 font-display">
            <Users className="w-5 h-5 text-primary" />
            <span>Portal Users</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Inspect user accounts, roles, and recent activity across the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="w-full sm:w-56 bg-background/50 border-border/50 focus-visible:ring-primary/20 transition-all hover:bg-background/80"
          />
          <Select
            value={roleFilter}
            onValueChange={value => {
              if (isRoleFilterValue(value)) {
                setRoleFilter(value);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-40 bg-background/50 border-border/50 focus:ring-primary/20 hover:bg-background/80">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="USER">Users</SelectItem>
              <SelectItem value="SUPERUSER">Superusers</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={value => {
              if (isStatusFilterValue(value)) {
                setStatusFilter(value);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-40 bg-background/50 border-border/50 focus:ring-primary/20 hover:bg-background/80">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Apply
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-2xl shadow-sm overflow-hidden border-none">
        {loading ? (
          <div className="px-4 py-10 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            Loading users…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground text-sm">
            No users found for the current filters.
          </div>
        ) : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Documents</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Transactions</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Last Activity</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{user.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={user.role === "SUPERUSER" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/50 text-muted-foreground"}>
                          {user.role.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        {renderStatusBadge(user)}
                        {flagged(user) && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                            <ShieldAlert className="w-3 h-3" />
                            flagged
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{user.documentsCount}</span>
                        <br />
                        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
                          {formatDateTime(user.lastDocumentAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{user.transactionsCount}</span>
                        <br />
                        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
                          {formatDateTime(user.lastTransactionAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <div>{formatDateTime(user.lastLogin)}</div>
                        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
                          Statement: {formatDateTime(user.lastStatementAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {formatDateTime(user.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2 text-xs">
                          {user.isActive ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(user, { isActive: false })}
                              disabled={updatingUserId === user.id}
                              className="gap-1 h-7 text-xs hover:bg-destructive/10 hover:text-destructive"
                            >
                              <PauseCircle className="w-3 h-3" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(user, { isActive: true, status: "ACTIVE" })}
                              disabled={updatingUserId === user.id}
                              className="gap-1 h-7 text-xs hover:bg-emerald-500/10 hover:text-emerald-500"
                            >
                              <PlayCircle className="w-3 h-3" />
                              Activate
                            </Button>
                          )}
                          {user.status !== "FROZEN" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(user, { status: "FROZEN" })}
                              disabled={updatingUserId === user.id}
                              className="gap-1 h-7 text-xs"
                            >
                              Freeze
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(user, { status: "ACTIVE" })}
                              disabled={updatingUserId === user.id}
                              className="gap-1 h-7 text-xs"
                            >
                              Unfreeze
                            </Button>
                          )}
                          {user.status !== "SUSPENDED" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(user, { status: "SUSPENDED" })}
                              disabled={updatingUserId === user.id}
                              className="gap-1 h-7 text-xs hover:bg-destructive/10 hover:text-destructive"
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(user, { status: "ACTIVE" })}
                              disabled={updatingUserId === user.id}
                              className="gap-1 h-7 text-xs"
                            >
                              Reinstate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 xl:hidden px-4 pb-4">
              {filteredUsers.map(user => (
                <div key={user.id} className="rounded-xl border border-border/50 bg-background/50 p-4 shadow-sm space-y-3 backdrop-blur-sm">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{user.name || '—'}</p>
                        <p className="text-xs text-muted-foreground break-all">
                          {user.email}
                        </p>
                      </div>
                      <Badge variant="outline" className={user.role === "SUPERUSER" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/50 text-muted-foreground"}>
                        {user.role.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {renderStatusBadge(user)}
                      {flagged(user) && (
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                          <ShieldAlert className="w-3 h-3" /> flagged
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Docs: <span className="text-foreground font-medium">{user.documentsCount}</span> • Txns: <span className="text-foreground font-medium">{user.transactionsCount}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Last login: {formatDateTime(user.lastLogin)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Created: {formatDateTime(user.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {user.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(user, { isActive: false })}
                        disabled={updatingUserId === user.id}
                        className="flex-1 min-w-[100px] gap-1 h-8 bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      >
                        <PauseCircle className="w-3 h-3" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(user, { isActive: true, status: 'ACTIVE' })}
                        disabled={updatingUserId === user.id}
                        className="flex-1 min-w-[100px] gap-1 h-8 bg-background/50 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30"
                      >
                        <PlayCircle className="w-3 h-3" />
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(user, { status: user.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN' })}
                      disabled={updatingUserId === user.id}
                      className="flex-1 min-w-[80px] h-8 bg-background/50"
                    >
                      {user.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(user, { status: user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' })}
                      disabled={updatingUserId === user.id}
                      className="flex-1 min-w-[80px] h-8 bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    >
                      {user.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
