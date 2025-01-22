import { expect } from 'chai';
import type { Connection, Signer } from '@solana/web3.js';
import { Keypair } from '@solana/web3.js';
import { newAccountWithLamports, getConnection } from './common';
import {
    closeRecord,
    createRecord,
    getRecordAccount,
    setAuthority,
    reallocateRecord,
    writeRecord,
    RECORD_META_DATA_SIZE,
} from '../src';

describe('basic instructions', () => {
    let connection: Connection;
    let payer: Signer;
    let recordAccount: Keypair;
    let recordAuthority: Keypair;
    let newRecordAuthority: Keypair;
    let initialRecordSize: number;
    let newRecordSize: number;
    let recordData: Buffer;
    before(async () => {
        connection = await getConnection();
        payer = await newAccountWithLamports(connection, 1000000000);
        recordAccount = Keypair.generate();
        recordAuthority = Keypair.generate();
        newRecordAuthority = Keypair.generate();
        initialRecordSize = 0;
        newRecordSize = 5;
        recordData = Buffer.from([0, 1, 2, 3, 4]);
    });

    it('initialize', async () => {
        await createRecord(
            connection,
            payer,
            recordAccount,
            recordAuthority.publicKey,
            initialRecordSize,
        );

        const recordAccountData = await getRecordAccount(connection, recordAccount.publicKey);
        expect(recordAccountData).to.not.equal(null);
        if (recordAccountData !== null) {
            expect(recordAccountData.version).to.eql(1);
            expect(recordAccountData.authority).to.eql(recordAuthority.publicKey);
            expect(recordAccountData.recordData).to.eql(Buffer.from([]));
        }
    });

    it('reallocate', async () => {
        await reallocateRecord(
            connection,
            payer,
            recordAccount.publicKey,
            recordAuthority,
            newRecordSize,
            true,
        );

        const recordAccountData = await getRecordAccount(connection, recordAccount.publicKey);
        expect(recordAccountData).to.not.equal(null);
        if (recordAccountData !== null) {
            expect(recordAccountData.recordData).to.eql(Buffer.from([0, 0, 0, 0, 0]));
        }
    })

    it('write', async () => {
        await writeRecord(
            connection,
            payer,
            recordAccount.publicKey,
            recordAuthority,
            0,
            recordData
        );

        const recordAccountData = await getRecordAccount(connection, recordAccount.publicKey);
        if (recordAccountData !== null) {
            expect(recordAccountData.recordData).to.eql(Buffer.from([0, 1, 2, 3, 4]));
        }
    })

    it('set authority', async () => {
        await setAuthority(
            connection,
            payer,
            recordAccount.publicKey,
            recordAuthority,
            newRecordAuthority.publicKey,
        );

        const recordAccountData = await getRecordAccount(connection, recordAccount.publicKey);
        if (recordAccountData !== null) {
            expect(recordAccountData.authority).to.eql(newRecordAuthority.publicKey);
        }
    })

    it('close', async () => {
        const destination = Keypair.generate();
        const recordAccountSize = RECORD_META_DATA_SIZE + 5;
        const recordAccountLamports = await connection.getMinimumBalanceForRentExemption(Number(recordAccountSize));

        await closeRecord(
            connection,
            payer,
            recordAccount.publicKey,
            newRecordAuthority,
            destination.publicKey,
        )

        const closedRecordInfo = await connection.getAccountInfo(recordAccount.publicKey);
        expect(closedRecordInfo).to.equal(null);

        const destinationInfo = await connection.getAccountInfo(destination.publicKey);
        expect(destinationInfo).to.not.equal(null);
        if (destinationInfo !== null) {
            expect(destinationInfo.lamports).to.eql(recordAccountLamports);
        }
    });
})
