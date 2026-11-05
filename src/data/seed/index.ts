import { managementSeed } from "../management/seed";
export { users } from "../users";
import { fakerEN_IN as faker } from "@faker-js/faker";
import { config } from "../config";
export type Unit = {
  id: string;
  unitNo: string;
  projectId: number;
  wing: string;
  floor: number;
  name: string;
  coApplicant: string;
  code: string;
  ucn: string;
  mobile: string;
  email: string;
  city: string;
  country: string;
  status: string;
  tags: string[];
  rmIds: string[];
  agreement: number;
  ready: boolean;
  readyDate: string;
  bookingDate: string;
  agreementDate: string;
  tds: boolean;
};
export type Txn = {
  id: string;
  unitId: string;
  type: string;
  debit: number;
  credit: number;
  date: string;
  dueDate: string;
  allocatedTo?: string;
  managementCategory?: "Regular" | "New Billing";
};
export type Remark = {
  id: string;
  unitId: string;
  area: string;
  text: string;
  author: string;
  role: string;
  date: string;
  ticketId?: string;
};
export type Visit = {
  id: string;
  unitId: string;
  category: string;
  status: string;
  date: string;
  note: string;
};
export type Ticket = {
  id: string;
  unitId: string;
  subject: string;
  description: string;
  category: string;
  type: string;
  priority: string;
  status: string;
  source: string;
  date: string;
  team?: string;
  assignedRmId?: string;
  slaDueAt?: string;
};
export type Notification = {
  id: string;
  userId: string;
  text: string;
  link: string;
  isRead: boolean;
};
export type Task = {
  id: string;
  assignedRmId: string;
  unitId: string;
  title: string;
  description: string;
  givenBy: string;
  createdById?: string;
  status: string;
  priority: string;
  date: string;
  dueDate: string;
};
export type Doc = {
  id: string;
  unitId: string;
  name: string;
  bucket: string;
  type: string;
  date: string;
  url?: string;
};
export const projects = [
  {
    id: 0,
    name: "Sobha Neopolis",
    location: "Bangalore",
    address: "Panathur Road, Bangalore",
    oc: "2026-06-01",
  },
  {
    id: 1,
    name: "Sobha Dream Acres",
    location: "Bangalore",
    address: "Balagere, Bangalore",
    oc: "",
  },
  {
    id: 2,
    name: "Sobha City",
    location: "Gurugram",
    address: "Dwarka Expressway, Gurugram",
    oc: "2026-07-01",
  },
  {
    id: 3,
    name: "Sobha Waterfront",
    location: "Hyderabad",
    address: "Somajiguda, Hyderabad",
    oc: "",
  },
];
export const iso = (d = new Date()) => d.toISOString();
export const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();
export function seed() {
  faker.seed(config.seed);
  const units: Unit[] = [],
    ledger: Txn[] = [],
    remarks: Remark[] = [],
    visits: Visit[] = [],
    tickets: Ticket[] = [],
    documents: Doc[] = [];
  const handovers: Record<string, { status: string; date: string }> = {},
    registrations: Record<string, { status: string; date: string }> = {};
  for (let i = 0; i < 520; i++) {
    const hero = i === 0,
      projectId = i < 300 ? 0 : 1 + (i % 3),
      id = `u${i}`,
      unitNo = hero
        ? "B-0902"
        : `${i < 228 ? "B" : ["A", "C", "D"][i % 3]}-${String(100 + i).padStart(4, "0")}`;
    const name = hero ? "Aditya Krishnan" : faker.person.fullName();
    const unit: Unit = {
      id,
      unitNo,
      projectId,
      wing: unitNo[0],
      floor: hero ? 9 : 1 + (i % 24),
      name,
      coApplicant: hero ? "Nisha Krishnan" : faker.person.fullName(),
      code: `C${10000 + i}`,
      ucn: `UCN${20000 + i}`,
      mobile: faker.phone.number(),
      email: faker.internet.email(),
      city: hero ? "Dubai" : faker.location.city(),
      country: hero ? "UAE" : "India",
      status:
        i === 226 || i === 227
          ? "Unsold"
          : i % 20 === 19
            ? "Cancelled"
            : i % 20 === 18
              ? "Shifted"
              : i % 20 === 17
                ? "Reassigned"
                : "Active",
      tags: hero
        ? ["NRI Investor", "Loyal Referrer"]
        : i % 17 === 0
          ? ["Possible Cancellation"]
          : i % 3 === 0
            ? [config.tags[i % 5]]
            : [],
      rmIds: [
        i < 300 ? "rm1" : `rm${2 + (i % 3)}`,
        ...(i % 20 === 0 ? ["rm2"] : []),
      ],
      agreement: hero ? 18500000 : 12000000 + (i % 9) * 1000000,
      ready: i % 3 !== 2,
      readyDate: daysAgo(i % 100 < 37 ? 20 : i % 2 ? 120 : 20),
      bookingDate: daysAgo(600),
      agreementDate: daysAgo(550),
      tds: i % 3 === 0,
    };
    units.push(unit);
    const age = i % 100 < 37 ? 0 : i % 100 < 65 ? 15 : i % 100 < 87 ? 60 : 120;
    const demand = unit.agreement * 0.8,
      remaining = hero || !age ? 0 : 100000 + (i % 13) * 120000;
    ledger.push(
      {
        id: `d${i}`,
        unitId: id,
        type: "Installment",
        debit: demand,
        credit: 0,
        date: daysAgo(180),
        dueDate: daysAgo(age || -15),
      },
      {
        id: `r${i}`,
        unitId: id,
        type: "Receipt",
        debit: 0,
        credit: demand - remaining,
        date: daysAgo(50),
        dueDate: "",
      },
    );
    if (age)
      ledger.push({
        id: `int${i}`,
        unitId: id,
        type: "Interest",
        debit: i % 7 === 0 ? 75 : 500 + (i % 15) * 55000,
        credit: 0,
        date: daysAgo(20),
        dueDate: daysAgo(age),
      });
    if (i < 300 && i !== 226 && i !== 227)
      ledger.push(
        {
          id: `month${i}`,
          unitId: id,
          type: "Receipt",
          debit: 0,
          credit: 182000000 / 298,
          date: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1,
          ).toISOString(),
          dueDate: "",
          allocatedTo: "Installment",
          managementCategory: "New Billing",
        },
        {
          id: `bill${i}`,
          unitId: id,
          type: "Installment",
          debit: 182000000 / 298,
          credit: 0,
          date: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1,
          ).toISOString(),
          dueDate: daysAgo(-10),
        },
      );
    if (i % 4 === 0)
      remarks.push({
        id: `rem${i}`,
        unitId: id,
        area: "Unit",
        text: hero
          ? "Customer confirmed pre-inspection. Share the possession checklist before the visit."
          : "Spoke with customer. Follow up on pending documents this week.",
        author: "Ananya Sharma",
        role: "RM",
        date: daysAgo(i % 8),
      });
    if (i < 50)
      visits.push({
        id: `v${i}`,
        unitId: id,
        category: hero ? "Pre-inspection" : i % 2 ? "Handover" : "Site Visit",
        status: hero
          ? "Scheduled"
          : i % 4 === 0
            ? "Requested"
            : i % 4 === 1
              ? "Completed"
              : "Scheduled",
        date: hero ? "2026-11-02T11:00:00+05:30" : daysAgo((-i % 12) - 1),
        note: "Confirmed by RM",
      });
    if (i < 75)
      tickets.push({
        id: i === 0 ? "TK-1042" : `TK-${1043 + i}`,
        unitId: id,
        subject:
          i === 0
            ? "Payment plan"
            : [
                "TDS receipt confirmation",
                "Possession documents",
                "Payment reconciliation",
                "Site visit request",
              ][i % 4],
        description:
          "Please review the request and provide an update to the customer.",
        category: "Collections",
        type: i < 60 ? "Customer" : "Internal",
        priority: i % 4 === 0 ? "" : ["High", "Medium", "Low"][i % 3],
        status: i % 5 < 2 ? "Open" : "Closed",
        source: i % 2 ? "RM" : "CustomerApp",
        date: hero ? "2026-10-26T10:00:00Z" : daysAgo(i % 20),
      });
    if (i < 12)
      handovers[id] = {
        status: "Appointment Booked",
        date: new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          2,
        ).toISOString(),
      };
    else if (i % 5 === 0)
      handovers[id] = { status: "Initiated", date: daysAgo(12) };
    if (i >= 7 && i % 100 < 37 && projects[projectId].oc)
      registrations[id] = { status: "Completed", date: daysAgo(60) };
    if (i < 7)
      registrations[id] = {
        status: "Completed",
        date: new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          2,
        ).toISOString(),
      };
  }
  // The hero has no overdue balance and stays in Segment 1.
  handovers.u0 = { status: "Appointment Booked", date: iso() };
  const tasks: Task[] = Array.from({ length: 17 }, (_, i) => ({
    id: `task${i}`,
    assignedRmId: "rm1",
    title: [
      "Follow up on TDS receipt",
      "Confirm handover appointment",
      "Review payment reconciliation",
      "Send possession checklist",
    ][i % 4],
    description:
      "Coordinate with the customer and update the interaction record.",
    unitId: i % 4 ? `u${i}` : "",
    givenBy: i % 2 ? "Vikram Desai · TL" : "Meera Iyer · Leadership",
    status: i % 4 === 0 ? "Closed" : "Open",
    priority: ["High", "Medium", "Low"][i % 3],
    date: daysAgo(i),
    dueDate: daysAgo(3 - i),
  }));
  const domains = [
    "Collections & Finance",
    "Query & Support Escalations",
    "Handover & Possession",
    "Internal Operations",
  ];
  const kb = domains.flatMap((domain, d) =>
    Array.from({ length: [24, 18, 15, 11][d] }, (_, i) => ({
      id: `kb${d}-${i}`,
      domain,
      category: ["Guidelines", "SOP", "FAQ", "Template"][i % 4],
      title: [
        "TDS / Form 16B tracking",
        "Bank / home loan NOC",
        "Possession handover checklist",
        "Soft reminder notice",
        "Cancellation guidelines",
        "NRI payment routing",
        "KYC re-verification",
        "Transfer / resale prerequisites",
      ][i % 8],
      tags: ["TDS", "NOC", "customer support"],
      body: "## Customer guidance\n\nLog every interaction as a remark. Verify the customer and unit details before proceeding.\n\n1. Review the account statement and supporting documents.\n2. Coordinate with Sales Accounts for confirmation.\n3. Share an update with the customer.\n\nDo not commit waivers without approval.",
      date: daysAgo(i === 0 ? 2 : 30 + i),
    })),
  );
  const upsells = units
    .filter((_, i) => i % 4 === 0)
    .flatMap((u, i) =>
      Array.from({ length: i % 3 === 0 ? 2 : 1 }, (_, j) => ({
        id: `UP-${i}-${j}`,
        unitId: u.id,
        category: config.upsells[(i + j) % 5],
        status: ["Initiated", "In Progress", "Closed", "Rejected", "Cancelled"][
          i % 5
        ],
        source: i % 2 ? "RM" : "CustomerApp",
        date: daysAgo(i % 20),
      })),
    );
  const notifications: Notification[] = Array.from({ length: 5 }, (_, i) => ({
    id: `n${i}`,
    userId: "rm1",
    text: [
      "New ticket · Payment plan",
      "Task assigned: Follow up on TDS",
      "Site visit requested",
      "Documents received",
      "Weekly portfolio update",
    ][i],
    link:
      i === 0
        ? "/tickets/TK-1042"
        : i === 1
          ? "/workspace/tasks"
          : "/customers/u0",
    isRead: i > 2,
  }));
  tickets.forEach((t) => {
    t.assignedRmId = units.find((u) => u.id === t.unitId)!.rmIds[0];
    t.team = t.team || "Sales Accounts";
  });
  return {
    units,
    ledger,
    remarks,
    visits,
    tickets,
    documents,
    handovers,
    registrations,
    tasks,
    kb,
    upsells,
    notifications,
    ...managementSeed(units),
  };
}
export type Database = ReturnType<typeof seed>;
