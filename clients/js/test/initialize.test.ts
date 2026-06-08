import { generateKeyPairSigner } from '@solana/kit';
import { expect, it } from 'vitest';

import { fetchRecordData, getRecordSize, SPL_RECORD_PROGRAM_ADDRESS } from '../src';
import { createTestClient } from './_setup';

it('initializes a record account', async () => {
  const client = await createTestClient();
  const [newRecord, authority] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  // Create the bare (uninitialized) record account owned by the record program.
  const space = getRecordSize(0n);
  await client.system.instructions
    .createAccount({
      newAccount: newRecord,
      lamports: await client.getMinimumBalance(Number(space)),
      space,
      programAddress: SPL_RECORD_PROGRAM_ADDRESS,
    })
    .sendTransaction();

  await client.splRecord.instructions
    .initialize({ recordAccount: newRecord.address, authority: authority.address })
    .sendTransaction();

  const account = await fetchRecordData(client.rpc, newRecord.address);
  expect(account.data).toStrictEqual({
    version: 1,
    authority: authority.address,
    payload: new Uint8Array([]),
  });
});
