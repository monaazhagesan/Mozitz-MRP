import { useAuth } from "@/hooks/useAuth";

export const useCurrency = () => {
  const { user } = useAuth();
  return user?.currency || "INR";
};