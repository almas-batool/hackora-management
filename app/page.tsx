"use client";

import { useState } from "react";

type Role = "admin" | "judge" | "team";

const teams = [
  { id: "HCK-001", name: "Tech Titans", college: "LAEC Bidar", ps: "AI-01", status: "Submitted", score: 92 },
  { id: "HCK-002", name: "Code Crusaders", college: "BVB Hubballi", ps: "CY-01", status: "Evaluated", score: 89 },
  { id: "HCK-003", name: "Innovators", college: "GEC Raichur", ps: "AG-01", status: "Submitted", score: 86 },
  { id: "HCK-004", name: "Byte Force", college: "LAEC Bidar", ps: "HT-01", status: "Building", score: 0 },
  { id: "HCK-005", name: "Neural Nexus", college: "VTU Belagavi", ps: "ED-01", status: "Evaluated", score: 84 },
];

const problems = [
  { id: "AI-01", theme: "Agentic AI", title: "AI-powered autonomous workflow assistant", teams: 3 },
  { id: "AI-02", theme: "Agentic AI", title: "Multi-agent decision support system", teams: 3 },
  { id: "CY-01", theme: "Cybersecurity", title: "Intelligent threat detection platform", teams: 4 },
  { id: "HT-01", theme: "HealthTech", title: "Smart preventive healthcare assistant", teams: 2 },
  { id: "AG-01", theme: "AgriTech", title: "AI-based crop monitoring and advisory", teams: 5 },
  { id: "SI-01", theme: "Smart Infrastructure", title: "Intelligent campus infrastructure", teams: 3 },
  { id: "ED-01", theme: "Smart Education", title: "Personalized AI learning platform", teams: 3 },
];

const criteria = [
  ["Problem Understanding", 15],
  ["Innovation & Creativity", 20],
  ["Technical Implementation", 20],
  ["Working Prototype", 25],
  ["Impact & Feasibility", 10],
  ["UI/UX & Presentation", 10],
];

export default function Home() {
  const [role, setRole] = useState<Role>("admin");
  const [dark, setDark] = useState(true);
  const [active, setActive] = useState("Overview");
  const [selectedPS, setSelectedPS] = useState("AI-01");
  const [scores, setScores] = useState<number[]>(criteria.map(() => 0));
  const [submitted, setSubmitted] = useState(false);

  const bg = dark ? "#050a12" : "#f5f8fc";
  const panel = dark ? "#0b1421" : "#ffffff";
  const border = dark ? "#1c2b3d" : "#dce5ef";
  const text = dark ? "#f4f8ff" : "#102033";
  const muted = dark ? "#7f93aa" : "#66778a";
  const blue = "#1688e8";

  const total = scores.reduce((a, b) => a + b, 0);

  const nav =
    role === "admin"
      ? ["Overview", "Teams", "Problem Statements", "Evaluations", "Leaderboard", "Announcements"]
      : role === "judge"
      ? ["Dashboard", "Assigned Teams", "Evaluations", "Leaderboard"]
      : ["Dashboard", "Choose Problem", "My Team", "Submission"];

  return (
    <main style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "Arial, sans-serif", display: "flex" }}>
      <aside style={{ width: 250, borderRight: `1px solid ${border}`, padding: 22, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 35 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: blue, display: "grid", placeItems: "center", fontWeight: 800 }}>H</div>
          <div>
            <b style={{ fontSize: 19 }}>HACKORA</b>
            <div style={{ fontSize: 9, color: muted, letterSpacing: 2 }}>INNOVATION FEST 2026</div>
          </div>
        </div>

        <div style={{ padding: 12, border: `1px solid ${dark ? "#075b45" : "#9be1ca"}`, borderRadius: 10, color: "#10b981", marginBottom: 25, fontSize: 12 }}>
          ● LIVE EVENT
        </div>

        <div style={{ fontSize: 10, color: muted, letterSpacing: 1.5, marginBottom: 8 }}>VIEW AS</div>

        <div style={{ display: "flex", gap: 4, padding: 4, background: dark ? "#0e1928" : "#edf2f7", borderRadius: 10, marginBottom: 25 }}>
          {(["admin", "judge", "team"] as Role[]).map((r) => (
            <button key={r} onClick={() => { setRole(r); setActive(r === "admin" ? "Overview" : r === "judge" ? "Dashboard" : "Dashboard"); }}
              style={{ flex: 1, border: 0, borderRadius: 7, padding: "9px 3px", background: role === r ? panel : "transparent", color: text, cursor: "pointer", fontSize: 11 }}>
              {r[0].toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {nav.map((item) => (
          <button key={item} onClick={() => setActive(item)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 13px", marginBottom: 5, borderRadius: 9, border: `1px solid ${active === item ? blue : "transparent"}`, background: active === item ? (dark ? "#0c2941" : "#e8f4ff") : "transparent", color: active === item ? blue : text, cursor: "pointer" }}>
            {item}
          </button>
        ))}

        <div style={{ marginTop: 35, paddingTop: 18, borderTop: `1px solid ${border}`, fontSize: 11, color: muted }}>
          SYSTEM OPERATIONAL
          <br /><br />
          <b style={{ color: text }}>Event Admin</b>
        </div>
      </aside>

      <section style={{ flex: 1, minWidth: 0 }}>
        <header style={{ height: 82, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 35px" }}>
          <div>
            <div style={{ color: muted, fontSize: 10, letterSpacing: 2 }}>INNOVATION FEST / HACKORA 2026</div>
            <h2 style={{ margin: "7px 0 0", fontSize: 21 }}>{active}</h2>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ padding: "11px 15px", border: `1px solid ${border}`, borderRadius: 9, fontSize: 11 }}>
              24H HACKATHON
            </span>
            <button onClick={() => setDark(!dark)} style={{ padding: 10, border: `1px solid ${border}`, background: panel, color: text, borderRadius: 9, cursor: "pointer" }}>
              {dark ? "Light" : "Dark"}
            </button>
          </div>
        </header>

        <div style={{ padding: "38px", maxWidth: 1250 }}>

          {(active === "Overview" || active === "Dashboard") && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ color: blue, fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>CONTROL ROOM</div>
                <h1 style={{ fontSize: 38, margin: "10px 0" }}>
                  Hackora is <span style={{ color: blue }}>live.</span>
                </h1>
                <p style={{ color: muted }}>Monitor teams, problem statements, submissions and judging from one place.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
                {[
                  ["TOTAL TEAMS", "42", "+6 today"],
                  ["PS SELECTED", "39", "92.8%"],
                  ["SUBMISSIONS", "31", "73.8%"],
                  ["EVALUATED", "20", "58.1%"],
                ].map(([a,b,c]) => (
                  <div key={a} style={{ padding: 22, border: `1px solid ${border}`, background: panel, borderRadius: 12 }}>
                    <div style={{ fontSize: 9, color: muted, letterSpacing: 1.5 }}>{a}</div>
                    <div style={{ fontSize: 30, fontWeight: 700, margin: "12px 0 4px" }}>{b}</div>
                    <div style={{ fontSize: 10, color: "#10b981" }}>{c}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
                <div style={{ padding: 22, border: `1px solid ${border}`, background: panel, borderRadius: 12 }}>
                  <h3>Problem Statement Distribution</h3>
                  {problems.map((p) => (
                    <div key={p.id} style={{ margin: "18px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span>{p.id}</span><span>{p.teams}/10</span>
                      </div>
                      <div style={{ height: 5, background: dark ? "#1c2937" : "#e4eaf0", borderRadius: 5, marginTop: 7 }}>
                        <div style={{ width: `${p.teams * 10}%`, height: "100%", background: blue, borderRadius: 5 }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: 22, border: `1px solid ${border}`, background: panel, borderRadius: 12 }}>
                  <h3>Evaluation Progress</h3>
                  <div style={{ display: "grid", placeItems: "center", height: 220 }}>
                    <div style={{ width: 135, height: 135, borderRadius: "50%", border: "16px solid #1c2937", borderTopColor: blue, borderRightColor: blue, display: "grid", placeItems: "center" }}>
                      <b style={{ fontSize: 27 }}>58%</b>
                    </div>
                  </div>
                  <div style={{ color: "#10b981", fontSize: 12 }}>● 18 Completed</div>
                  <div style={{ color: "#f59e0b", fontSize: 12, marginTop: 8 }}>● 13 Pending</div>
                </div>
              </div>
            </>
          )}

          {active === "Teams" && <Table title="Registered Teams" rows={teams.map(t => [t.id, t.name, t.college, t.ps, t.status, t.score ? `${t.score}/100` : "-"])} />}

          {active === "Problem Statements" && (
            <div>
              <h2>Problem Statements</h2>
              <p style={{ color: muted }}>Teams choose a problem statement based on their selected theme.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 15 }}>
                {problems.map(p => (
                  <div key={p.id} style={{ padding: 20, background: panel, border: `1px solid ${border}`, borderRadius: 12 }}>
                    <span style={{ color: blue, fontSize: 11 }}>{p.id} / {p.theme}</span>
                    <h3>{p.title}</h3>
                    <p style={{ color: muted }}>{p.teams}/10 teams selected</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === "Evaluations" && <Evaluation scores={scores} setScores={setScores} total={total} submitted={submitted} setSubmitted={setSubmitted} />}

          {active === "Leaderboard" && <Table title="Leaderboard" rows={[...teams].sort((a,b) => b.score-a.score).map((t,i) => [`#${i+1}`, t.name, t.college, t.ps, t.status, `${t.score}/100`])} />}

          {active === "Announcements" && (
            <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 12, padding: 25 }}>
              <h2>Announcements</h2>
              {["Submission window is now open.", "Judging round begins at 09:00 AM.", "Teams must be ready for final demo.", "Leaderboard will be published after evaluation."].map((x,i) => (
                <div key={i} style={{ padding: 18, borderBottom: `1px solid ${border}` }}>● {x}</div>
              ))}
            </div>
          )}

          {active === "Choose Problem" && (
            <div>
              <h2>Choose Problem Statement</h2>
              <p style={{ color: muted }}>Select one problem statement for your team.</p>
              {problems.map(p => (
                <button key={p.id} onClick={() => setSelectedPS(p.id)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: 18, margin: "10px 0", background: selectedPS === p.id ? (dark ? "#0b2942" : "#e8f4ff") : panel, color: text, border: `1px solid ${selectedPS === p.id ? blue : border}`, borderRadius: 10, cursor: "pointer" }}>
                  <b>{p.id}</b> - {p.title}
                  <span style={{ float: "right", color: blue }}>{p.teams}/10</span>
                </button>
              ))}
            </div>
          )}

          {active === "My Team" && <Table title="My Team" rows={[["HCK-001", "Tech Titans", "LAEC Bidar", selectedPS, "Submitted", "92/100"]]} />}

          {active === "Submission" && (
            <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 12, padding: 30 }}>
              <h2>Final Submission</h2>
              <p style={{ color: muted }}>Problem Statement: <b style={{ color: text }}>{selectedPS}</b></p>
              <button style={{ background: blue, color: "white", border: 0, borderRadius: 8, padding: "13px 22px", cursor: "pointer" }}>Submit Project</button>
            </div>
          )}

          {active === "Assigned Teams" && <Table title="Assigned Teams" rows={teams.slice(0,4).map(t => [t.id,t.name,t.college,t.ps,t.status,`${t.score}/100`])} />}

        </div>
      </section>
    </main>
  );
}

function Table({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div>
      <h2>{title}</h2>
      <div style={{ overflowX: "auto", marginTop: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--panel,#0b1421)" }}>
          <tbody>
            {rows.map((row,i) => (
              <tr key={i}>
                {row.map((cell,j) => <td key={j} style={{ padding: 17, borderBottom: "1px solid #1c2b3d", fontSize: 12 }}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Evaluation({ scores, setScores, total, submitted, setSubmitted }: any) {
  return (
    <div>
      <h2>Judge Evaluation</h2>
      <p style={{ color: "#7f93aa" }}>Tech Titans / HCK-001 / AI-01</p>
      <div style={{ maxWidth: 750 }}>
        {criteria.map(([name,max],i) => (
          <div key={name} style={{ margin: "22px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <b>{name}</b><span>{scores[i]} / {max}</span>
            </div>
            <input type="range" min="0" max={max} value={scores[i]} onChange={e => { const x=[...scores]; x[i]=Number(e.target.value); setScores(x); }} style={{ width: "100%", accentColor: "#1688e8" }} />
          </div>
        ))}
        <h2>Total Score: {total}/100</h2>
        <button onClick={() => setSubmitted(true)} style={{ background: "#1688e8", color: "white", border: 0, padding: "13px 24px", borderRadius: 8 }}>
          {submitted ? "Evaluation Submitted" : "Submit Evaluation"}
        </button>
      </div>
    </div>
  );
}
