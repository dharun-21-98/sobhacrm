export type Target = {
  id: string;
  rmId: string;
  month: string;
  projectId: number;
  wing: string;
  category: "PC" | "Regular" | "New Billing";
  collection: number;
  handover: number;
  registration: number;
};
export type TagAudit = {
  id: string;
  unitId: string;
  before: string[];
  after: string[];
  actorId: string;
  role: string;
  reason: string;
  date: string;
};
export type Escalation = {
  id: string;
  unitId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  reviewDate: string;
  managerRemark: string;
  assignedRmId: string;
  batchId: string;
  uploadedBy: string;
  uploadedAt: string;
};
