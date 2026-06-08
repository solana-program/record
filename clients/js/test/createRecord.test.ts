import { generateKeyPairSigner } from '@solana/kit';
import { expect, it } from 'vitest';

import { fetchRecordData } from '../src';
import { createTestClient } from './_setup';

it('creates and initializes a record account', async () => {
  const client = await createTestClient();
  const [newRecord, authority] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  await client.splRecord.instructions
    .createRecord({ newRecord, authority: authority.address, dataLength: 0n })
    .sendTransaction();

  const account = await fetchRecordData(client.rpc, newRecord.address);
  expect(account.data).toStrictEqual({
    version: 1,
    authority: authority.address,
    payload: new Uint8Array([]),
  });
});
