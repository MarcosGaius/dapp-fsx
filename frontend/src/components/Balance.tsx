import { cn } from "@/lib/utils";
import { ethers } from "ethers";

export interface BalanceProps {
  fls: bigint | null;
  rate: bigint | null; // 1 usdc for n fls
  loading?: boolean;
}

export const Balance = ({ fls, rate, loading }: BalanceProps) => {
  const formattedFls = fls ? ethers.formatUnits(fls, 6) : 0;
  const formattedRate = rate ? ethers.formatUnits(rate, 6) : 0;

  const scale = BigInt(1e6); // scale factor for 6 decimal places
  const formatedUsdc = fls && rate ? ethers.formatUnits((fls * scale) / rate, 6) : 0;

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-purple-500/20">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Your Balance</h2>
        <div className="flex flex-col">
          <span className={cn("text-2xl font-bold text-green-400", loading && "animate-pulse")}>{formattedFls} FLS</span>
          <span className={cn("text-md text-green-200", loading && "animate-pulse")}>or {formatedUsdc} USDC</span>
        </div>
        <p className={cn("text-sm text-gray-400", loading && "animate-pulse")}>Exchange Rate: 1.0 USDC = {formattedRate} FLS</p>
      </div>
    </div>
  );
};
