export type TeamStatus =
  | "REGISTERED"
  | "PS_SELECTED"
  | "BUILDING"
  | "SUBMITTED"
  | "EVALUATED";

export type Team = {
  id: string;
  name: string;
  leader: string;
  members: number;
  email: string;
  ps: string | null;
  theme: string;
  status: TeamStatus;
  score: number | null;
  submittedAt: string | null;
};

export type ProblemStatement = {
  id: string;
  title: string;
  description: string;
  theme: string;
  capacity: number;
  selected: number;
};

export type Judge = {
  id: string;
  name: string;
  organization: string;
  assignedTeams: number;
  evaluated: number;
};

export const teams: Team[] = [
  {
    id: "HK-001",
    name: "Team Nova",
    leader: "Arman Khan",
    members: 4,
    email: "nova@example.com",
    ps: "AI-01",
    theme: "Artificial Intelligence",
    status: "SUBMITTED",
    score: 86,
    submittedAt: "20 Sep, 10:42 PM",
  },
  {
    id: "HK-002",
    name: "CodeCrafters",
    leader: "Sarah Khan",
    members: 4,
    email: "codecrafters@example.com",
    ps: "CY-01",
    theme: "Cybersecurity",
    status: "EVALUATED",
    score: 91,
    submittedAt: "20 Sep, 11:05 PM",
  },
  {
    id: "HK-003",
    name: "ByteForce",
    leader: "Rahul Patil",
    members: 3,
    email: "byteforce@example.com",
    ps: "HT-01",
    theme: "Healthcare Technology",
    status: "BUILDING",
    score: null,
    submittedAt: null,
  },
  {
    id: "HK-004",
    name: "Innovators",
    leader: "Ayesha Noor",
    members: 4,
    email: "innovators@example.com",
    ps: "AG-01",
    theme: "AgriTech",
    status: "PS_SELECTED",
    score: null,
    submittedAt: null,
  },
  {
    id: "HK-005",
    name: "Tech Titans",
    leader: "Vikram Rao",
    members: 4,
    email: "techtitans@example.com",
    ps: null,
    theme: "",
    status: "REGISTERED",
    score: null,
    submittedAt: null,
  },
];

export const problemStatements: ProblemStatement[] = [
  {
    id: "AI-01",
    title: "AI-Powered Student Assistant",
    description:
      "Build an intelligent assistant that improves student learning, productivity and access to academic resources.",
    theme: "Artificial Intelligence",
    capacity: 10,
    selected: 3,
  },
  {
    id: "AI-02",
    title: "Intelligent Automation Platform",
    description:
      "Develop an AI-driven solution capable of automating repetitive real-world workflows.",
    theme: "Artificial Intelligence",
    capacity: 10,
    selected: 3,
  },
  {
    id: "CY-01",
    title: "Campus Cybersecurity",
    description:
      "Create a practical cybersecurity solution for identifying, preventing or responding to digital threats.",
    theme: "Cybersecurity",
    capacity: 10,
    selected: 4,
  },
  {
    id: "HT-01",
    title: "Smart Healthcare",
    description:
      "Design technology that improves healthcare accessibility, monitoring or patient experience.",
    theme: "Healthcare Technology",
    capacity: 10,
    selected: 2,
  },
  {
    id: "AG-01",
    title: "Future of Agriculture",
    description:
      "Build a technology-driven solution addressing agricultural productivity, sustainability or farmer support.",
    theme: "AgriTech",
    capacity: 10,
    selected: 5,
  },
  {
    id: "SI-01",
    title: "Smart Infrastructure",
    description:
      "Develop a technology solution for improving infrastructure, mobility or public services.",
    theme: "Smart Infrastructure",
    capacity: 10,
    selected: 3,
  },
];

export const judges: Judge[] = [
  {
    id: "J-01",
    name: "Judge 01",
    organization: "Industry",
    assignedTeams: 10,
    evaluated: 7,
  },
  {
    id: "J-02",
    name: "Judge 02",
    organization: "Academia",
    assignedTeams: 10,
    evaluated: 6,
  },
  {
    id: "J-03",
    name: "Judge 03",
    organization: "Technology",
    assignedTeams: 10,
    evaluated: 5,
  },
];

export const announcements = [
  {
    id: 1,
    title: "Final submission window is open",
    message:
      "Teams can now submit their final project before the submission deadline.",
    time: "12 minutes ago",
    type: "INFO",
  },
  {
    id: 2,
    title: "Judging has started",
    message:
      "Judges can now access assigned teams and begin evaluations.",
    time: "28 minutes ago",
    type: "URGENT",
  },
  {
    id: 3,
    title: "Problem statement selection completed",
    message:
      "Teams should verify their selected problem statement from the dashboard.",
    time: "1 hour ago",
    type: "INFO",
  },
];
