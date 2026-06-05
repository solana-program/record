import { expect, it } from 'vitest';
import { generateKeyPairSigner } from '@solana/kit';
import {
  createRecord,
  createWriteInstruction,
  RECORD_META_DATA_SIZE,
  RECORD_CHUNK_SIZE_PRE_INITIALIZE,
  RECORD_CHUNK_SIZE_POST_INITIALIZE,
} from '../src';
import { createTestClient, generateKeyPairSignerWithSol } from './_setup';

it('runs the long record data flow', async () => {
  const client = await createTestClient();
  const payer = await generateKeyPairSignerWithSol(client);
  const recordAuthority = await generateKeyPairSigner();

  // Create 5000 bytes of data
  const recordData = new Uint8Array(Array(5000).fill(127));
  const recordSize = BigInt(recordData.length);

  // 1. Create Account + Initialize + First Write

  // Step A: Prepare Create/Init instructions
  const { recordKeypair: recordAccount, ixs: initIxs } = await createRecord({
    rpc: client.rpc,
    payer,
    authority: recordAuthority.address,
    dataLength: recordSize,
  });

  // Step B: Prepare first write (fits in same tx)
  // Safe check for undefined constant
  const preInitChunkSize = RECORD_CHUNK_SIZE_PRE_INITIALIZE || 696;
  const firstChunk = recordData.slice(0, preInitChunkSize);

  const firstWriteIx = createWriteInstruction({
    recordAccount: recordAccount.address,
    authority: recordAuthority,
    offset: 0n,
    data: firstChunk,
  });

  await client.sendTransactions([...initIxs, firstWriteIx]);

  // 2. Subsequent Writes (Loop)
  const postInitChunkSize = RECORD_CHUNK_SIZE_POST_INITIALIZE || 919;
  let offset = preInitChunkSize;

  while (offset < recordData.length) {
    const chunk = recordData.slice(offset, offset + postInitChunkSize);

    const writeIx = createWriteInstruction({
      recordAccount: recordAccount.address,
      authority: recordAuthority,
      offset: BigInt(offset),
      data: chunk,
    });

    await client.sendTransactions([writeIx]);

    offset += postInitChunkSize;
  }

  // 3. Verify Data
  const rawAccount = await client.rpc
    .getAccountInfo(recordAccount.address, { encoding: 'base64' })
    .send();

  const headerSize = Number(RECORD_META_DATA_SIZE);
  const actualData = rawAccount.value?.data?.[0]
    ? Buffer.from(rawAccount.value.data[0], 'base64').subarray(headerSize)
    : new Uint8Array([]);

  expect(actualData).toEqual(Buffer.from(recordData));
});
