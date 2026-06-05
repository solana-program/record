import path from 'node:path';

import { KeyPairSigner, createClient, generateKeyPairSigner, lamports } from '@solana/kit';
import { litesvm } from '@solana/kit-plugin-litesvm';
import { airdropSigner, generatedSigner } from '@solana/kit-plugin-signer';

import { SPL_RECORD_PROGRAM_ADDRESS, splRecordProgram } from '../src';

const SPL_RECORD_BINARY_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'target',
  'deploy',
  'spl_record.so',
);

export const createTestClient = () => {
  return createClient()
    .use(generatedSigner())
    .use(litesvm())
    .use(airdropSigner(lamports(1_000_000_000n)))
    .use(client => {
      // Load the record program into the LiteSVM instance from its compiled
      // `.so` file. This must run after the `litesvm()` plugin so that
      // `client.svm` is available.
      client.svm.addProgramFromFile(SPL_RECORD_PROGRAM_ADDRESS, SPL_RECORD_BINARY_PATH);
      return client;
    })
    .use(splRecordProgram());
};

export type TestClient = Awaited<ReturnType<typeof createTestClient>>;

export const generateKeyPairSignerWithSol = async (
  client: TestClient,
  putativeLamports: bigint = 1_000_000_000n,
): Promise<KeyPairSigner> => {
  const signer = await generateKeyPairSigner();
  await client.airdrop(signer.address, lamports(putativeLamports));
  return signer;
};
