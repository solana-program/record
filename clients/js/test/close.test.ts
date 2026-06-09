import { generateKeyPairSigner } from '@solana/kit';
import { expect, it } from 'vitest';

import { createTestClient } from './_setup';

it('closes a record account and refunds the receiver', async () => {
  const client = await createTestClient();
  const [newRecord, authority, receiver] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);

  await client.record.instructions
    .createRecord({ newRecord, authority: authority.address, dataLength: 0n })
    .sendTransaction();

  await client.record.instructions
    .closeAccount({ recordAccount: newRecord.address, authority, receiver: receiver.address })
    .sendTransaction();

  const closedAccount = await client.rpc.getAccountInfo(newRecord.address).send();
  expect(closedAccount.value).toBeNull();

  const receiverBalance = await client.rpc.getBalance(receiver.address).send();
  expect(receiverBalance.value).toBeGreaterThan(0n);
});
