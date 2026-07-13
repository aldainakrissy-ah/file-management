export type User = {
  id: string;
  name: string;
  email: string;
};

export type Role = "owner" | "edit" | "view";

export type DocumentSummary = {
  id: string;
  title: string;
  content: unknown;
  ownerId: string;
  ownerName?: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export type DocumentsListResponse = {
  owned: DocumentSummary[];
  shared: DocumentSummary[];
};

export type Share = {
  id: string;
  userId: string;
  name: string;
  email: string;
  permission: "view" | "edit";
};
