import { expect, it } from 'vitest';
import { generateKeyPairSigner } from '@solana/kit';
import {
  fetchRecordData,
  createRecord,
  createWriteInstruction,
  reallocateRecord,
  RECORD_META_DATA_SIZE,
} from '../src';
import { createTestClient, generateKeyPairSignerWithSol } from './_setup';

it('runs the basic instructions flow', async () => {
  const client = await createTestClient();
  const payer = await generateKeyPairSignerWithSol(client);

  const recordAuthority = await generateKeyPairSigner();

  const initialRecordSize = 0n;
  const newRecordSize = 5n;
  const recordData = new Uint8Array([0, 1, 2, 3, 4]);

  // --- 1. Initialize ---
  const { recordKeypair: recordAccount, ixs: createIxs } = await createRecord({
    rpc: client.rpc,
    payer,
    authority: recordAuthority.address,
    dataLength: initialRecordSize,
  });

  await client.sendTransactions(createIxs);

  // Verify Initialize
  let accountData = await fetchRecordData(client.rpc, recordAccount.address);
  expect(accountData.data.version).toBe(1);
  expect(accountData.data.authority).toBe(recordAuthority.address);

  // --- 2. Reallocate ---
  const reallocIxs = await reallocateRecord({
    rpc: client.rpc,
    payer,
    recordAccount: recordAccount.address,
    authority: recordAuthority,
    newDataLength: newRecordSize,
  });

  await client.sendTransactions(reallocIxs);

  // Verify Reallocate
  let rawAccount = await client.rpc
    .getAccountInfo(recordAccount.address, { encoding: 'base64' })
    .send();
  // Ensure RECORD_META_DATA_SIZE is defined (it is 33n), convert to Number for subarray
  const offset = Number(RECORD_META_DATA_SIZE);

  let actualData = rawAccount.value?.data?.[0]
    ? Buffer.from(rawAccount.value.data[0], 'base64').subarray(offset)
    : new Uint8Array([]);

  expect(actualData).toEqual(Buffer.from([0, 0, 0, 0, 0]));

  // --- 3. Write ---
  const writeIx = createWriteInstruction({
    recordAccount: recordAccount.address,
    authority: recordAuthority,
    offset: 0n,
    data: recordData,
  });

  await client.sendTransactions([writeIx]);

  // Verify Write
  rawAccount = await client.rpc
    .getAccountInfo(recordAccount.address, { encoding: 'base64' })
    .send();
  actualData = rawAccount.value?.data?.[0]
    ? Buffer.from(rawAccount.value.data[0], 'base64').subarray(offset)
    : new Uint8Array([]);
  expect(actualData).toEqual(Buffer.from([0, 1, 2, 3, 4]));

  // // --- 4. Set Authority ---
  // const setAuthIx = createSetAuthorityInstruction({
  //   recordAccount: recordAccount.address,
  //   authority: recordAuthority,
  //   newAuthority: newRecordAuthority.address,
  // });
  //
  // await client.sendTransactions([setAuthIx]);
  //
  // // Verify Set Authority
  // accountData = await fetchRecordData(client.rpc, recordAccount.address);
  // t.is(accountData.data.authority, newRecordAuthority.address);
  //
  // // --- 5. Close Account ---
  // const destination = await generateKeyPairSigner();
  //
  // const closeIx = createCloseRecordInstruction({
  //   recordAccount: recordAccount.address,
  //   authority: newRecordAuthority,
  //   receiver: destination.address,
  // });
  //
  // await client.sendTransactions([closeIx]);
  //
  // // Verify Close
  // const closedAccount = await client.rpc
  //   .getAccountInfo(recordAccount.address)
  //   .send();
  // t.is(closedAccount.value, null);
  //
  // // Verify destination received funds
  // const destBalance = await client.rpc.getBalance(destination.address).send();
  // t.true(destBalance.value > 0n);
});
