import { ConnectionProvider, useConnection, useWallet, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import TopBar from "./components/TopBar"
import Input from "./components/Input"
import { useState } from "react"
import Button from "./components/Button"
import Pool from "./components/Pool"
import { LoaderProvider } from "./components/LoaderContext" // import it
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {

  const [name, setName] = useState("")
  const [sym, setsym] = useState("")
  const [img, setimg] = useState("")
  const [supply, setsupply] = useState(0)

  return (
    <div className="bg-slate-800 h-screen">
      <ToastContainer
        position="bottom-left"
        autoClose={5000}
        theme="dark"
        toastStyle={{
          background: '#030712',         // Indigo-600
          color: '#fff',
          fontSize: '0.9rem',          // ≈ 18px
          fontWeight: '100',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
          lineHeight: '1.6',
          maxWidth: '400px'
        }}
        bodyStyle={{
          margin: 0,
          padding: 0
        }}
      />

      <LoaderProvider>
        <ConnectionProvider endpoint="https://api.devnet.solana.com" config={{ commitment: 'confirmed' }}>
          <WalletProvider wallets={[]} autoConnect>
            <WalletModalProvider>
              <TopBar />
              <div className="h-[calc(100vh-80px)] flex items-center justify-center">
                <div className="mb-4">
                  <div className="text-5xl text-center text-white font-bold">
                    Solana Token Launchpad
                  </div>
                  <div className="flex gap-10 my-10">
                    <div className="flex items-center justify-center p-2 bg-[#FFFDF8] rounded-2xl">
                      <div className="flex flex-col items-center gap-5 p-2 bg-slate-500 rounded-2xl justify-center">
                        <img className="h-44 w-full object-cover rounded-lg " src="https://images.unsplash.com/photo-1660062993887-4938423dce59?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="" />
                        <div className="flex gap-2 ">
                          <Input Val={name} w="full" fxn={(e) => setName(e.target.value)} title="Name" />
                          <Input Val={sym} w="full" fxn={(e) => setsym(e.target.value)} title="Symbol" /></div>
                        <Input Val={img} w="full" fxn={(e) => setimg(e.target.value)} title="Image Public Url" />
                        <Input Val={supply} w="full" fxn={(e) => setsupply(Number(e.target.value))} title="Initial Supply" type="number" />
                        <Button name={name} symbol={sym} url={img} supply={supply} />
                      </div></div>
                    <div className="p-2 bg-[#FFFDF8] rounded-2xl">
                      <Pool />
                    </div>
                  </div>
                </div>
              </div>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </LoaderProvider>
    </div>
  )
}

export default App
