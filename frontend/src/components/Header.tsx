import { WalletButton } from "./WalletButton";

export const Header = () => {
  return (
    <header className="flex justify-between items-center">
      <h1 className="text-3xl font-bold">
        <span>🪙 </span>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">fsx token</span>
      </h1>
      <WalletButton />
    </header>
  );
};
