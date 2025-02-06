// This ensures that we do not rely on `__dirname` in ES modules even when it is polyfilled.
globalThis.__dirname = 'DO_NOT_USE';

import { Keypair } from '@solana/web3.js';
import { createInitializeInstruction } from '../../lib/esm/index.js';

const record = Keypair.generate().publicKey;
const authority = Keypair.generate().publicKey;

createInitializeInstruction(record, authority);
