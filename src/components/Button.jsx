import { useConnection, useWallet, } from "@solana/wallet-adapter-react"
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js"
import { createAssociatedTokenAccountInstruction, createInitializeInstruction, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, createMintToInstruction, ExtensionType, getAssociatedTokenAddressSync, getMintLen, LENGTH_SIZE, TOKEN_2022_PROGRAM_ID, TYPE_SIZE } from "@solana/spl-token"
import { pack } from '@solana/spl-token-metadata'
import axios from "axios"
import { useLoader } from "./LoaderContext";
import { toast } from 'react-toastify';

const Button = ({ name, symbol, url, supply }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { showLoader, hideLoader } = useLoader();
    const isValidStaticImageUrl = async (url) => {
        if (!url || !/^https?:\/\//i.test(url)) return false;
        try {
            const response = await fetch(url, { method: 'HEAD' }); // faster than full fetch
            const contentType = response.headers.get('content-type');
            return response.ok && contentType?.startsWith('image/');
        } catch {
            return false;
        }
    };

    async function onclickhandler() {
        try {
            showLoader();
            console.log(name + " " + symbol + " " + supply + " " + url)
            if (!wallet.publicKey) {
                toast.error("Connect wallet First")
                return
            }
            if (name.length == 0 || symbol.length == 0 || !(await isValidStaticImageUrl(url)) || supply <= 0) {
                toast.error("Please fill Token Details correctly")
                return;
            }

            const mintKeypair = Keypair.generate();
            const response = await axios.post('https://solana-metadata.vercel.app/api', {
                name, symbol, image: url
            })
            console.log(response.data)
            const metauri = `https://solana-metadata.vercel.app/metadata/${response.data.tokenID}`;

            toast.success(`🔗 Metadata URI created:\n${metauri}`);

            const metadata = {
                mint: mintKeypair.publicKey,
                name: name,
                symbol: symbol,
                uri: metauri,
                additionalMetadata: [],
            };

            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);
            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
                createInitializeMintInstruction(mintKeypair.publicKey, 9, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    mint: mintKeypair.publicKey,
                    metadata: mintKeypair.publicKey,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                    mintAuthority: wallet.publicKey,
                    updateAuthority: wallet.publicKey,
                }),
            );

            transaction.feePayer = wallet.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.partialSign(mintKeypair);
            toast.success("🚀 Sending transaction to create mint...");

            await wallet.sendTransaction(transaction, connection);
            toast.success(`✅ Mint created!\nMint Address: ${mintKeypair.publicKey.toBase58()}`);


            const associatedToken = getAssociatedTokenAddressSync(
                mintKeypair.publicKey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
            );

            console.log(associatedToken.toBase58());

            toast.success("🏦 Creating your token account...");
            const transaction2 = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    associatedToken,
                    wallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID,
                ),
            );

            await wallet.sendTransaction(transaction2, connection);
            toast.success(`✅ Token account created at:\n${associatedToken.toBase58()}`);

            toast.success(`💰 Minting ${supply} tokens...`);
            const transaction3 = new Transaction().add(
                createMintToInstruction(mintKeypair.publicKey, associatedToken, wallet.publicKey, supply * 1000000000, [], TOKEN_2022_PROGRAM_ID)
            );

            const txId = await wallet.sendTransaction(transaction3, connection);
            toast.success(`🎉 Done!\n${supply} tokens minted to your wallet.`);
            await new Promise(resolve => {
                setTimeout(() => resolve(1), 1000)
            })
            // const txId="5SSxvZSzbtQJ7FQZ923tvZcFdH3eiGFcXrZVixj4ajB2LiqGbPADqjvwpqj1c9GQL9RW15mwkwgsfdvn9VnTgKp3"
            toast.success("✨ Your token is live on Solana!");
            toast.info(<a href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`} target="_blank" rel="noreferrer">View Txn on Explorer</a>);

        } catch (error) {
            console.error(error);
        } finally {

            hideLoader();

        }
    }
    return (
        <div className="w-full ">
            <button onClick={onclickhandler} type="button" className="text-white bg-gray-900 hover:bg-gray-950 focus:outline-1 font-medium rounded-lg text-sm px-5 py-2.5 shadow-none w-full">Create Your Token</button>
        </div>
    )
}
export default Button