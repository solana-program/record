import { expect } from 'chai';
import type { Connection, Signer } from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import { newAccountWithLamports, getConnection } from './common';
import {
    createInitializeWriteRecord,
    getRecordAccount,
} from '../src';

describe('long record data', () => {
    let connection: Connection;
    let payer: Signer;
    let recordAccount: Keypair;
    let recordAuthority: Keypair;
    let recordData: Buffer;
    before(async () => {
        connection = await getConnection();
        payer = await newAccountWithLamports(connection, 1000000000);
        recordAccount = Keypair.generate();
        recordAuthority = Keypair.generate();
        recordData = Buffer.from(Array(5000).fill(127));
    });

    it('initialize and write', async () => {
        await createInitializeWriteRecord(
            connection,
            payer,
            recordAccount,
            recordAuthority,
            0,
            recordData,
        );

        const recordAccountData = await getRecordAccount(connection, recordAccount.publicKey);
        expect(recordAccountData).to.not.equal(null);
        if (recordAccountData !== null) {
            expect(recordAccountData.version).to.eql(1);
            expect(recordAccountData.authority).to.eql(recordAuthority.publicKey);
            expect(recordAccountData.recordData).to.eql(recordData);
        }
    });
})
