import { PublicKey } from '@solana/web3.js';

export const RECORD_PROGRAM_ID = new PublicKey('recr1L3PCGKLbckBqMNcJhuuyU1zgo8nBhfLVsJNwr5');

/** A record account size excluding the record payload */
export const RECORD_META_DATA_SIZE = 33;
/** Maximum record chunk that can fit inside a transaction when initializing a record account */
export const RECORD_CHUNK_SIZE_PRE_INITIALIZE = 696;
/** Maximum record chunk that can fit inside a transaction when record account already initialized */
export const RECORD_CHUNK_SIZE_POST_INITIALIZE = 919;
