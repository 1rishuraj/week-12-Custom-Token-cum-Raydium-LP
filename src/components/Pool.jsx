// import dependencies
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getMint
} from "@solana/spl-token";

import { useEffect, useState } from "react";
import { useLoader } from "./LoaderContext";
import BN from "bn.js";
import { DEVNET_PROGRAM_ID, getCpmmPdaAmmConfigId, Percent, Raydium, TxVersion } from "@raydium-io/raydium-sdk-v2";
import Input from "./Input";
import Decimal from 'decimal.js'
import { getTokenMetadata } from "@solana/spl-token";
import { toast } from 'react-toastify';

const Pool = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [poolpub, setpoolpub] = useState("")
  const [Aamt, setAamt] = useState(0)
  const [Bamt, setBamt] = useState(0)
  const [poolIds, setpoolIds] = useState([])
  const [depoId, setdepoId] = useState("")
  const [depoTokens, setdepoTokens] = useState(0)
  const [burnId, setburnId] = useState("")
  const [burnLPTokens, setburnLPTokens] = useState(0)
  const { showLoader, hideLoader } = useLoader();
  const [solbal, setsolbal] = useState(0)
  async function getbail() {
    if (wallet.connected) {
      const lamports = await connection.getBalance(wallet.publicKey);
      const solBalance = lamports / 1e9; // 1 SOL = 1 billion lamports
      setsolbal(solBalance)
    } else {
      setsolbal(0); // Reset the balance to 0 when wallet is disconnected
    }
  }

  useEffect(() => {
    const ids = localStorage.getItem("ids");
    if (ids) {
      try {
        const thids = JSON.parse(ids)
        console.log(thids)
        setpoolIds(thids);
      } catch (err) {
        console.error("Failed to parse ids from localStorage:", err);
      }
    }
    async function getbal() {
      await getbail()
    }
    getbal();

  }, [wallet.connected]);

  async function pooler() {
    try {
      showLoader();
      if (!wallet.publicKey) {
        toast.error("Connect wallet First")
        return
      }
      if (poolpub === "So11111111111111111111111111111111111111112") {
        toast.error("⚠️ Please enter a Custom Token Address that is different from WSOL.");
        return;
      }

      if (poolpub.length == 0 || Aamt <= 0 || Bamt <= 0) {
        toast.error("Please fill Liquidity-Pool details correctly")
        return;
      }

      const mint = new PublicKey(poolpub); // your Token22 mint
      const owner = wallet.publicKey; // replace with your wallet address

      // Find the associated token account for this wallet and mint
      const ata = getAssociatedTokenAddressSync(mint, owner, undefined, TOKEN_2022_PROGRAM_ID);
      console.log(ata.toBase58())
      // Fetch account info
      const accountInfo = await getAccount(connection, ata, "confirmed", TOKEN_2022_PROGRAM_ID);

      // Get raw balance in base units (e.g., 50000000 if 0.05 with 9 decimals)
      const rawAmount = accountInfo.amount;
      const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
      const decimals = mintInfo.decimals;
      const num = Number(rawAmount) / Math.pow(10, decimals)
      if (Aamt > num) {
        toast.error(
          <div className="space-y-1">
            <div>🚨 <strong>Token Amount Exceeded</strong></div>
            <div>The amount you entered exceeds your available token balance.</div>
            <div><strong>Available Balance:</strong> {num} tokens</div>
            <div>Please enter a lower amount.</div>
          </div>
        );

        return
      }

      if (Bamt > solbal) {
        toast.error(
          <div className="space-y-1">
            <div>🚨 <strong>Insufficient SOL Balance</strong></div>
            <div>Your current SOL balance is insufficient.</div>
            <div><strong>Available Balance:</strong> {solbal} SOL</div>
            <div>Please enter a lower amount.</div>
          </div>
        );
        return
      }
      // Raydium Init

      const raydium = await Raydium.load({
        owner: wallet.publicKey,
        connection: connection,
        cluster: "devnet",
        signAllTransactions: wallet.signAllTransactions, // optional
        disableFeatureCheck: true,
        blockhashCommitment: 'finalized',
      });

      const mintA = await raydium.token.getTokenInfo(new PublicKey(poolpub).toBase58());
      const mintB = await raydium.token.getTokenInfo(NATIVE_MINT.toBase58());
      const feeConfigs = await raydium.api.getCpmmConfigs();
      const txVersion = TxVersion.V0 // or TxVersion.LEGACY
      if (raydium.cluster === 'devnet') {
        feeConfigs.forEach((config) => {
          // config.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, config.index).publicKey.toBase58()
          config.id = getCpmmPdaAmmConfigId(
            DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
            config.index
          ).publicKey.toBase58()
        })
      }



      const { execute, extInfo } = await raydium.cpmm.createPool({
        programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
        poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
        mintA,
        mintB,
        mintAAmount: new BN(new Decimal(Aamt).mul(10 ** decimals).toFixed(0)),
        mintBAmount: new BN(new Decimal(Bamt).mul(1e9).toFixed(0)),
        startTime: new BN(0),
        feeConfig: feeConfigs[0],
        associatedOnly: false,
        ownerInfo: { useSOLBalance: true },
        txVersion,
      });
      const poolId = extInfo.address.poolId; /// likely a PublicKey or BN wrapped inside

      if (poolIds.find(idx => idx.val == poolId)) {
        toast.error("This Token's Liquidity pool with SOL already exists")
        return;
      }

      const { txId } = await execute({ sendAndConfirm: true });
      console.log(txId)
      console.log('Pool creation extInfo:', extInfo);
      // extInfo.poolId is a PublicKey instance


      const metadata = await getTokenMetadata(connection, new PublicKey(poolpub));
      console.log(metadata)
      // alert(metadata.name)


      let newpoolids = [...poolIds, { key: metadata.name, val: poolId }]
      // let newpoolids = [...poolIds, { key: metadata.name, val: "kuch bhi" }]
      setpoolIds(newpoolids)
      localStorage.setItem("ids", JSON.stringify(newpoolids))

      console.log(extInfo.address.lpMint.toBase58())

      // Log the derived Base58 poolId
      console.log('Derived poolId:', poolId.toBase58());
      toast.success(<a href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`} target="_blank" rel="noreferrer">View Txn of 🧪 Pool Created!</a>);
      // await new Promise(resolve=>{
      //     setTimeout(()=>resolve(1),1000)
      // })
      // alert("✨ Your token is live on Solana!");
    } catch (error) {
      console.error(error);
    } finally {

      hideLoader();
      setpoolpub("")
      setAamt(0)
      setBamt(0)
      await getbail()
    }
  }

  async function depositLiquidity() {
    try {
      showLoader();
      if (!wallet.publicKey) {
        toast.error("Connect wallet First")
        return
      }
      if (depoId.length == 0 || depoTokens <= 0) {
        toast.error("Please fill Liquidity-Deposit details correctly")
        return;
      } else {
        toast.info(`Depositting to Liquity Pool`)
      }
      const raydium = await Raydium.load({
        owner: wallet.publicKey,
        connection: connection,
        cluster: "devnet",
        signAllTransactions: wallet.signAllTransactions,
        disableFeatureCheck: true,
        blockhashCommitment: 'finalized',
      });

      // const mintA = await raydium.token.getTokenInfo(new PublicKey(poolpub).toBase58());
      // const mintB = await raydium.token.getTokenInfo(NATIVE_MINT.toBase58());
      // // const poolInfo = await raydium.api.get(mintA.mint, mintB.mint);
      const data = await raydium.cpmm.getPoolInfoFromRpc(depoId)
      let poolInfo = data.poolInfo
      let poolKeys = data.poolKeys


      //Calculating input custom token is present in the ATA or not
      let minthere;
      if (data.poolInfo.mintA.address == 'So11111111111111111111111111111111111111112') {
        minthere = new PublicKey(data.poolInfo.mintB.address)
        console.log('B\n')
      }
      else {
        minthere = new PublicKey(data.poolInfo.mintA.address)
        console.log('A\n')
      }

      const owner = wallet.publicKey; // replace with your wallet address

      // Find the associated token account for this wallet and mint
      const ata = await getAssociatedTokenAddressSync(minthere, owner, undefined, TOKEN_2022_PROGRAM_ID);
      console.log(ata.toBase58())
      // Fetch account info
      const accountInfo = await getAccount(connection, ata, "confirmed", TOKEN_2022_PROGRAM_ID);

      // Get raw balance in base units (e.g., 50000000 if 0.05 with 9 decimals)
      const rawAmount = accountInfo.amount;
      const mintInfo = await getMint(connection, minthere, "confirmed", TOKEN_2022_PROGRAM_ID);
      const decimals = mintInfo.decimals;
      const num = Number(rawAmount) / Math.pow(10, decimals)
      if (depoTokens > num) {
        toast.error(
          <div style={{ lineHeight: '1.6' }}>
            <div>🚨 <strong>Token Amount Exceeded</strong></div>
            <div><strong>Available Balance:</strong> {num} tokens</div>
            <div>Please enter a lower amount.</div>
          </div>
        );
        return
      } else {
        toast.info(
          <div className="space-y-1">
            <div>✅ You are about to deposit <strong>{depoTokens}</strong> tokens.</div>
            <div>📊 <strong>Available Balance:</strong> {num} tokens</div>
          </div>
        );
      }

      //Calculating corresponding needed SOl for deposit to pool
      const res = await raydium.cpmm.getRpcPoolInfos([depoId]);
      const pool1Info = res[depoId];
      const isCustomBase = pool1Info.mintA.equals(minthere);
      const mybaseIn = isCustomBase; // true if mintA is custom token, false if mintB is custom token
      if (mybaseIn) {
        console.log(mybaseIn + 'A\n')
      } else {
        console.log(mybaseIn + 'B\n')
      }

      const computeRes = await raydium.cpmm.computePairAmount({
        baseReserve: pool1Info.baseReserve,
        quoteReserve: pool1Info.quoteReserve,
        poolInfo,
        amount: depoTokens.toString(),
        slippage: new Percent(1, 100),
        baseIn: mybaseIn,
        epochInfo: await raydium.fetchEpochInfo()
      });
      const neededSol = Number(computeRes.maxAnotherAmount.amount) / 1e9;
      if (neededSol > solbal) {
        toast.error(
          <div style={{ lineHeight: '1.6' }}>
            <div>⚠️ <strong>Insufficient SOL Balance!</strong></div>
            <div>
              You need <strong>{neededSol.toFixed(6)} SOL</strong> to maintain the pool ratio,
              but your wallet only contains <strong>{solbal.toFixed(6)} SOL</strong>.
            </div>
            <div>Please top up your wallet before trying again.</div>
          </div>
        );
        return;
      } else {
        toast.info(
          <div style={{ lineHeight: '1.6' }}>
            <div>✅ <strong>Liquidity Provision Info</strong></div>
            <div>
              Approximately <strong>{neededSol.toFixed(6)} SOL</strong> will be debited from your wallet
              to deposit into the liquidity pool.
            </div>
          </div>
        );
      }


      // computeRes.anotherAmount.amount -> pair amount needed to add liquidity
      // computeRes.anotherAmount.fee -> token2022 transfer fee, might be undefined if isn't token2022 program

      const whatsbase = new PublicKey(poolInfo.mintA.address).equals(minthere);
      const customDecimals = whatsbase ? poolInfo.mintA.decimals : poolInfo.mintB.decimals;

      const { execute } = await raydium.cpmm.addLiquidity({
        poolInfo,
        poolKeys,
        inputAmount: new BN(new Decimal(depoTokens.toString()).mul(10 ** customDecimals).toFixed(0)),
        slippage: new Percent(1, 100),
        baseIn: whatsbase,//if custom token is mintB then basin:false as basin:true only if mintA is depotoken
        txVersion: TxVersion.V0,
      });

      const { txId } = await execute({ sendAndConfirm: true });
      console.log(txId)
      toast.success(<a href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`} target="_blank" rel="noreferrer">View Txn of💧 Deposited Liquidity!</a>);

    } catch (error) {
      console.error(error);
    } finally {

      hideLoader();
      setdepoId("")
      setdepoTokens(0)
      await getbail()
    }
  }

  async function withdraw() {
    try {
      showLoader();
      if (!wallet.publicKey) {
        toast.error("Connect wallet First")
        return
      }
      if (burnId.length == 0 || burnLPTokens <= 0) {
        toast.error("Please fill Liquidity-Burn details correctly")
        return;
      } else {
        toast.info(`Withdrawing from Liquity Pool`)
      }
      const raydium = await Raydium.load({
        owner: wallet.publicKey,
        connection: connection,
        cluster: "devnet",
        signAllTransactions: wallet.signAllTransactions,
        disableFeatureCheck: true,
        blockhashCommitment: 'finalized',
      });
      // pool id is argument
      const data = await raydium.cpmm.getPoolInfoFromRpc(burnId)
      let poolInfo = data.poolInfo
      let poolKeys = data.poolKeys

      // Find the Associated Token Account (ATA) for LP mint owned by your wallet:

      const ata = await getAssociatedTokenAddress(new PublicKey(data.poolInfo.lpMint.address), wallet.publicKey)

      // Get token account balance:
      const balanceRaw = await connection.getTokenAccountBalance(ata)
      const lpTokenBalance = Number(balanceRaw.value.amount);
      const formattedBalance = lpTokenBalance / (10 ** balanceRaw.value.decimals); // Formatted LP token balance

      if (burnLPTokens > formattedBalance) {
        toast.error(
          <div style={{ lineHeight: '1.6' }}>
            <div>🚨 <strong>Insufficient LP Tokens</strong></div>
            <div>You are trying to burn more LP Tokens than you currently have.</div>
            <div>
              <strong>Current Balance:</strong> {formattedBalance.toFixed(balanceRaw.value.decimals)} LP Tokens
            </div>
            <div>
              <strong>Requested Burn Amount:</strong> {burnLPTokens} LP Tokens
            </div>
            <div>Please enter a lower amount.</div>
          </div>
        );
        return;
      } else {
        toast.info(
          <div>
            🔔 <strong>Current Balance:</strong> {formattedBalance} LP Tokens
            <br />
            🔥 <strong>Requested Burn Amount:</strong> {burnLPTokens} LP Tokens
          </div>
        );

      }

      const lpAmount = new BN(new Decimal(burnLPTokens.toString()).mul(10 ** balanceRaw.value.decimals).toFixed(0))  //LP TOKens with * 10^ decimals
      const slippage = new Percent(1, 100) // 1%
      const { execute } = await raydium.cpmm.withdrawLiquidity({
        poolInfo,
        poolKeys,
        lpAmount,
        txVersion: TxVersion.V0,
        slippage,

      })

      const { txId } = await execute({ sendAndConfirm: true })
      console.log(txId)
      console.log('pool withdraw:', { txId: `https://explorer.solana.com/tx/${txId}` })
      toast.success(<a href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`} target="_blank" rel="noreferrer">View Txn of🔥 View Txn of Burned Liquidity!</a>);

    } catch (error) {
      console.error(error);
    } finally {

      hideLoader();
      setburnId("")
      setburnLPTokens(0)
      await getbail()
    }
  }

  return (

    <div className="flex flex-col gap-5 items-center justify-center my-2.5 ">
      <div className="flex flex-col gap-5 w-full p-2 bg-slate-500 rounded-2xl ">
        <Input Val={poolpub} w="full" fxn={(e) => setpoolpub(e.target.value)} title="Token's Public key" />
        <Input Val={Aamt} w="full" fxn={(e) => setAamt(e.target.value)} title="Token's Supply" type="number" />
        <div>
          <Input Val={Bamt} w="full" fxn={(e) => setBamt(e.target.value)} title="Sol Supply" type="number" />
          <div className="inline-block ml-84 bg-slate-100 text-slate-800 font-bold px-2 py-0.5 m-0.5 rounded shadow text-sm mb-2">
            ⚠️ Your current SOL Balance is: {solbal.toFixed(3)}
          </div><br />
          <button className="text-white bg-gray-900 hover:bg-gray-950 focus:outline-1 font-medium rounded-lg text-sm px-5 py-2.5 shadow-none w-full" onClick={pooler}>Create Liquidity Pool with SOL</button>
        </div>
      </div>
      {/* <div className="flex gap-4 ">
        <div className="flex flex-col gap-5 p-2 bg-slate-500 rounded-2xl items-center justify-center ">
          <select
            value={depoId}
            onChange={(e) => { setdepoId(e.target.value); }} // Update to get the value correctly
            className="block text-sm text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500 px-3 py-2 w-2xs"
          >
            <option value="" disabled>Select Pool</option>
            {poolIds && poolIds.length > 0 ? (
              poolIds.map((e) => (
                <option key={e.val} value={e.val}>{`${e.key} - SOL`}</option>
              ))
            ) : (
              <option value="" disabled>No Pool Ids Available</option>
            )}
          </select>
          <Input fxn={(e) => setdepoTokens(e.target.value)} title="Token Amount for (Token-SOL) Pool" type="number" />
          <button className="text-white bg-indigo-700 hover:bg-indigo-900 focus:outline-1 font-medium rounded-lg text-sm px-5 py-2.5 shadow-none w-2xs" onClick={depositLiquidity}>
            Deposit Liquidity
          </button>
        </div>
        <div className="flex flex-col gap-5 p-2 bg-slate-500 rounded-2xl items-center justify-center ">
          <select
            value={burnId}
            onChange={(e) => { setburnId(e.target.value); }} // Update to get the value correctly
            className="block text-sm text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500 px-3 py-2 w-2xs"
          >
            <option value="" disabled>Select Pool</option>
            {poolIds && poolIds.length > 0 ? (
              poolIds.map((e) => (
                <option key={e.val} value={e.val}>{`${e.key} - SOL`}</option>
              ))
            ) : (
              <option value="" disabled>No Pool Ids Available</option>
            )}
          </select>
          <Input fxn={(e) => setburnLPTokens(e.target.value)} title="LP-Tokens Amount" type="number" />
          <button className="text-white bg-indigo-700 hover:bg-indigo-900 focus:outline-1 font-medium rounded-lg text-sm px-5 py-2.5 shadow-none w-2xs" onClick={withdraw}>
            Burn Liquidity
          </button>
        </div>
      </div> */}
      <div className={`flex gap-4 transition-all duration-300 ${poolIds.length === 0 ? 'pointer-events-none opacity-40 backdrop-blur-md ' : ''}`}>
        <div className="flex flex-col gap-5 p-2 bg-slate-500 rounded-2xl items-center justify-center ">
          <select
            value={depoId}
            onChange={(e) => { setdepoId(e.target.value); }} // Update to get the value correctly
            className="block text-sm text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500 px-3 py-2 w-2xs"
          >
            <option value="" disabled>Select Pool</option>
            {poolIds && poolIds.length > 0 ? (
              poolIds.map((e) => (
                <option key={e.val} value={e.val}>{`${e.key} - SOL`}</option>
              ))
            ) : (
              <option value="" disabled>No Pool Ids Available</option>
            )}
          </select>

          <Input Val={depoTokens} fxn={(e) => setdepoTokens(e.target.value)} title="Token Amount for (Token-SOL) Pool" type="number" />

          <button className="text-white bg-indigo-700 hover:bg-indigo-900 focus:outline-1 font-medium rounded-lg text-sm px-5 py-2.5 shadow-none w-2xs" onClick={depositLiquidity}>
            Deposit Liquidity
          </button>
        </div>

        <div className="flex flex-col gap-5 p-2 bg-slate-500 rounded-2xl items-center justify-center ">
          <select
            value={burnId}
            onChange={async (e) => { setburnId(e.target.value); }} // Update to get the value correctly
            className="block text-sm text-gray-900 bg-gray-100 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500 px-3 py-2 w-2xs"
          >
            <option value="" disabled>Select Pool</option>
            {poolIds && poolIds.length > 0 ? (
              poolIds.map((e) => (
                <option key={e.val} value={e.val}>{`${e.key} - SOL`}</option>
              ))
            ) : (
              <option value="" disabled>No Pool Ids Available</option>
            )}
          </select>

          <Input Val={burnLPTokens} fxn={(e) => setburnLPTokens(e.target.value)} title="LP tokens to burn" type="number" />

          <button className="text-white bg-indigo-700 hover:bg-indigo-900 focus:outline-1 font-medium rounded-lg text-sm px-5 py-2.5 shadow-none w-2xs" onClick={withdraw}>
            Burn Liquidity
          </button>

        </div >

        {
          poolIds.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-lg font-bold rounded-2xl ">
              ⚠️ No Pools Available - Create One First
            </div>
          )
        }
      </div >
    </div>

  );
};

export default Pool;
