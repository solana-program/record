import { generateKeyPairSigner } from '@solana/kit';
import test from 'ava';
import {
  createRecordWithSeed,
  fetchRecordData
} from '../src';
import {
  createDefaultSolanaClient,
  generateKeyPairSignerWithSol,
  sendAndConfirmInstructions,
} from './_setup';

test('create record with string seed', async t => {
  const client = createDefaultSolanaClient();
  const payer = await generateKeyPairSignerWithSol(client);

  const initialRecordSize = 0n;
  const seed = 'test-seed';

  // Initialize
  const { recordAccount, ixs: createIxs } = await createRecordWithSeed({
    rpc: client.rpc,
    payer,
    authority: payer.address,
    dataLength: initialRecordSize,
    seed
  });

  await sendAndConfirmInstructions(client, payer, createIxs);

  // Verify Initialize
  let accountData = await fetchRecordData(client.rpc, recordAccount);
  t.is(accountData.data.version, 1);
  t.is(accountData.data.authority, payer.address);
});

test('create record with uint8array seed', async t => {
  const client = createDefaultSolanaClient();
  const payer = await generateKeyPairSignerWithSol(client);

  const initialRecordSize = 0n;
  const seed = new Uint8Array([0, 1, 2, 3, 4]);

  // Initialize
  const { recordAccount, ixs: createIxs } = await createRecordWithSeed({
    rpc: client.rpc,
    payer,
    authority: payer.address,
    dataLength: initialRecordSize,
    seed
  });

  await sendAndConfirmInstructions(client, payer, createIxs);

  // Verify Initialize
  let accountData = await fetchRecordData(client.rpc, recordAccount);
  t.is(accountData.data.version, 1);
  t.is(accountData.data.authority, payer.address);
});

test('create record with external base account', async t => {
  const client = createDefaultSolanaClient();
  const payer = await generateKeyPairSignerWithSol(client);
  const baseAccount = await generateKeyPairSigner();

  const initialRecordSize = 0n;
  const seed = 'test-seed';

  // Initialize
  const { recordAccount, ixs: createIxs } = await createRecordWithSeed({
    rpc: client.rpc,
    payer,
    authority: payer.address,
    dataLength: initialRecordSize,
    seed,
    baseAccount: baseAccount
  });

  await sendAndConfirmInstructions(client, payer, createIxs);

  // Verify Initialize
  let accountData = await fetchRecordData(client.rpc, recordAccount);
  t.is(accountData.data.version, 1);
  t.is(accountData.data.authority, payer.address);
});
