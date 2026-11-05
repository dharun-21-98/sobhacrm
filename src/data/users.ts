export type Role = "RM" | "TL" | "Leadership";
export type User = {
  id: string;
  name: string;
  role: Role;
  managerId?: string;
  team: string;
  capacity?: number;
};
export const users: User[] = [
  {
    id: "rm1",
    name: "Ananya Sharma",
    role: "RM",
    managerId: "tl1",
    team: "South",
    capacity: 300,
  },
  {
    id: "rm2",
    name: "Arjun Menon",
    role: "RM",
    managerId: "tl1",
    team: "South",
    capacity: 90,
  },
  {
    id: "rm3",
    name: "Priya Nair",
    role: "RM",
    managerId: "tl1",
    team: "South",
    capacity: 100,
  },
  {
    id: "rm4",
    name: "Rahul Rao",
    role: "RM",
    managerId: "tl2",
    team: "North",
    capacity: 100,
  },
  {
    id: "tl1",
    name: "Vikram Desai",
    role: "TL",
    managerId: "lead1",
    team: "South",
  },
  {
    id: "tl2",
    name: "Kavya Reddy",
    role: "TL",
    managerId: "lead1",
    team: "North",
  },
  { id: "lead1", name: "Meera Iyer", role: "Leadership", team: "Enterprise" },
];
export const getUser = (id: string) => users.find((user) => user.id === id);
export const roleName = (role: Role) =>
  ({ RM: "Relationship Manager", TL: "Team Lead", Leadership: "Leadership" })[
    role
  ];
export function reportingRms(userId: string): User[] {
  const user = getUser(userId);
  return users.filter(
    (rm) =>
      rm.role === "RM" &&
      (user?.role === "Leadership" ||
        (user?.role === "TL" ? rm.managerId === userId : rm.id === userId)),
  );
}
