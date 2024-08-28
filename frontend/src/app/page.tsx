"use client";

import { useEffect, useState } from "react";
import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import { ConnectRequest } from "@/components/ConnectRequest";
import { Balance } from "@/components/Balance";
import { FLS_TOKEN_CONTRACT, POOL_TOKEN_CONTRACT, USDC_CONTRACT } from "@/constants";
import { Transaction, TxsTable } from "@/components/TxsTable";
import MainSkeleton from "@/components/Skeleton";
import useContract from "@/hooks/useContract";
import flsAbi from "@/artifacts/fls-abi.json";
import poolAbi from "@/artifacts/pool-abi.json";
import erc20Abi from "@/artifacts/erc20-abi.json";
import { Actions } from "@/components/Actions";
import { FlsAbi, PoolAbi, Erc20Abi } from "@/types";
import { ethers } from "ethers";
import { TypedContractEvent, TypedEventLog } from "@/types/common";
import { SwapUSDCForFLSEvent } from "@/types/PoolAbi";

type SwapEventsLogs = TypedEventLog<
  TypedContractEvent<SwapUSDCForFLSEvent.InputTuple, SwapUSDCForFLSEvent.OutputTuple, SwapUSDCForFLSEvent.OutputObject>
>;

const buildTxFromEvent = async (event: SwapEventsLogs, provider: ethers.BrowserProvider) => {
  const isFlsForUsdc = event.eventName === "SwapFLSForUSDC";

  const timestamp = (await provider.getBlock(event.blockNumber))?.timestamp;

  const { "0": sender, "1": v1, "2": v2 } = event.args;
  const date = timestamp ? new Date(timestamp * 1000).toISOString().split("T")[0] : "";
  const time = timestamp ? new Date(timestamp * 1000).toISOString().split("T")[1].split(".")[0] : "";
  const action = isFlsForUsdc ? "Withdraw" : "Deposit";

  return {
    date,
    time,
    action,
    amount: +ethers.formatUnits(isFlsForUsdc ? v1 : v2, 6),
    hash: event.transactionHash,
  } satisfies Transaction;
};

export default function Page() {
  const { status, address } = useWeb3ModalAccount();
  const { contract: flsContract } = useContract<FlsAbi>(FLS_TOKEN_CONTRACT, flsAbi);
  const { contract: poolContract } = useContract<PoolAbi>(POOL_TOKEN_CONTRACT, poolAbi);
  const { contract: usdcContract, provider } = useContract<Erc20Abi>(USDC_CONTRACT, erc20Abi);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [rate, setRate] = useState<bigint | null>(null);
  const [loading, setLoading] = useState({ fls: true, pool: true, events: true });

  useEffect(() => {
    if (!flsContract || !address) return;
    const initializeBalance = async () => {
      try {
        setLoading((prev) => ({ ...prev, fls: true }));
        const balance = await flsContract.balanceOf(address);
        setBalance(balance);
      } catch (error) {
        console.error("Failed to initialize balance:", error);
      } finally {
        setLoading((prev) => ({ ...prev, fls: false }));
      }
    };
    initializeBalance();
  }, [flsContract, address]);

  useEffect(() => {
    if (!poolContract) return;
    const initializeRate = async () => {
      try {
        setLoading((prev) => ({ ...prev, pool: true }));
        const rate = await poolContract.getExchangeRate();
        setRate(rate);
      } catch (error) {
        console.error("Failed to initialize rate:", error);
      } finally {
        setLoading((prev) => ({ ...prev, pool: false }));
      }
    };
    initializeRate();
  }, [poolContract]);

  useEffect(() => {
    if (!poolContract || !address || !provider) return;

    const fetchPastEvents = async () => {
      try {
        setLoading((prev) => ({ ...prev, events: true }));
        const flsUsdcfilter = poolContract.filters.SwapFLSForUSDC(address);
        const usdcFlsfilter = poolContract.filters.SwapUSDCForFLS(address);

        const currentBlockNumber = await provider.getBlockNumber();

        // Getting only the past 45000 blocks
        const events = await Promise.all([
          poolContract.queryFilter(usdcFlsfilter, currentBlockNumber - 45000, "latest"),
          poolContract.queryFilter(flsUsdcfilter, currentBlockNumber - 45000, "latest"),
        ]);

        const formattedTransactions = events.flat().map(async (event) => buildTxFromEvent(event, provider));

        setTransactions(await Promise.all(formattedTransactions));
      } catch (error) {
        console.error("Failed to fetch past events:", error);
      } finally {
        setLoading((prev) => ({ ...prev, events: false }));
      }
    };

    fetchPastEvents();
  }, [address, poolContract, provider]);

  // useEffect(() => {
  //   if (!poolContract || !address || !provider) return;

  //   const handleEvent = async (sender: any, v1: any, v2: any, event: SwapEventsLogs) => {
  //     const newTx = await buildTxFromEvent(event, provider);
  //     setTransactions((prevTransactions) => [newTx, ...prevTransactions]);
  //   };

  //   const usdForFlsEvent = poolContract.getEvent("SwapUSDCForFLS");
  //   const flsForUsdcEvent = poolContract.getEvent("SwapFLSForUSDC");

  //   poolContract.on(usdForFlsEvent, handleEvent);
  //   poolContract.on(flsForUsdcEvent, handleEvent);

  //   return () => {
  //     poolContract.off(usdForFlsEvent, handleEvent);
  //     poolContract.off(flsForUsdcEvent, handleEvent);
  //   };
  // }, [poolContract, address]);

  const onDeposit = async (value: bigint) => {
    if (!poolContract || !usdcContract || !address) return;
    try {
      const currentAllowance = await usdcContract.allowance(address, POOL_TOKEN_CONTRACT);

      if (currentAllowance < value) {
        const tx = await usdcContract.approve(POOL_TOKEN_CONTRACT, value - currentAllowance);
        await tx.wait();
      }

      const tx = await poolContract.swapUsdcForFls(value);
      await tx.wait();
      setBalance((prev) => (prev ? prev + value : value));
    } catch (error) {
      console.error("Error setting allowance:", error);
    }
  };

  const onWithdraw = async (value: bigint) => {
    if (!poolContract || !address) return;
    try {
      const tx = await poolContract.swapFlsForUsdc(value);
      await tx.wait();
      setBalance((prev) => (prev ? prev - value : null));
    } catch (error) {
      console.error("Error setting allowance:", error);
    }
  };

  if (status === "reconnecting") return <MainSkeleton />;
  if (status === "disconnected")
    return (
      <div className="flex items-center justify-center h-full flex-grow">
        <ConnectRequest />
      </div>
    );

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Balance fls={balance} rate={rate} loading={loading.fls || loading.pool} />
          <Actions balance={balance} onDeposit={onDeposit} onWithdraw={onWithdraw} />
        </div>
        <TxsTable transactions={transactions} loading={loading.events} />
      </div>
    </div>
  );
}
