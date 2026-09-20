"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Role = "admin" | "judge" | "team";
type CriteriaName = "problem_understanding" | "innovation_creativity" | "technical_implementation" | "working_prototype" | "impact_feasibility" | "ui_ux_presentation";
type Team = { id: string; dbId: string; name: string; college: string; ps: string | null; status: string; score: number | null };
type Problem = { id: string; theme: string; title: string; teams: number; maxTeams: number };
type Judge = { id: string; name: string; organization: string };
type Assignment = { judge_id: string; team_id: string };
type Evaluation = { id: string; judge_id: string; team_id: string; total_score: number | null } & Record<CriteriaName, number | null>;
type Submission = { id: string; team_id: string; status: string | null; submitted_at: string | null };
type Announcement = { id: string; title: string; message: string; type: string; created_at: string };

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
  const [role, setRole] = useState<Role>("admin");
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
  const [selectedPS, setSelectedPS] = useState("");
  const [scores, setScores] = useState<number[]>(emptyScores());
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    const results = await Promise.all([
      supabase.from("teams").select("*").order("created_at"),
      supabase.from("problem_statements").select("*"),
      supabase.from("judges").select("*"),
      supabase.from("judge_assignments").select("*"),
      supabase.from("evaluations").select("*"),
      supabase.from("submissions").select("*"),
      supabase.from("announcements").select("*").eq("is_published", true).order("created_at", { ascending: false }),
    ]);
    const failure = results.find((result) => result.error);
    if (failure?.error) { setError(failure.error.message); setLoading(false); return; }
    const [teamResult, problemResult, judgeResult, assignmentResult, evaluationResult, submissionResult, announcementResult] = results;
    const rawTeams = (teamResult.data ?? []) as Array<Record<string, unknown>>;
    const rawProblems = (problemResult.data ?? []) as Array<Record<string, unknown>>;
    const nextTeams = rawTeams.map((team) => ({ id: String(team.team_code ?? team.id), dbId: String(team.id), name: String(team.name ?? ""), college: String(team.college ?? ""), ps: team.problem_statement_id ? String(team.problem_statement_id) : null, status: String(team.status ?? "REGISTERED"), score: typeof team.score === "number" ? team.score : null }));
    const counts = nextTeams.reduce<Record<string, number>>((all, team) => { if (team.ps) all[team.ps] = (all[team.ps] ?? 0) + 1; return all; }, {});
    setTeams(nextTeams);
    setProblems(rawProblems.map((problem) => ({ id: String(problem.id), theme: String(problem.theme ?? ""), title: String(problem.title ?? ""), teams: counts[String(problem.id)] ?? Number(problem.selected_teams ?? 0), maxTeams: Number(problem.max_teams ?? 10) })));
    setJudges((judgeResult.data ?? []) as Judge[]);
    setAssignments((assignmentResult.data ?? []) as Assignment[]);
    setEvaluations((evaluationResult.data ?? []) as Evaluation[]);
    setSubmissions((submissionResult.data ?? []) as Submission[]);
    setAnnouncements((announcementResult.data ?? []) as Announcement[]);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeJudgeId = selectedJudgeId || judges[0]?.id || "";
  const activeTeamId = selectedTeamId || teams[0]?.id || "";
  const selectedTeam = teams.find((team) => team.id === activeTeamId) ?? teams[0];
  const selectedJudge = judges.find((judge) => judge.id === activeJudgeId);
  const assignedTeams = teams.filter((team) => assignments.some((assignment) => assignment.judge_id === activeJudgeId && assignment.team_id === team.dbId));
  const evaluationTeam = teams.find((team) => team.id === activeTeamId) ?? assignedTeams[0] ?? teams[0];
  const currentPS = selectedPS || selectedTeam?.ps || "";
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

  const chooseProblem = async (problemId: string) => {
    if (!selectedTeam) return;
    setSaving(true); setError("");
    const current = await supabase.from("teams").select("problem_statement_id").eq("id", selectedTeam.dbId).single();
    const taken = await supabase.from("teams").select("id", { count: "exact", head: true }).eq("problem_statement_id", problemId).neq("id", selectedTeam.dbId);
    const problem = problems.find((item) => item.id === problemId);
    if (current.error || taken.error) setError((current.error ?? taken.error)?.message ?? "Unable to check problem statement availability.");
    else if (current.data?.problem_statement_id === problemId || (taken.count ?? 0) < (problem?.maxTeams ?? 10)) {
      const update = await supabase.from("teams").update({ problem_statement_id: problemId, status: "PS_SELECTED" }).eq("id", selectedTeam.dbId);
      if (update.error) setError(update.error.message); else { setSelectedPS(problemId); await loadData(); }
    } else setError("This problem statement has reached its team limit.");
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

  const bg = dark ? "#050a12" : "#f5f8fc";
  const panel = dark ? "#0b1421" : "#ffffff";
  const border = dark ? "#1c2b3d" : "#dce5ef";
  const text = dark ? "#f4f8ff" : "#102033";
  const muted = dark ? "#7f93aa" : "#66778a";
  const blue = "#1688e8";
  const nav = role === "admin" ? ["Overview", "Teams", "Problem Statements", "Evaluations", "Leaderboard", "Announcements"] : role === "judge" ? ["Dashboard", "Assigned Teams", "Evaluations", "Leaderboard"] : ["Dashboard", "Choose Problem", "My Team", "Submission"];
  const stats = [["TOTAL TEAMS", teams.length, ""], ["PS SELECTED", teams.filter((team) => team.ps).length, teams.length ? `${Math.round((teams.filter((team) => team.ps).length / teams.length) * 100)}%` : "0%"], ["SUBMISSIONS", submissions.length, ""], ["EVALUATED", evaluations.length, ""]];

  return (
    <main style={{ minHeight: "100vh", background: bg, color: text, fontFamily: "Arial, sans-serif", display: "flex" }}>
      <aside style={{ width: 250, borderRight: `1px solid ${border}`, padding: 22, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 35 }}><div style={{ width: 42, height: 42, borderRadius: 12, background: blue, display: "grid", placeItems: "center", fontWeight: 800 }}>H</div><div><b style={{ fontSize: 19 }}>HACKORA</b><div style={{ fontSize: 9, color: muted, letterSpacing: 2 }}>INNOVATION FEST 2026</div></div></div>
        <div style={{ padding: 12, border: `1px solid ${dark ? "#075b45" : "#9be1ca"}`, borderRadius: 10, color: "#10b981", marginBottom: 25, fontSize: 12 }}>LIVE EVENT</div>
        <div style={{ fontSize: 10, color: muted, letterSpacing: 1.5, marginBottom: 8 }}>VIEW AS</div>
        <div style={{ display: "flex", gap: 4, padding: 4, background: dark ? "#0e1928" : "#edf2f7", borderRadius: 10, marginBottom: 25 }}>{(["admin", "judge", "team"] as Role[]).map((item) => <button key={item} onClick={() => { setRole(item); setActive(item === "admin" ? "Overview" : "Dashboard"); }} style={{ flex: 1, border: 0, borderRadius: 7, padding: "9px 3px", background: role === item ? panel : "transparent", color: text, cursor: "pointer", fontSize: 11 }}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>
        {nav.map((item) => <button key={item} onClick={() => setActive(item)} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 13px", marginBottom: 5, borderRadius: 9, border: `1px solid ${active === item ? blue : "transparent"}`, background: active === item ? (dark ? "#0c2941" : "#e8f4ff") : "transparent", color: active === item ? blue : text, cursor: "pointer" }}>{item}</button>)}
        <div style={{ marginTop: 35, paddingTop: 18, borderTop: `1px solid ${border}`, fontSize: 11, color: muted }}>SYSTEM OPERATIONAL<br /><br /><b style={{ color: text }}>Event Admin</b></div>
      </aside>
      <section style={{ flex: 1, minWidth: 0 }}>
        <header style={{ height: 82, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 35px" }}><div><div style={{ color: muted, fontSize: 10, letterSpacing: 2 }}>INNOVATION FEST / HACKORA 2026</div><h2 style={{ margin: "7px 0 0", fontSize: 21 }}>{active}</h2></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ padding: "11px 15px", border: `1px solid ${border}`, borderRadius: 9, fontSize: 11 }}>24H HACKATHON</span><button onClick={() => setDark(!dark)} style={{ padding: 10, border: `1px solid ${border}`, background: panel, color: text, borderRadius: 9, cursor: "pointer" }}>{dark ? "Light" : "Dark"}</button></div></header>
        <div style={{ padding: "38px", maxWidth: 1250 }}>
          {loading && <p style={{ color: muted }}>Loading Hackora data...</p>}
          {error && <p style={{ color: "#ef4444" }}>{error}</p>}
          {!loading && !error && (active === "Overview" || active === "Dashboard") && <><div style={{ marginBottom: 28 }}><div style={{ color: blue, fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>CONTROL ROOM</div><h1 style={{ fontSize: 38, margin: "10px 0" }}>Hackora is <span style={{ color: blue }}>live.</span></h1><p style={{ color: muted }}>Monitor teams, problem statements, submissions and judging from one place.</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>{stats.map(([label, value, detail]) => <div key={String(label)} style={{ padding: 22, border: `1px solid ${border}`, background: panel, borderRadius: 12 }}><div style={{ fontSize: 9, color: muted, letterSpacing: 1.5 }}>{label}</div><div style={{ fontSize: 30, fontWeight: 700, margin: "12px 0 4px" }}>{value}</div><div style={{ fontSize: 10, color: "#10b981" }}>{detail}</div></div>)}</div><div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}><div style={{ padding: 22, border: `1px solid ${border}`, background: panel, borderRadius: 12 }}><h3>Problem Statement Distribution</h3>{problems.map((problem) => <div key={problem.id} style={{ margin: "18px 0" }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}><span>{problem.id}</span><span>{problem.teams}/{problem.maxTeams}</span></div><div style={{ height: 5, background: dark ? "#1c2937" : "#e4eaf0", borderRadius: 5, marginTop: 7 }}><div style={{ width: `${Math.min((problem.teams / problem.maxTeams) * 100, 100)}%`, height: "100%", background: blue, borderRadius: 5 }} /></div></div>)}</div><div style={{ padding: 22, border: `1px solid ${border}`, background: panel, borderRadius: 12 }}><h3>Evaluation Progress</h3><div style={{ display: "grid", placeItems: "center", height: 220 }}><div style={{ width: 135, height: 135, borderRadius: "50%", border: "16px solid #1c2937", borderTopColor: blue, borderRightColor: blue, display: "grid", placeItems: "center" }}><b style={{ fontSize: 27 }}>{teams.length ? Math.round((evaluations.length / teams.length) * 100) : 0}%</b></div></div><div style={{ color: "#10b981", fontSize: 12 }}>Completed: {evaluations.length}</div><div style={{ color: "#f59e0b", fontSize: 12, marginTop: 8 }}>Pending: {Math.max(teams.length - evaluations.length, 0)}</div></div></div></>}
          {active === "Teams" && <Table title="Registered Teams" rows={teams.map((team) => [team.id, team.name, team.college, team.ps ?? "-", team.status, displayScore(team) === null ? "-" : `${displayScore(team)}/100`])} />}
          {active === "Problem Statements" && <div><h2>Problem Statements</h2><p style={{ color: muted }}>Teams choose a problem statement based on their selected theme.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 15 }}>{problems.map((problem) => <div key={problem.id} style={{ padding: 20, background: panel, border: `1px solid ${border}`, borderRadius: 12 }}><span style={{ color: blue, fontSize: 11 }}>{problem.id} / {problem.theme}</span><h3>{problem.title}</h3><p style={{ color: muted }}>{problem.teams}/{problem.maxTeams} teams selected</p></div>)}</div></div>}
          {active === "Evaluations" && <><div style={{ display: "flex", gap: 10, marginBottom: 20 }}><select value={activeJudgeId} onChange={(event) => { setSelectedJudgeId(event.target.value); if (role === "judge") { const firstAssigned = assignments.find((assignment) => assignment.judge_id === event.target.value); const firstTeam = teams.find((team) => team.dbId === firstAssigned?.team_id); if (firstTeam) setSelectedTeamId(firstTeam.id); } }} style={{ padding: 10, background: panel, color: text, border: `1px solid ${border}`, borderRadius: 8 }}>{judges.map((judge) => <option key={judge.id} value={judge.id}>{judge.name}</option>)}</select><select value={activeTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} style={{ padding: 10, background: panel, color: text, border: `1px solid ${border}`, borderRadius: 8 }}>{(role === "judge" ? assignedTeams : teams).map((team) => <option key={team.id} value={team.id}>{team.id} - {team.name}</option>)}</select></div><Evaluation team={evaluationTeam} judge={selectedJudge} scores={scores} setScores={setScores} total={total} submitted={submitted} saving={saving} onSubmit={submitEvaluation} /></>}
          {active === "Leaderboard" && <Table title="Leaderboard" rows={[...teams].sort((a, b) => (displayScore(b) ?? 0) - (displayScore(a) ?? 0)).map((team, index) => [`#${index + 1}`, team.name, team.college, team.ps ?? "-", team.status, displayScore(team) === null ? "-" : `${displayScore(team)}/100`])} />}
          {active === "Announcements" && <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 12, padding: 25 }}><h2>Announcements</h2>{announcements.map((announcement) => <div key={announcement.id} style={{ padding: 18, borderBottom: `1px solid ${border}` }}>{announcement.title}: {announcement.message}</div>)}</div>}
          {active === "Choose Problem" && <div><h2>Choose Problem Statement</h2><p style={{ color: muted }}>Select one problem statement for your team.</p>{problems.map((problem) => { const taken = problem.teams >= problem.maxTeams && problem.id !== currentPS; return <button disabled={taken || saving} key={problem.id} onClick={() => void chooseProblem(problem.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: 18, margin: "10px 0", background: currentPS === problem.id ? (dark ? "#0b2942" : "#e8f4ff") : panel, color: text, border: `1px solid ${currentPS === problem.id ? blue : border}`, borderRadius: 10, cursor: taken ? "not-allowed" : "pointer", opacity: taken ? 0.5 : 1 }}><b>{problem.id}</b> - {problem.title}<span style={{ float: "right", color: blue }}>{problem.teams}/{problem.maxTeams}</span></button>})}</div>}
          {active === "My Team" && <Table title="My Team" rows={selectedTeam ? [[selectedTeam.id, selectedTeam.name, selectedTeam.college, selectedTeam.ps ?? "-", selectedTeam.status, displayScore(selectedTeam) === null ? "-" : `${displayScore(selectedTeam)}/100`]] : []} />}
          {active === "Submission" && <div style={{ background: panel, border: `1px solid ${border}`, borderRadius: 12, padding: 30 }}><h2>Final Submission</h2><p style={{ color: muted }}>Problem Statement: <b style={{ color: text }}>{(selectedTeam?.ps ?? selectedPS) || "Not selected"}</b></p><p style={{ color: muted }}>Submission status: {submissions.find((submission) => submission.team_id === selectedTeam?.dbId)?.status ?? "Not submitted"}</p></div>}
          {active === "Assigned Teams" && <><select value={activeJudgeId} onChange={(event) => setSelectedJudgeId(event.target.value)} style={{ padding: 10, marginBottom: 10, background: panel, color: text, border: `1px solid ${border}`, borderRadius: 8 }}>{judges.map((judge) => <option key={judge.id} value={judge.id}>{judge.name}</option>)}</select><Table title={selectedJudge ? `Assigned Teams - ${selectedJudge.name}` : "Assigned Teams"} rows={assignedTeams.map((team) => [team.id, team.name, team.college, team.ps ?? "-", team.status, displayScore(team) === null ? "-" : `${displayScore(team)}/100`])} /></>}
        </div>
      </section>
    </main>
  );
}

function Table({ title, rows }: { title: string; rows: string[][] }) { return <div><h2>{title}</h2><div style={{ overflowX: "auto", marginTop: 20 }}><table style={{ width: "100%", borderCollapse: "collapse", background: "var(--panel,#0b1421)" }}><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} style={{ padding: 17, borderBottom: "1px solid #1c2b3d", fontSize: 12 }}>{cell}</td>)}</tr>)}</tbody></table></div></div>; }

function Evaluation({ team, judge, scores, setScores, total, submitted, saving, onSubmit }: { team?: Team; judge?: Judge; scores: number[]; setScores: (scores: number[]) => void; total: number; submitted: boolean; saving: boolean; onSubmit: () => void }) {
  return <div><h2>Judge Evaluation</h2><p style={{ color: "#7f93aa" }}>{team?.name ?? "No team selected"} / {team?.id ?? "-"} / {team?.ps ?? "-"} {judge ? `/ ${judge.name}` : ""}</p><div style={{ maxWidth: 750 }}>{criteria.map(([name, label, max], index) => <div key={name} style={{ margin: "22px 0" }}><div style={{ display: "flex", justifyContent: "space-between" }}><b>{label}</b><span>{scores[index]} / {max}</span></div><input type="range" min="0" max={max} value={scores[index]} onChange={(event) => { const next = [...scores]; next[index] = Number(event.target.value); setScores(next); }} style={{ width: "100%", accentColor: "#1688e8" }} /></div>)}<h2>Total Score: {total}/100</h2><button disabled={!team || !judge || saving} onClick={onSubmit} style={{ background: "#1688e8", color: "white", border: 0, padding: "13px 24px", borderRadius: 8 }}>{saving ? "Saving..." : submitted ? "Evaluation Submitted" : "Submit Evaluation"}</button></div></div>;
}