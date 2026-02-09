"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { useToast } from "@/contexts/ToastContext";

type AuditRecord = {
  id: string;
  event: string;
  severity: "INFO" | "WARN" | "ALERT";
  message: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; email: string; name: string | null } | null;
  targetUser: { id: string; email: string; name: string | null } | null;
};

const severityVariant: Record<AuditRecord["severity"], "default" | "secondary" | "destructive"> = {
  INFO: "secondary",
  WARN: "default",
  ALERT: "destructive",
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return `${date.toLocaleString()} (${formatDistanceToNowStrict(date, { addSuffix: true })})`;
};

export default function AdminAuditPage() {
  const { error: showError } = useToast();
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    event: "",
    severity: "ALL",
    actor: "",
    target: "",
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.event) params.set("event", filters.event);
      if (filters.severity !== "ALL") params.set("severity", filters.severity);
      if (filters.actor) params.set("actor", filters.actor);
      if (filters.target) params.set("target", filters.target);

      const response = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 409) {
          const data = await response.json().catch(() => ({ error: 'Audit log storage not available yet.' }));
          showError('Audit storage unavailable', data.error || 'Run the latest database migrations to enable auditing.');
          setLogs([]);
          return;
        }
        throw new Error('Failed to load logs');
      }
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Audit log fetch failed:", error);
      showError("Error", "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const highlightSuspicious = useMemo(
    () =>
      logs.filter(
        log =>
          log.severity === "ALERT" ||
          log.event === "USER_STATUS_CHANGE" ||
          log.event === "DOCUMENT_DELETE" ||
          log.event === "BANK_MAPPING_DELETE",
      ).slice(0, 5),
    [logs],
  );

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col gap-1.5 mb-2">
          <h3 className="text-lg font-bold leading-none tracking-tight font-display">Audit Overview</h3>
          <p className="text-sm text-muted-foreground">
            Monitor user and admin activity across the platform. Suspicious events are highlighted for quick review.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {highlightSuspicious.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No suspicious events detected in the recent log window.</p>
          ) : (
            <div className="space-y-2">
              {highlightSuspicious.map(log => (
                <div key={log.id} className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">{log.event}</Badge>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(log.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Actor: <span className="text-foreground">{log.actor?.email ?? "unknown"}</span> • Target: <span className="text-foreground">{log.targetUser?.email ?? log.targetUser?.name ?? "n/a"}</span>
                    </p>
                    {log.message && <p className="text-xs text-foreground mt-1">{log.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-base font-bold leading-none tracking-tight font-display">Filters</h3>
          <p className="text-xs text-muted-foreground">Refine audit results by actor, event, or severity.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Input
            value={filters.event}
            onChange={e => setFilters(prev => ({ ...prev, event: e.target.value }))}
            placeholder="Event (e.g. DOCUMENT_DELETE)"
            className="w-full sm:w-56 bg-background/50 border-border/50 focus-visible:ring-primary/20 hover:bg-background/80"
          />
          <Select value={filters.severity} onValueChange={value => setFilters(prev => ({ ...prev, severity: value }))}>
            <SelectTrigger className="w-full sm:w-40 bg-background/50 border-border/50 focus:ring-primary/20 hover:bg-background/80">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All severities</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
              <SelectItem value="WARN">Warn</SelectItem>
              <SelectItem value="ALERT">Alert</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={filters.actor}
            onChange={e => setFilters(prev => ({ ...prev, actor: e.target.value }))}
            placeholder="Actor email"
            className="w-full sm:w-56 bg-background/50 border-border/50 focus-visible:ring-primary/20 hover:bg-background/80"
          />
          <Input
            value={filters.target}
            onChange={e => setFilters(prev => ({ ...prev, target: e.target.value }))}
            placeholder="Target email"
            className="w-full sm:w-56 bg-background/50 border-border/50 focus-visible:ring-primary/20 hover:bg-background/80"
          />
          <Button variant="secondary" onClick={fetchLogs} disabled={loading} className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Apply
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-2xl shadow-sm overflow-hidden border-none">
        {loading ? (
          <div className="px-4 py-10 text-center text-muted-foreground flex flex-col items-center gap-2 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            Loading audit logs…
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground text-sm">No audit events found for the current filters.</div>
        ) : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Event</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Actor</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Target</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Message</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Metadata</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Network</th>
                    <th className="px-6 py-4 text-left font-bold text-xs uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={severityVariant[log.severity]} className={log.severity === 'ALERT' ? "" : "bg-muted/50 text-muted-foreground border-border/50"}>
                            {log.severity.toLowerCase()}
                          </Badge>
                          <span className="font-semibold text-foreground text-xs">{log.event}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-foreground font-medium">{log.actor?.email ?? "n/a"}</div>
                        <div className="text-[10px] text-muted-foreground">{log.actor?.name ?? ""}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-foreground font-medium">{log.targetUser?.email ?? "—"}</div>
                        <div className="text-[10px] text-muted-foreground">{log.targetUser?.name ?? ""}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {log.message ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs break-words font-mono bg-muted/20 p-1 rounded-sm">
                        {log.metadata ? JSON.stringify(log.metadata).slice(0, 50) + (JSON.stringify(log.metadata).length > 50 ? '...' : '') : "—"}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {log.ipAddress ?? "—"}
                        <div className="text-[10px] text-muted-foreground/70">{log.userAgent ? (log.userAgent.length > 20 ? log.userAgent.substring(0, 20) + '...' : log.userAgent) : ""}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {formatTimestamp(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 xl:hidden px-4 pb-4">
              {logs.map(log => (
                <div key={log.id} className="rounded-xl border border-border/50 bg-background/50 p-4 shadow-sm space-y-2 backdrop-blur-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={severityVariant[log.severity]}>{log.severity.toLowerCase()}</Badge>
                    <span className="text-sm font-semibold text-foreground">{log.event}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Actor: <span className="text-foreground">{log.actor?.email ?? 'n/a'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Target: <span className="text-foreground">{log.targetUser?.email ?? log.targetUser?.name ?? '—'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Message: {log.message ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground break-words font-mono bg-muted/20 p-1 rounded">
                    Metadata: {log.metadata ? JSON.stringify(log.metadata) : '—'}
                  </p>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
                    <span>{log.ipAddress ?? '—'}</span>
                    <span>{formatTimestamp(log.createdAt)}</span>
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
