/** A record account size excluding the record payload */
export const RECORD_META_DATA_SIZE = 33n;

/** Maximum record chunk that can fit inside a transaction when initializing a record account */
export const RECORD_CHUNK_SIZE_PRE_INITIALIZE = 696;

/** Maximum record chunk that can fit inside a transaction when record account already initialized */
export const RECORD_CHUNK_SIZE_POST_INITIALIZE = 919;
