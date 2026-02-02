export type AppRole = "admin" | "dispatcher" | "worker";

export type AppUserProfile = {
  id: string;
  company_id: string;
  role: AppRole;
  full_name: string | null;
  phone: string | null;
};

