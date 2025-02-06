const { Keypair } = require('@solana/web3.js');
const { createInitializeInstruction } = require('../../dist/src/index.js');

const record = Keypair.generate().publicKey;
const authority = Keypair.generate().publicKey;

createInitializeInstruction(record, authority);
