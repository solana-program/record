import test from 'ava';
import { generateKeyPairSigner } from '@solana/kit';
import {
  fetchRecordData,
  createRecord,
  createWriteInstruction,
  reallocateRecord,
  createSetAuthorityInstruction,
  createCloseRecordInstruction,
  RECORD_META_DATA_SIZE,
} from '../src';
import {
  createDefaultSolanaClient,
  generateKeyPairSignerWithSol,
  sendAndConfirmInstructions,
} from './_setup';

test('basic instructions flow', async t => {
  const client = createDefaultSolanaClient();
  const payer = await generateKeyPairSignerWithSol(client);

  const recordAuthority = await generateKeyPairSigner();
  const newRecordAuthority = await generateKeyPairSigner();

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

  await sendAndConfirmInstructions(client, payer, createIxs);

  // Verify Initialize
  let accountData = await fetchRecordData(client.rpc, recordAccount.address);
  t.is(accountData.data.version, 1);
  t.is(accountData.data.authority, recordAuthority.address);

  // --- 2. Reallocate ---
  const reallocIxs = await reallocateRecord({
    rpc: client.rpc,
    payer,
    recordAccount: recordAccount.address,
    authority: recordAuthority,
    newDataLength: newRecordSize,
  });

  await sendAndConfirmInstructions(client, payer, reallocIxs);

  // Verify Reallocate
  let rawAccount = await client.rpc
    .getAccountInfo(recordAccount.address, { encoding: 'base64' })
    .send();
  // Ensure RECORD_META_DATA_SIZE is defined (it is 33n), convert to Number for subarray
  const offset = Number(RECORD_META_DATA_SIZE);

  let actualData = rawAccount.value?.data?.[0]
    ? Buffer.from(rawAccount.value.data[0], 'base64').subarray(offset)
    : new Uint8Array([]);

  t.deepEqual(actualData, Buffer.from([0, 0, 0, 0, 0]));

  // --- 3. Write ---
  const writeIx = createWriteInstruction({
    recordAccount: recordAccount.address,
    authority: recordAuthority,
    offset: 0n,
    data: recordData,
  });

  await sendAndConfirmInstructions(client, payer, [writeIx]);

  // Verify Write
  rawAccount = await client.rpc
    .getAccountInfo(recordAccount.address, { encoding: 'base64' })
    .send();
  actualData = rawAccount.value?.data?.[0]
    ? Buffer.from(rawAccount.value.data[0], 'base64').subarray(offset)
    : new Uint8Array([]);
  t.deepEqual(actualData, Buffer.from([0, 1, 2, 3, 4]));

  // // --- 4. Set Authority ---
  // const setAuthIx = createSetAuthorityInstruction({
  //   recordAccount: recordAccount.address,
  //   authority: recordAuthority,
  //   newAuthority: newRecordAuthority.address,
  // });
  //
  // await sendAndConfirmInstructions(client, payer, [setAuthIx]);
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
  // await sendAndConfirmInstructions(client, payer, [closeIx]);
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
