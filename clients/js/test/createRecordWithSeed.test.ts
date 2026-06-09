import { generateKeyPairSigner } from '@solana/kit';
import { expect, it } from 'vitest';

import { fetchRecordData, getRecordAddressWithSeed } from '../src';
import { createTestClient } from './_setup';

it('creates a record with a string seed', async () => {
  const client = await createTestClient();
  const seed = 'test-seed';

  const recordAccount = await getRecordAddressWithSeed({ baseAddress: client.payer.address, seed });

  await client.record.instructions
    .createRecordWithSeed({ authority: client.payer.address, dataLength: 0n, seed })
    .sendTransaction();

  const account = await fetchRecordData(client.rpc, recordAccount);
  expect(account.data).toStrictEqual({
    version: 1,
    authority: client.payer.address,
    payload: new Uint8Array([]),
  });
});

it('creates a record with a uint8array seed', async () => {
  const client = await createTestClient();
  const seed = new Uint8Array([0, 1, 2, 3, 4]);

  const recordAccount = await getRecordAddressWithSeed({ baseAddress: client.payer.address, seed });

  await client.record.instructions
    .createRecordWithSeed({ authority: client.payer.address, dataLength: 0n, seed })
    .sendTransaction();

  const account = await fetchRecordData(client.rpc, recordAccount);
  expect(account.data).toStrictEqual({
    version: 1,
    authority: client.payer.address,
    payload: new Uint8Array([]),
  });
});

it('creates a record with an external base account', async () => {
  const client = await createTestClient();
  const baseAccount = await generateKeyPairSigner();
  const seed = 'test-seed';

  const recordAccount = await getRecordAddressWithSeed({ baseAddress: baseAccount.address, seed });

  await client.record.instructions
    .createRecordWithSeed({ authority: client.payer.address, dataLength: 0n, seed, baseAccount })
    .sendTransaction();

  const account = await fetchRecordData(client.rpc, recordAccount);
  expect(account.data).toStrictEqual({
    version: 1,
    authority: client.payer.address,
    payload: new Uint8Array([]),
  });
});
