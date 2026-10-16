import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { generateKeyPairSigner } from '@solana/kit';
import { expect, it } from 'vitest';

import { fetchRecordData, RECORD_PROGRAM_ADDRESS } from '../src';
import { createTestClient } from './_setup';

it('grows a record account and tops up its rent', async () => {
    const client = await createTestClient();
    const [newRecord, authority] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);

    await client.record.instructions
        .createRecord({ newRecord, authority: authority.address, dataLength: 0n })
        .sendTransaction();

    await client.record.instructions
        .reallocateRecord({ recordAccount: newRecord.address, authority, newDataLength: 5n })
        .sendTransaction();

    // The account grew to fit a 5-byte payload, stayed rent-exempt, and the new
    // payload is zero-filled.
    const account = await fetchRecordData(client.rpc, newRecord.address);
    expect(account.data).toStrictEqual({
        version: 1,
        authority: authority.address,
        payload: new Uint8Array([0, 0, 0, 0, 0]),
    });
});

it('accepts HasAddress wrappers for the record account and program overrides', async () => {
    const client = await createTestClient();
    const [newRecord, authority] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);

    await client.record.instructions
        .createRecord({ newRecord, authority: authority.address, dataLength: 0n })
        .sendTransaction();

    await client.record.instructions
        .reallocateRecord(
            { recordAccount: { address: newRecord.address }, authority, newDataLength: 5n },
            { systemProgram: { address: SYSTEM_PROGRAM_ADDRESS }, recordProgram: { address: RECORD_PROGRAM_ADDRESS } },
        )
        .sendTransaction();

    const account = await fetchRecordData(client.rpc, newRecord.address);
    expect(account.data.payload).toStrictEqual(new Uint8Array([0, 0, 0, 0, 0]));
});
