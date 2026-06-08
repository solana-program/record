import { generateKeyPairSigner } from '@solana/kit';
import { expect, it } from 'vitest';

import { fetchRecordData } from '../src';
import { createTestClient } from './_setup';

it('writes data to a record account', async () => {
  const client = await createTestClient();
  const [newRecord, authority] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);
  const data = new Uint8Array([0, 1, 2, 3, 4]);

  await client.splRecord.instructions
    .createRecord({ newRecord, authority: authority.address, dataLength: BigInt(data.length) })
    .sendTransaction();

  await client.splRecord.instructions
    .write({ recordAccount: newRecord.address, authority, offset: 0n, data })
    .sendTransaction();

  const account = await fetchRecordData(client.rpc, newRecord.address);
  expect(account.data).toStrictEqual({
    version: 1,
    authority: authority.address,
    payload: data,
  });
});
