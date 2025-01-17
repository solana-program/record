import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { toBufferLE } from 'bigint-buffer';
import { RECORD_PROGRAM_ID } from './constants';

export enum RecordInstruction {
    Initialize = 0,
    Write = 1,
    SetAuthority = 2,
    CloseAccount = 3,
    Reallocate = 4,
}

/**
 * Construct an Initialize instruction
 *
 * @param record        The record account address
 * @param authority     The record account authority
 *
 * @return Instruction to add to a transaction
 */
export function createInitializeInstruction(
    record: PublicKey,
    authority: PublicKey,
) {
    const keys = [
        { pubkey: record, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: false, isWritable: false },
    ];
    const programId = RECORD_PROGRAM_ID;
    const data = Buffer.from([RecordInstruction.Initialize]);

    return new TransactionInstruction({ keys, programId, data });
}

/**
 * Construct a Write instruction
 *
 * @param record        The record account address
 * @param authority     The record account authority
 * @param offset        The offset for the record bytes
 * @param buffer        The record bytes to be stored
 *
 * @return Instruction to add to a transaction
 */
export function createWriteInstruction(
    record: PublicKey,
    authority: PublicKey,
    offset: number,
    buffer: Uint8Array,
) {
    const keys = [
        { pubkey: record, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
    ]
    const programId = RECORD_PROGRAM_ID;
    const bufferLength = BigInt(buffer.length);
    const data = Buffer.from([
        RecordInstruction.Write,
        ...toBufferLE(BigInt(offset), 8),
        ...toBufferLE(bufferLength, 4),
        ...buffer
    ]);

    return new TransactionInstruction({ keys, programId, data });
}

/**
 * Construct a SetAuthority instruction
 *
 * @param record             The record account address
 * @param currentAuthority   The current record account authority
 * @param newAuthority       The new record account authority
 *
 * @return Instruction to add to a transaction
 */
export function createSetAuthorityInstruction(
    record: PublicKey,
    currentAuthority: PublicKey,
    newAuthority: PublicKey,
) {
    const keys = [
        { pubkey: record, isSigner: false, isWritable: true },
        { pubkey: currentAuthority, isSigner: true, isWritable: false },
        { pubkey: newAuthority, isSigner: false, isWritable: false },
    ]
    const programId = RECORD_PROGRAM_ID;
    const data = Buffer.from([RecordInstruction.SetAuthority]);

    return new TransactionInstruction({ keys, programId, data });
}

/**
 * Construct a CloseAccount instruction
 *
 * @param record            The record account address
 * @param authority         The record account authority
 * @param receiver          The receiving account for lamports
 *
 * @return Instruction to add to a transaction
 */
export function createCloseAccountInstruction(
    record: PublicKey,
    authority: PublicKey,
    receiver: PublicKey,
) {
    const keys = [
        { pubkey: record, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
        { pubkey: receiver, isSigner: false, isWritable: true },
    ]
    const programId = RECORD_PROGRAM_ID;
    const data = Buffer.from([RecordInstruction.CloseAccount]);

    return new TransactionInstruction({ keys, programId, data });
}

/**
 * Construct a Reallocate instruction
 *
 * @param record            The record account address
 * @param authority         The current record account authority
 * @param dataLength        The new record size after reallocation
 *
 * @return Instruction to add to a transaction
 */
export function createReallocateInstruction(
    record: PublicKey,
    authority: PublicKey,
    dataLength: number,
) {
    const keys = [
        { pubkey: record, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
    ]
    const programId = RECORD_PROGRAM_ID;
    const data = Buffer.from([RecordInstruction.Reallocate, ...toBufferLE(BigInt(dataLength), 8)]);

    return new TransactionInstruction({ keys, programId, data });
}
