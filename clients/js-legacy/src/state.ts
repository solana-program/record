import type { AccountInfo, Commitment, Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { RECORD_META_DATA_SIZE } from './constants.js';

export interface RecordAccount {
    version: number;
    authority: PublicKey;
    recordData: Buffer;
}

export async function getRecordAccount(connection: Connection, address: PublicKey, commitment?: Commitment) {
    const info = await connection.getAccountInfo(address, commitment);
    return parseRecordAccount(info);
}

export function parseRecordAccount(accountInfo: AccountInfo<Buffer> | null) {
    if (accountInfo !== null && accountInfo.data.length >= RECORD_META_DATA_SIZE) {
        const version = accountInfo.data[0];
        const authority = new PublicKey(accountInfo.data.subarray(1, RECORD_META_DATA_SIZE));
        const recordData = accountInfo.data.subarray(RECORD_META_DATA_SIZE);
        return { version, authority, recordData };
    } else {
        return null;
    }
}
