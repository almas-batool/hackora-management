"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type Role = "admin" | "judge" | "team";
type CriteriaName = "problem_understanding" | "innovation_creativity" | "technical_implementation" | "working_prototype" | "impact_feasibility" | "ui_ux_presentation";
type Team = { id: string; dbId: string; name: string; college: string; ps: string | null; status: string; score: number | null };
type Problem = { id: string; code: string; theme: string; title: string; description: string; teams: number; maxTeams: number };
type Judge = { id: string; name: string; organization: string };
type Assignment = { judge_id: string; team_id: string };
type Evaluation = { id: string; judge_id: string; team_id: string; total_score: number | null; is_locked: boolean; confirmed_at: string | null } & Record<CriteriaName, number | null>;
type Submission = { id: string; team_id: string; status: string | null; submitted_at: string | null };
type Announcement = { id: string; title: string; message: string; type: string; created_at: string };
type UserProfile = { role: Role; team_id: string | null; judge_id: string | null };

const criteria: readonly [CriteriaName, string, number][] = [
  ["problem_understanding", "Problem Understanding", 15],
  ["innovation_creativity", "Innovation & Creativity", 20],
  ["technical_implementation", "Technical Implementation", 20],
  ["working_prototype", "Working Prototype", 25],
  ["impact_feasibility", "Impact & Feasibility", 10],
  ["ui_ux_presentation", "UI/UX & Presentation", 10],
];
const emptyScores = () => criteria.map(() => 0);

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [dark, setDark] = useState(true);
  const [active, setActive] = useState("Overview");
  const [teams, setTeams] = useState<Team[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedJudgeId, setSelectedJudgeId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [scores, setScores] = useState<number[]>(emptyScores());
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const userResult = await supabase.auth.getUser();
    if (userResult.error || !userResult.data.user) {
      router.replace("/login");
      return;
    }
    const profileResult = await supabase.from("user_profiles").select("role, team_id, judge_id").eq("user_id", userResult.data.user.id).single();
    if (profileResult.error || !profileResult.data) {
      setError("Your account is not provisioned for Hackora access.");
      setLoading(false);
      return;
    }
    const profile = profileResult.data as UserProfile;
    const nextRole = profile.role.toLowerCase() as Role;
    setRole(nextRole);
    setActive(nextRole === "admin" ? "Overview" : "Dashboard");
    setSelectedTeamId(profile.team_id ?? "");
    setSelectedJudgeId(profile.judge_id ?? "");
    const results = await Promise.all([
      supabase.from("teams").select("*").order("created_at"),
      supabase.from("problem_statements").select("*"),
      supabase.from("judges").select("*"),
      supabase.from("judge_assignments").select("*"),
      supabase.from("evaluations").select("*"),
      supabase.from("submissions").select("*"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    ]);
    const failure = results.find((result) => result.error);
    if (failure?.error) { setError(failure.error.message); setLoading(false); return; }
    const [teamResult, problemResult, judgeResult, assignmentResult, evaluationResult, submissionResult, announcementResult] = results;
    const rawTeams = (teamResult.data ?? []) as Array<Record<string, unknown>>;
    const rawProblems = (problemResult.data ?? []) as Array<Record<string, unknown>>;
    const nextTeams = rawTeams.map((team) => ({ id: String(team.team_code ?? team.id), dbId: String(team.id), name: String(team.name ?? ""), college: String(team.college ?? ""), ps: team.problem_statement_id ? String(team.problem_statement_id) : null, status: String(team.status ?? "REGISTERED"), score: typeof team.score === "number" ? team.score : null }));
    const counts = nextTeams.reduce<Record<string, number>>((all, team) => { if (team.ps) all[team.ps] = (all[team.ps] ?? 0) + 1; return all; }, {});
    setTeams(nextTeams);
    setProblems(rawProblems.map((problem) => {
      const id = String(problem.id);
      const code = String(problem.ps_code ?? problem.code ?? problem.problem_code ?? id);
      return { id, code, theme: String(problem.theme ?? ""), title: String(problem.title ?? ""), description: String(problem.description ?? problem.details ?? ""), teams: Number(problem.selected_teams ?? counts[id] ?? 0), maxTeams: Number(problem.max_teams ?? 10) };
    }));
    setJudges((judgeResult.data ?? []) as Judge[]);
    setAssignments((assignmentResult.data ?? []) as Assignment[]);
    setEvaluations((evaluationResult.data ?? []) as Evaluation[]);
    setSubmissions((submissionResult.data ?? []) as Submission[]);
    setAnnouncements((announcementResult.data ?? []) as Announcement[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId || team.dbId === selectedTeamId) ?? teams[0];
  const activeJudgeId = selectedJudgeId || judges[0]?.id || "";
  const activeTeamId = selectedTeam?.id || teams[0]?.id || "";
  const selectedJudge = judges.find((judge) => judge.id === activeJudgeId);
  const assignedTeams = teams.filter((team) => assignments.some((assignment) => assignment.judge_id === activeJudgeId && assignment.team_id === team.dbId));
  const evaluationTeam = teams.find((team) => team.id === activeTeamId) ?? assignedTeams[0] ?? teams[0];
  const activeEvaluation = evaluations.find((evaluation) => evaluation.team_id === (evaluationTeam?.dbId ?? "") && evaluation.judge_id === activeJudgeId);
  const themes = [...new Set(problems.map((problem) => problem.theme).filter(Boolean))];
  const total = scores.reduce((sum, score) => sum + score, 0);
  const scoreByTeam = useMemo(() => evaluations.reduce<Record<string, number>>((all, evaluation) => { if (typeof evaluation.total_score === "number") all[evaluation.team_id] = evaluation.total_score; return all; }, {}), [evaluations]);
  const displayScore = (team: Team) => scoreByTeam[team.dbId] ?? team.score;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const evaluation = evaluations.find((item) => item.team_id === (evaluationTeam?.dbId ?? "") && item.judge_id === activeJudgeId);
      setScores(evaluation ? criteria.map(([name]) => Number(evaluation[name] ?? 0)) : emptyScores());
      setSubmitted(Boolean(evaluation));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [evaluations, evaluationTeam?.dbId, activeJudgeId]);

  const submitFinalSubmission = async () => {
    if (!selectedTeam?.ps) return;
    setSaving(true); setError("");
    const existing = submissions.find((submission) => submission.team_id === selectedTeam.dbId);
    const payload = { status: "SUBMITTED", submitted_at: new Date().toISOString() };
    const result = existing
      ? await supabase.from("submissions").update(payload).eq("id", existing.id)
      : await supabase.from("submissions").insert({ ...payload, team_id: selectedTeam.dbId });
    if (result.error) setError(result.error.message); else await loadData();
    setSaving(false);
  };

  const submitEvaluation = async () => {
    if (!evaluationTeam || !activeJudgeId) return;
    setSaving(true); setError("");
    const payload: Record<string, number> = Object.fromEntries(criteria.map(([name], index) => [name, scores[index]]));
    payload.total_score = total;
    const existing = evaluations.find((evaluation) => evaluation.team_id === evaluationTeam.dbId && evaluation.judge_id === activeJudgeId);
    const result = existing ? await supabase.from("evaluations").update(payload).eq("id", existing.id) : await supabase.from("evaluations").insert({ ...payload, judge_id: activeJudgeId, team_id: evaluationTeam.dbId });
    if (result.error) setError(result.error.message); else { setSubmitted(true); await loadData(); }
    setSaving(false);
  };

  const confirmEvaluation = async () => {
    if (!activeEvaluation) return;
    setSaving(true); setError("");
    const result = await supabase.from("evaluations").update({ is_locked: true, confirmed_at: new Date().toISOString() }).eq("id", activeEvaluation.id);
    if (result.error) setError(result.error.message); else await loadData();
    setSaving(false);
  };

  const bg = dark ? "#050a12" : "#f5f8fc";
  const panel = dark ? "#0b1421" : "#ffffff";
  const border = dark ? "#1c2b3d" : "#dce5ef";
  const text = dark ? "#f4f8ff" : "#102033";
  const muted = dark ? "#7f93aa" : "#66778a";
  const blue = "#1688e8";
  const nav = role === "admin" ? ["Overview", "Teams", "Problem Statements", "Evaluations", "Leaderboard", "Announcements"] : role === "judge" ? ["Dashboard", "Assigned Teams", "Evaluations", "Leaderboard"] : role === "team" ? ["Dashboard", "Choose Problem", "My Team", "Submission"] : [];
  const signOut = async () => { await supabase.auth.signOut(); router.replace("/login"); };
  const stats = [["TOTAL TEAMS", teams.length, ""], ["PS SELECTED", teams.filter((team) => team.ps).length, teams.length ? `${Math.round((teams.filter((team) => team.ps).length / teams.length) * 100)}%` : "0%"], ["SUBMISSIONS", submissions.length, ""], ["EVALUATED", evaluations.length, ""]];

  return (
    <main style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "Arial, sans-serif", display: "flex" }}>
      <aside style={{ width: 250, borderRight: `1px solid ${border}`, padding: 22, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 35 }}><div style={{ width: 42, height: 42, borderRadius: 12, background: blue, display: "grid", placeItems: "center", fontWeight: 800 }}>H</div><div><b style={{ fontSize: 19 }}>HACKORA</b><div style={{ fontSize: 9, color: muted, letterSpacing: 2 }}>INNOVATION FEST 2026</div></div></div>
        <div style={{ padding: 12, border: `1px solid ${dark ? "#075b45" : "#9be1ca"}`, borderRadius: 10, color: "#10b981", marginBottom: 25, fontSize: 12 }}>LIVE EVENT</div>
        <div style={{ fontSize: 10, color: muted, letterSpacing: 1.5, marginBottom: 8 }}>VIEW AS</div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: dark ? "#0e1928" : "#edf2f7", borderRadius: 10, marginBottom: 25 }}>{(["admin", "judge", "team"] as Role[]).map((item) => <button key={item} disabled style={{ flex: 1, border: 0, borderRadius: 7, padding: "9px 3px", background: role === item ? panel : "transparent", color: text, cursor: "default", fontSize: 11 }}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>
        {nav.map((item) => <button key={item} onClick={() => setActive(item)} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 13px", marginBottom: 5, borderRadius: 9, border: `1px solid ${active === item ? blue : "transparent"}`, background: active === item ? (dark ? "#0c2941" : "#e8f4ff") : "transparent", color: active === item ? blue : text, cursor: "pointer" }}>{item}</button>)}
        <div style={{ marginTop: 35, paddingTop: 18, borderTop: `1px solid ${border}`, fontSize: 11, color: muted }}>SYSTEM OPERATIONAL<br /><br /><b style={{ color: text }}>Event Admin</b></div>
      </aside>
      <section style={{ flex: 1, minWidth: 0 }}>
        <header style={{ height: 82, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 35px" }}><div><div style={{ color: muted, fontSize: 10, letterSpacing: 2 }}>INNOVATION FEST / HACKORA 2026</div><h2 style={{ margin: "7px 0 0", fontSize: 21 }}>{active}</h2></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ padding: "11px 15px", border: `1px solid ${border}`, borderRadius: 9, fontSize: 11 }}>24H HACKATHON</span><button onClick={() => void signOut()} style={{ padding: 10, border: `1px solid ${border}`, background: panel, color: text, borderRadius: 9, cursor: "pointer" }}>Sign out</button><button onClick={() => setDark(!dark)} style={{ padding: 10, border: `1px solid ${border}`, background: panel, color: text, borderRadius: 9, cursor: "pointer" }}>{dark ? "Light" : "Dark"}</button></div></header>
        <div style={{ padding: "38px", maxWidth: 1250 }}>
          {loading && <p style={{ color: muted }}>Loading Hackora data...</p>}
          {error && <p style={{ color: "#ef4444" }}>{error}</p>}
          {!loading && !error && role === "team" && active === "Dashboard" && <TeamProblemFlow problems={problems} themes={themes} selectedTheme={selectedTheme} panel={panel} border={border} text={text} muted={muted} blue={blue} onTheme={(theme) => setSelectedTheme(theme)} onBack={() => setSelectedTheme(null)} />}
          {!loading && !error && role !== "team" && (active === "Overview" || active === "Dashboard") && <><div style={{ marginBottom: 28 }}><div style={{ color: blue, fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>CONTROL ROOM</div><h1 style={{ fontSize: 38, margin: "10px 0" }}>Hackora is <span style={{ color: blue }}>live.</span></h1><p style={{ color: muted }}>Monitor teams, problem statements, submissions and judging from one place.</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>{stats.map(([label, value, detail]) => <div key={String(label)} style={{ padding: 22, border: `1px solid ${border}`, background: panel, borderRadius: 12 }}><div style={{ fontSize: 9, color: muted, letterSpacing: 1.5 }}>{label}</div><div style={{ fontSize: 30, fontWeight: 700, margin: "12px 0 4px" }}>{value}</div><div style={{ fontSize: 10, color: "#10b981" }}>{detail}</div></div>)}</div></>}
          {active === "Teams" && <Table title="Registered Teams" rows={teams.map((team) => [team.id, team.name, team.college, team.ps ?? "-", team.status, displayScore(team) === null ? "-" : `${displayScore(team)}/100`])} />}
          {active === "Problem Statements" && <div><h2>Problem Statements</h2><p style={{ color: muted }}>Teams choose a problem statement based on their selected theme.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 15 }}>{problems.map((problem) => <div key={problem.id} style={{ padding: 20, background: panel, border: `1px solid ${border}`, borderRadius: 12 }}><span style={{ color: blue, fontSize: 11 }}>{problem.id} / {problem.theme}</span><h3>{problem.title}</h3><p style={{ color: muted }}>{problem.teams}/{problem.maxTeams} teams selected</p></div>)}</div></div>}
          {active === "Evaluations" && <><div style={{ display: "flex", gap: 10, marginBottom: 20 }}><select value={activeJudgeId} onChange={(event) => { setSelectedJudgeId(event.target.value); if (role === "judge") { const firstAssigned = assignments.find((assignment) => assignment.judge_id === event.target.value); const firstTeam = teams.find((team) => team.dbId === firstAssigned?.team_id); if (firstTeam) setSelectedTeamId(firstTeam.id); } }} style={{ padding: 10, background: panel, color: text, border: `1px solid ${border}`, borderRadius: 8 }}>{judges.map((judge) => <option key={judge.id} value={judge.id}>{judge.name}</option>)}</select><select value={activeTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} style={{ padding: 10, background: panel, color: text, border: `1px solid ${border}`, borderRadius: 8 }}>{(role === "judge" ? assignedTeams : teams).map((team) => <option key={team.id} value={team.id}>{team.id} - {team.name}</option>)}</select></div><Evaluation team={evaluationTeam} judge={selectedJudge} submission={submissions.find((submission) => submission.team_id === evaluationTeam?.dbId)} scores={scores} setScores={setScores} total={total} submitted={submitted} locked={Boolean(activeEvaluation?.is_locked)} saving={saving} onSubmit={submitEvaluation} onConfirm={confirmEvaluation} /></>}
          {active === "Leaderboard" && <Table title="Leaderboard" rows={[...teams].sort((a, b) => (displayScore(b) ?? 0) - (displayScore(a) ?? 0)).map((team, index) => [`#${index + 1}`, team.name, team.college, team.ps ?? "-", team.status, displayScore(team) === null ? "-" : `${displayScore(team)}/100`])} />}
          {active === "Announcements" && <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 12, padding: 25 }}><h2>Announcements</h2>{announcements.map((announcement) => <div key={announcement.id} style={{ padding: 18, borderBottom: `1px solid ${border}` }}>{announcement.title}: {announcement.message}</div>)}</div>}
          {active === "Choose Problem" && <TeamProblemFlow problems={problems} themes={themes} selectedTheme={selectedTheme} panel={panel} border={border} text={text} muted={muted} blue={blue} onTheme={(theme) => setSelectedTheme(theme)} onBack={() => setSelectedTheme(null)} />}
          {active === "My Team" && <Table title="My Team" rows={selectedTeam ? [[selectedTeam.id, selectedTeam.name, selectedTeam.college, selectedTeam.ps ?? "-", selectedTeam.status, displayScore(selectedTeam) === null ? "-" : `${displayScore(selectedTeam)}/100`]] : []} />}
          {active === "Submission" && <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 12, padding: 30 }}><h2>Final Submission</h2><p style={{ color: muted }}>Problem Statement: <b style={{ color: text }}>{(selectedTeam?.ps ?? selectedPS) || "Not selected"}</b></p><p style={{ color: muted }}>Submission status: {submissions.find((submission) => submission.team_id === selectedTeam?.dbId)?.status ?? "Not submitted"}</p><button disabled={!selectedTeam?.ps || saving} onClick={() => void submitFinalSubmission()} style={{ background: blue, color: "white", border: 0, padding: "13px 24px", borderRadius: 8 }}>{saving ? "Submitting..." : submissions.find((submission) => submission.team_id === selectedTeam?.dbId)?.status === "SUBMITTED" ? "Resubmit Final Submission" : "Confirm Final Submission"}</button></div>}
          {active === "Assigned Teams" && <><select value={activeJudgeId} onChange={(event) => setSelectedJudgeId(event.target.value)} style={{ padding: 10, marginBottom: 10, background: panel, color: text, border: `1px solid ${border}`, borderRadius: 8 }}>{judges.map((judge) => <option key={judge.id} value={judge.id}>{judge.name}</option>)}</select><Table title={selectedJudge ? `Assigned Teams - ${selectedJudge.name}` : "Assigned Teams"} rows={assignedTeams.map((team) => [team.id, team.name, team.college, team.ps ?? "-", team.status, displayScore(team) === null ? "-" : `${displayScore(team)}/100`])} /></>}
        </div>
      </section>
    </main>
  );
}

function Table({ title, rows }: { title: string; rows: string[][] }) { return <div><h2>{title}</h2><div style={{ overflowX: "auto", marginTop: 20 }}><table style={{ width: "100%", borderCollapse: "collapse", background: "var(--panel,#0b1421)" }}><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} style={{ padding: 17, borderBottom: "1px solid #1c2b3d", fontSize: 12 }}>{cell}</td>)}</tr>)}</tbody></table></div></div>; }

function TeamProblemFlow({ problems, themes, selectedTheme, panel, border, text, muted, blue, onTheme, onBack }: { problems: Problem[]; themes: readonly string[]; selectedTheme: string | null; panel: string; border: string; text: string; muted: string; blue: string; onTheme: (theme: string) => void; onBack: () => void }) {
  const card = { padding: 20, background: panel, border: `1px solid ${border}`, borderRadius: 12, color: text };

  if (selectedTheme) {
    return <div>
      <button onClick={onBack} style={{ border: 0, background: "transparent", color: blue, padding: "0 0 16px", cursor: "pointer" }}>Back to themes</button>
      <h2>{selectedTheme}</h2>
      <div style={{ display: "grid", gap: 15 }}>
        {problems.filter((problem) => problem.theme === selectedTheme).map((problem) => <div key={problem.id} style={card}>
          <div style={{ color: blue, fontSize: 12, fontWeight: 700 }}>ID: {problem.id}</div>
          <h3 style={{ margin: "10px 0" }}>{problem.title}</h3>
          <p style={{ color: muted, lineHeight: 1.5 }}>{problem.description}</p>
          <p style={{ color: muted, fontSize: 13 }}>Maximum teams: <b style={{ color: text }}>{problem.maxTeams}</b></p>
        </div>)}
      </div>
    </div>;
  }

  return <div>
    <div style={{ color: blue, fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>TEAM DASHBOARD</div>
    <h1 style={{ fontSize: 34, margin: "10px 0" }}>Problem Statements</h1>
    <p style={{ color: muted }}>Choose a theme to browse its problem statements.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 15, marginTop: 25 }}>
      {themes.map((theme) => <button key={theme} onClick={() => onTheme(theme)} style={{ ...card, minHeight: 150, textAlign: "left", cursor: "pointer" }}>
        <div style={{ color: blue, fontSize: 11, fontWeight: 700 }}>THEME</div>
        <h3 style={{ margin: "12px 0" }}>{theme}</h3>
        <span style={{ color: muted, fontSize: 12 }}>{problems.filter((problem) => problem.theme === theme).length} problem statements</span>
      </button>)}
    </div>
  </div>;
}

function Evaluation({ team, judge, submission, scores, setScores, total, submitted, locked, saving, onSubmit, onConfirm }: { team?: Team; judge?: Judge; submission?: Submission; scores: number[]; setScores: (scores: number[]) => void; total: number; submitted: boolean; locked: boolean; saving: boolean; onSubmit: () => void; onConfirm: () => void }) {
  return <div><h2>Judge Evaluation</h2><p style={{ color: "#7f93aa" }}>{team?.name ?? "No team selected"} / {team?.id ?? "-"} / {team?.ps ?? "-"} {judge ? `/ ${judge.name}` : ""}</p><p style={{ color: "#7f93aa" }}>Final submission: {submission?.status ?? "Not submitted"}</p><div style={{ maxWidth: 750 }}>{criteria.map(([name, label, max], index) => <div key={name} style={{ margin: "22px 0" }}><div style={{ display: "flex", justifyContent: "space-between" }}><b>{label}</b><span>{scores[index]} / {max}</span></div><input type="range" min="0" max={max} value={scores[index]} disabled={locked} onChange={(event) => { const next = [...scores]; next[index] = Number(event.target.value); setScores(next); }} style={{ width: "100%", accentColor: "#1688e8" }} /></div>)}<h2>Total Score: {total}/100</h2><button disabled={!team || !judge || saving || locked} onClick={onSubmit} style={{ background: "#1688e8", color: "white", border: 0, padding: "13px 24px", borderRadius: 8 }}>{saving ? "Saving..." : locked ? "Evaluation Locked" : submitted ? "Save Evaluation" : "Submit Evaluation"}</button>{submitted && !locked && <button disabled={saving} onClick={onConfirm} style={{ background: "#10b981", color: "white", border: 0, padding: "13px 24px", borderRadius: 8, marginLeft: 10 }}>Confirm & Lock</button>}</div></div>;
}
