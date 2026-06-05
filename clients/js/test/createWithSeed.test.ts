import { createAddressWithSeed, generateKeyPairSigner } from '@solana/kit';
import { expect, it } from 'vitest';
import { createRecordWithSeed, fetchRecordData, SPL_RECORD_PROGRAM_ADDRESS } from '../src';
import { createTestClient, generateKeyPairSignerWithSol } from './_setup';

it('creates a record with a string seed', async () => {
  const client = await createTestClient();
  const payer = await generateKeyPairSignerWithSol(client);

  const initialRecordSize = 0n;
  const seed = 'test-seed';

  const expectedRecordAccount = await createAddressWithSeed({
    baseAddress: payer.address,
    seed,
    programAddress: SPL_RECORD_PROGRAM_ADDRESS,
  });

  // Initialize
  const { recordAccount, ixs: createIxs } = await createRecordWithSeed({
    rpc: client.rpc,
    payer,
    authority: payer.address,
    dataLength: initialRecordSize,
    seed,
  });

  expect(recordAccount).toEqual(expectedRecordAccount);

  await client.sendTransactions(createIxs);

  // Verify Initialize
  let accountData = await fetchRecordData(client.rpc, recordAccount);
  expect(accountData.data.version).toBe(1);
  expect(accountData.data.authority).toBe(payer.address);
});

it('creates a record with a uint8array seed', async () => {
  const client = await createTestClient();
  const payer = await generateKeyPairSignerWithSol(client);

  const initialRecordSize = 0n;
  const seed = new Uint8Array([0, 1, 2, 3, 4]);

  const expectedRecordAccount = await createAddressWithSeed({
    baseAddress: payer.address,
    seed,
    programAddress: SPL_RECORD_PROGRAM_ADDRESS,
  });

  // Initialize
  const { recordAccount, ixs: createIxs } = await createRecordWithSeed({
    rpc: client.rpc,
    payer,
    authority: payer.address,
    dataLength: initialRecordSize,
    seed,
  });

  expect(recordAccount).toEqual(expectedRecordAccount);

  await client.sendTransactions(createIxs);

  // Verify Initialize
  let accountData = await fetchRecordData(client.rpc, recordAccount);
  expect(accountData.data.version).toBe(1);
  expect(accountData.data.authority).toBe(payer.address);
});

it('creates a record with an external base account', async () => {
  const client = await createTestClient();
  const payer = await generateKeyPairSignerWithSol(client);
  const baseAccount = await generateKeyPairSigner();

  const initialRecordSize = 0n;
  const seed = 'test-seed';

  const expectedRecordAccount = await createAddressWithSeed({
    baseAddress: baseAccount.address,
    seed,
    programAddress: SPL_RECORD_PROGRAM_ADDRESS,
  });

  // Initialize
  const { recordAccount, ixs: createIxs } = await createRecordWithSeed({
    rpc: client.rpc,
    payer,
    authority: payer.address,
    dataLength: initialRecordSize,
    seed,
    baseAccount: baseAccount,
  });

  expect(recordAccount).toEqual(expectedRecordAccount);

  await client.sendTransactions(createIxs);

  // Verify Initialize
  let accountData = await fetchRecordData(client.rpc, recordAccount);
  expect(accountData.data.version).toBe(1);
  expect(accountData.data.authority).toBe(payer.address);
});
