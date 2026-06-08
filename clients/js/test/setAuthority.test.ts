import { generateKeyPairSigner } from '@solana/kit';
import { expect, it } from 'vitest';

import { fetchRecordData } from '../src';
import { createTestClient } from './_setup';

it('sets a new authority on a record account', async () => {
  const client = await createTestClient();
  const [newRecord, authority, newAuthority] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  await client.splRecord.instructions
    .createRecord({ newRecord, authority: authority.address, dataLength: 0n })
    .sendTransaction();

  await client.splRecord.instructions
    .setAuthority({
      recordAccount: newRecord.address,
      authority,
      newAuthority: newAuthority.address,
    })
    .sendTransaction();

  const account = await fetchRecordData(client.rpc, newRecord.address);
  expect(account.data).toStrictEqual({
    version: 1,
    authority: newAuthority.address,
    payload: new Uint8Array([]),
  });
});
