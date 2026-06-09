import { generateKeyPairSigner, lamports } from '@solana/kit';
import { expect, it } from 'vitest';

import { fetchRecordData, getRecordSize } from '../src';
import { createTestClient } from './_setup';

it('grows a record account when rent is topped up in the same transaction', async () => {
  const client = await createTestClient();
  const [newRecord, authority] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  await client.record.instructions
    .createRecord({ newRecord, authority: authority.address, dataLength: 0n })
    .sendTransaction();

  // The bare `reallocate` instruction does not move any lamports, so growing the
  // account past its current rent requires bundling a `transferSol` top-up in the
  // same transaction to keep it rent-exempt.
  const newDataLength = 5n;
  const requiredRent = await client.getMinimumBalance(Number(getRecordSize(newDataLength)));
  const currentBalance = (await client.rpc.getBalance(newRecord.address).send()).value;

  await client.sendTransaction([
    client.system.instructions.transferSol({
      source: client.payer,
      destination: newRecord.address,
      amount: lamports(requiredRent - currentBalance),
    }),
    client.record.instructions.reallocate({
      recordAccount: newRecord.address,
      authority,
      dataLength: newDataLength,
    }),
  ]);

  const account = await fetchRecordData(client.rpc, newRecord.address);
  expect(account.data).toStrictEqual({
    version: 1,
    authority: authority.address,
    payload: new Uint8Array([0, 0, 0, 0, 0]),
  });
});
