import { useCurrency } from "@/hooks/useCurrency";
import { formatMoney } from "@/utils/formatMoney";

export const Money = ({ value }: { value: number }) => {
  const currency = useCurrency();

  return <>{formatMoney(value, currency)}</>;
};