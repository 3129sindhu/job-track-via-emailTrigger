import { useEffect, useMemo, useState } from "react";
import api from "../api";

const STATUS_OPTIONS = ["Applied", "Interview", "Offer", "Rejected"];

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total]);

  async function fetchJobs(p = 1) {
    setLoading(true);
    setMsg("");
    try {
      const res = await api.get("/jobs", {
        params: { status, company, role, page: p, limit },
      });
      setJobs(res.data.jobs || []);
      setTotal(res.data.total || 0);
      setLastRefreshedAt(new Date());
    } catch (e) {
      setMsg(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      await api.patch(`/jobs/${id}/status`, { status: newStatus });
      await fetchJobs(page);
    } catch (e) {
      setMsg(e.response?.data?.error || e.message);
    }
  }

  function applyFilters() {
    setPage(1);
    fetchJobs(1);
  }

  function clearFilters() {
    setStatus("");
    setCompany("");
    setRole("");
    setPage(1);
    setTimeout(() => fetchJobs(1), 0);
  }
  useEffect(() => {
    fetchJobs(1);

    // Auto refresh every 60s
    const interval = setInterval(() => {
      fetchJobs(page);
    }, 60000);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    fetchJobs(page);
  }, [page]);

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#0b0f14",
      color: "#e8eef6",
      padding: 24,
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    },
    container: { maxWidth: 1100, margin: "0 auto" },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    title: { fontSize: 26, margin: 0, fontWeight: 700 },
    sub: { fontSize: 13, color: "#9fb0c3" },

    card: {
      background: "#0f1621",
      border: "1px solid #1e2a3a",
      borderRadius: 14,
      padding: 16,
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    },

    filtersRow: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1.2fr 0.8fr auto auto",
      gap: 10,
      marginTop: 12,
    },

    input: {
      background: "#0b0f14",
      border: "1px solid #223149",
      color: "#e8eef6",
      borderRadius: 10,
      padding: "10px 12px",
      outline: "none",
    },
    select: {
      background: "#0b0f14",
      border: "1px solid #223149",
      color: "#e8eef6",
      borderRadius: 10,
      padding: "10px 12px",
      outline: "none",
    },

    btn: {
      background: "#1b6ef3",
      border: "1px solid #1b6ef3",
      color: "white",
      padding: "10px 14px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 600,
    },
    btnGhost: {
      background: "transparent",
      border: "1px solid #223149",
      color: "#e8eef6",
      padding: "10px 14px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 600,
    },

    message: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      border: "1px solid #223149",
      background: "#0b0f14",
      color: "#e8eef6",
    },

    tableWrap: {
      marginTop: 14,
      overflowX: "auto",
      borderRadius: 12,
      border: "1px solid #1e2a3a",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: 800,
    },
    th: {
      textAlign: "left",
      fontSize: 13,
      color: "#9fb0c3",
      background: "#0b0f14",
      borderBottom: "1px solid #1e2a3a",
      padding: 12,
      position: "sticky",
      top: 0,
    },
    td: {
      borderBottom: "1px solid #1e2a3a",
      padding: 12,
      verticalAlign: "middle",
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid #223149",
      background: "#0b0f14",
      color: "#cfe0f5",
      fontSize: 12,
    },

    paginationRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginTop: 14,
      flexWrap: "wrap",
    },

    footerRow: {
      marginTop: 18,
      display: "flex",
      justifyContent: "flex-end",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>Dashboard</h2>
            <div style={styles.sub}>
              Auto-sync is enabled. Jobs refresh automatically.
              {lastRefreshedAt ? (
                <span> • Last refreshed: {lastRefreshedAt.toLocaleTimeString()}</span>
              ) : null}
            </div>
          </div>

          <div style={styles.badge}>
            <span>📌</span>
            <span>
              Total jobs: <b>{total}</b>
            </span>
          </div>
        </div>

        <div style={styles.card}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Filters</div>
          <div style={styles.sub}>Search by company, role, and status</div>

          <div style={styles.filtersRow}>
            <input
              style={styles.input}
              placeholder="Company (e.g., Disney)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <input
              style={styles.input}
              placeholder="Role (e.g., Software Engineer Intern)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            <select style={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button style={styles.btn} onClick={applyFilters} disabled={loading}>
              Apply
            </button>
            <button style={styles.btnGhost} onClick={clearFilters} disabled={loading}>
              Clear
            </button>
          </div>

          {msg ? <div style={styles.message}>{msg}</div> : null}
          {loading ? <div style={{ marginTop: 12, color: "#9fb0c3" }}>Loading jobs…</div> : null}

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Company</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Applied</th>
                  <th style={styles.th}>Detected</th>
                  <th style={styles.th}>Confidence</th>
                  <th style={styles.th}>Why</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 && !loading ? (
                  <tr>
                    <td style={styles.td} colSpan={7}>
                      No jobs found. Try changing filters.
                    </td>
                  </tr>
                ) : null}

                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td style={styles.td}>{j.company || "-"}</td>
                    <td style={styles.td}>{j.role || "-"}</td>
                    <td style={styles.td}>
                      <select
                        style={styles.select}
                        value={j.status}
                        onChange={(e) => updateStatus(j.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={styles.td}>
                      {j.applied_date ? new Date(j.applied_date).toLocaleDateString() : "-"}
                    </td>
                    <td style={styles.td}>{j.ml_event_type || "-"}</td>
<td style={styles.td}>
  {j.ml_confidence != null ? `${Math.round(Number(j.ml_confidence) * 100)}%` : "-"}
</td>
<td style={styles.td} title={j.ml_reason || ""}>
  {j.ml_reason ? "hover" : "-"}
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.paginationRow}>
            <button
              style={styles.btnGhost}
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </button>

            <div style={styles.sub}>
              Page <b>{page}</b> / <b>{totalPages}</b>
            </div>

            <button
              style={styles.btnGhost}
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>

        <div style={styles.footerRow}>
          <button
            style={styles.btnGhost}
            onClick={() => {
              localStorage.removeItem("token");
              window.location.reload();
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
