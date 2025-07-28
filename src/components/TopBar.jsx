import { WalletDisconnectButton, WalletMultiButton } from "@solana/wallet-adapter-react-ui"

const TopBar = () => {
    return (
        <div>
            <div className=" shadow-xl flex justify-between px-10 py-4 backdrop-blur-md">
                <WalletMultiButton />
                <WalletDisconnectButton />
            </div>
        </div>
    )
}
export default TopBar