import type { Signer } from '@solana/web3.js';
import { Keypair, Connection } from '@solana/web3.js';

export async function newAccountWithLamports(connection: Connection, lamports = 1000000): Promise<Signer> {
    const account = Keypair.generate();
    const signature = await connection.requestAirdrop(account.publicKey, lamports);
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature,
    });
    return account;
}

export async function getConnection(): Promise<Connection> {
    const url = 'http://127.0.0.1:8899';
    const connection = new Connection(url, 'confirmed');
    return connection;
}
