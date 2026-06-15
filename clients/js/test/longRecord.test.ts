import { generateKeyPairSigner } from '@solana/kit';
import { expect, it } from 'vitest';

import { fetchRecordData, getWriteInstructionPlan } from '../src';
import { createTestClient } from './_setup';

it('writes a record larger than a single transaction in chunks', async () => {
    const client = await createTestClient();
    const [newRecord, authority] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);

    // 5000 bytes does not fit in a single transaction, so the write plan splits it
    // across as many transactions as needed.
    const data = new Uint8Array(5000).fill(127);

    await client.record.instructions
        .createRecord({ newRecord, authority: authority.address, dataLength: data.length })
        .sendTransaction();

    await client.sendTransactions(getWriteInstructionPlan({ recordAccount: newRecord.address, authority, data }));

    const account = await fetchRecordData(client.rpc, newRecord.address);
    expect(account.data).toStrictEqual({
        version: 1,
        authority: authority.address,
        payload: data,
    });
});
