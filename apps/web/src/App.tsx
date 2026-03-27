import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { AnalyticsSummary, BillRecord, JobStatus } from "./types";

const utilityOptions = ["electricity", "water", "gas", "internet"];

function App() {
  const [email, setEmail] = useState("student@example.com");
  const [password, setPassword] = useState("password123");
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("spendsight_token"),
  );
  const [job, setJob] = useState<JobStatus | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [utilityType, setUtilityType] = useState("electricity");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthed = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    if (!token) return;
    void refreshData(token);
  }, [token]);

  useEffect(() => {
    if (
      !token ||
      !job ||
      (job.status !== "queued" && job.status !== "processing")
    )
      return;
    const interval = window.setInterval(async () => {
      try {
        const latest = await api.getJob(token, job.job_id);
        setJob(latest);
        if (latest.status === "completed") {
          window.clearInterval(interval);
          await refreshData(token);
        }
      } catch (err) {
        window.clearInterval(interval);
        setError((err as Error).message);
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [token, job]);

  async function refreshData(activeToken: string) {
    const [summaryResult, billsResult] = await Promise.all([
      api.getSummary(activeToken),
      api.getBills(activeToken),
    ]);
    setSummary(summaryResult);
    setBills(billsResult);
  }

  async function doRegister() {
    setError(null);
    try {
      const auth = await api.register(email, password);
      localStorage.setItem("spendsight_token", auth.access_token);
      setToken(auth.access_token);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const auth = await api.login(email, password);
      localStorage.setItem("spendsight_token", auth.access_token);
      setToken(auth.access_token);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = e.currentTarget;
    const input = form.elements.namedItem("bill") as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      setError("Select a bill file first.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const upload = await api.uploadBill(token, utilityType, file);
      setJob({
        job_id: upload.job_id,
        status: upload.status as JobStatus["status"],
      });
      form.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function onLogout() {
    localStorage.removeItem("spendsight_token");
    setToken(null);
    setSummary(null);
    setBills([]);
    setJob(null);
  }

  return (
    <div className="page">
      <header>
        <h1>SpendSight</h1>
        <p>AI-powered utility bill analytics for a cloud-native class MVP.</p>
      </header>

      {error && <div className="error">{error}</div>}

      {!isAuthed ? (
        <section className="card">
          <h2>Sign in</h2>
          <form className="stack" onSubmit={onLogin}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              required
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              required
            />
            <div className="row">
              <button type="submit">Login</button>
              <button type="button" onClick={() => void doRegister()}>
                Register
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="row spread">
              <h2>Upload bill</h2>
              <button onClick={onLogout}>Log out</button>
            </div>
            <form className="stack" onSubmit={onUpload}>
              <select
                value={utilityType}
                onChange={(e) => setUtilityType(e.target.value)}
              >
                {utilityOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <input
                name="bill"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                required
              />
              <button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </form>
            {job && (
              <p>
                Job <code>{job.job_id}</code>: <strong>{job.status}</strong>
              </p>
            )}
          </section>

          <section className="grid">
            <article className="card">
              <h3>Total Spend</h3>
              <p className="metric">
                ${summary?.total_spend.toFixed(2) ?? "0.00"}
              </p>
            </article>
            <article className="card">
              <h3>Average Bill</h3>
              <p className="metric">
                ${summary?.average_bill.toFixed(2) ?? "0.00"}
              </p>
            </article>
            <article className="card">
              <h3>Bills Processed</h3>
              <p className="metric">{summary?.bills_count ?? 0}</p>
            </article>
          </section>

          <section className="card">
            <h2>Provider totals</h2>
            <ul>
              {summary?.totals_by_provider.map((row) => (
                <li key={row.name}>
                  {row.name}: ${row.total.toFixed(2)}
                </li>
              )) ?? <li>No data yet</li>}
            </ul>
          </section>

          <section className="card">
            <h2>Recent bills</h2>
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Utility</th>
                  <th>Period End</th>
                  <th>Amount</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{bill.provider_name}</td>
                    <td>{bill.utility_type}</td>
                    <td>{bill.billing_period_end}</td>
                    <td>${bill.total_amount_due.toFixed(2)}</td>
                    <td>{(bill.confidence_score * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

export default App;
