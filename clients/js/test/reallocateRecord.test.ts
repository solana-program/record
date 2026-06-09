import { generateKeyPairSigner } from '@solana/kit';
import { expect, it } from 'vitest';

import { fetchRecordData } from '../src';
import { createTestClient } from './_setup';

it('grows a record account and tops up its rent', async () => {
  const client = await createTestClient();
  const [newRecord, authority] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  await client.splRecord.instructions
    .createRecord({ newRecord, authority: authority.address, dataLength: 0n })
    .sendTransaction();

  await client.splRecord.instructions
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
