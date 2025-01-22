import type { ConfirmOptions, Connection, Signer } from '@solana/web3.js';
import { PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';
import {
    RECORD_PROGRAM_ID,
    RECORD_META_DATA_SIZE,
    RECORD_CHUNK_SIZE_PRE_INITIALIZE,
    RECORD_CHUNK_SIZE_POST_INITIALIZE,
} from './constants';
import {
    createInitializeInstruction,
    createWriteInstruction,
    createSetAuthorityInstruction,
    createCloseAccountInstruction,
    createReallocateInstruction,
} from './instructions';

/**
 * Initialize a record account
 *
 * @param connection      Connection to use
 * @param payer           Payer of the transaction fees
 * @param record          Record account signer
 * @param authority       Record account authority
 * @param recordSize      Size of the record to be stored
 * @param confirmOptions  Options for confirming the transaction
 *
 * @return Signature of the confirmed transaction
 */
export async function createRecord(
    connection: Connection,
    payer: Signer,
    record: Signer,
    authority: PublicKey,
    recordSize: number,
    confirmOptions?: ConfirmOptions,
    programId = RECORD_PROGRAM_ID,
) {
    const recordAccountSize = RECORD_META_DATA_SIZE + recordSize;
    const lamports = await connection.getMinimumBalanceForRentExemption(Number(recordAccountSize));
    const transaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: record.publicKey,
            space: Number(recordAccountSize),
            lamports,
            programId,
        }),
        createInitializeInstruction(
            record.publicKey,
            authority,
            programId,
        )
    );
    return await sendAndConfirmTransaction(connection, transaction, [payer, record], confirmOptions);
}

/**
 * Write to an initialized record account
 *
 * @param connection      Connection to use
 * @param payer           Payer of the transaction fees
 * @param record          Record account address
 * @param authority       Record account authority keypair
 * @param recordSize      Offset to store the record bytes
 * @param buffer          Record bytes
 * @param confirmOptions  Options for confirming the transaction
 *
 * @return Signatures of the confirmed transaction
 */
export async function writeRecord(
    connection: Connection,
    payer: Signer,
    record: PublicKey,
    authority: Signer,
    offset: number,
    buffer: Uint8Array,
    confirmOptions?: ConfirmOptions,
    programId = RECORD_PROGRAM_ID,
) {
    let transactionResults = [];
    let bufferOffset = 0;
    while (bufferOffset < buffer.length) {
        const currentChunkBuffer = buffer.subarray(
            bufferOffset,
            bufferOffset + RECORD_CHUNK_SIZE_POST_INITIALIZE
        );
        const transaction = new Transaction().add(
            createWriteInstruction(
                record,
                authority.publicKey,
                offset + bufferOffset,
                currentChunkBuffer,
                programId,
            )
        );
        transactionResults.push(sendAndConfirmTransaction(connection, transaction, [payer, authority], confirmOptions));
        bufferOffset = bufferOffset + RECORD_CHUNK_SIZE_POST_INITIALIZE;
    }
    return await Promise.all(transactionResults);
}

/**
 * Initialize and write to a record account
 *
 * @param connection      Connection to use
 * @param payer           Payer of the transaction fees
 * @param record          Record account signer
 * @param authority       Record account authority keypair
 * @param recordSize      Offset to store the record bytes
 * @param buffer          Record bytes
 * @param confirmOptions  Options for confirming the transaction
 *
 * @return Signatures of the confirmed transaction
 */
export async function createInitializeWriteRecord(
    connection: Connection,
    payer: Signer,
    record: Signer,
    authority: Signer,
    offset: number,
    buffer: Uint8Array,
    confirmOptions?: ConfirmOptions,
    programId = RECORD_PROGRAM_ID,
) {
    const recordSize = buffer.length;
    const recordAccountSize = RECORD_META_DATA_SIZE + recordSize;
    const lamports = await connection.getMinimumBalanceForRentExemption(recordAccountSize);
    const firstChunkBuffer = buffer.subarray(0, RECORD_CHUNK_SIZE_PRE_INITIALIZE);
    const transaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: record.publicKey,
            space: recordAccountSize,
            lamports,
            programId,
        }),
        createInitializeInstruction(
            record.publicKey,
            authority.publicKey,
            programId,
        ),
        createWriteInstruction(
            record.publicKey,
            authority.publicKey,
            offset,
            firstChunkBuffer,
            programId,
        )
    );
    const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, authority, record],
        confirmOptions
    );

    if (buffer.length > RECORD_CHUNK_SIZE_PRE_INITIALIZE) {
        const newOffset = offset + RECORD_CHUNK_SIZE_PRE_INITIALIZE;
        const remainingChunkBuffer = buffer.subarray(RECORD_CHUNK_SIZE_PRE_INITIALIZE);
        return await writeRecord(
            connection,
            payer,
            record.publicKey,
            authority,
            newOffset,
            remainingChunkBuffer,
            confirmOptions,
            programId,
        );
    } else {
        return [signature];
    }
}

/**
 * Set a new authority for a record account
 *
 * @param connection        Connection to use
 * @param payer             Payer of the transaction fees
 * @param record            Record account address
 * @param currentAuthority  Current record account authority
 * @param newAuthority      New record account authority
 * @param confirmOptions    Options for confirming the transaction
 *
 * @return Signature of the confirmed transaction
 */
export async function setAuthority(
    connection: Connection,
    payer: Signer,
    record: PublicKey,
    currentAuthority: Signer,
    newAuthority: PublicKey,
    confirmOptions?: ConfirmOptions,
    programId = RECORD_PROGRAM_ID,
) {
    const transaction = new Transaction().add(
        createSetAuthorityInstruction(
            record,
            currentAuthority.publicKey,
            newAuthority,
            programId,
        )
    );
    return await sendAndConfirmTransaction(connection, transaction, [payer, currentAuthority], confirmOptions);
}

/**
 * Close a record account
 *
 * @param connection      Connection to use
 * @param payer           Payer of the transaction fees
 * @param record          Record account address
 * @param authority       Record account authority keypair
 * @param receiver        Receiving account for lamports
 * @param confirmOptions  Options for confirming the transaction
 *
 * @return Signature of the confirmed transaction
 */
export async function closeRecord(
    connection: Connection,
    payer: Signer,
    record: PublicKey,
    authority: Signer,
    receiver: PublicKey,
    confirmOptions?: ConfirmOptions,
    programId = RECORD_PROGRAM_ID,
) {
    const transaction = new Transaction().add(
        createCloseAccountInstruction(
            record,
            authority.publicKey,
            receiver,
            programId,
        )
    );
    return await sendAndConfirmTransaction(connection, transaction, [payer, authority], confirmOptions);
}

/**
 * Reallocate a record account to a new size
 *
 * @param connection      Connection to use
 * @param payer           Payer of the transaction fees
 * @param record          Record account address
 * @param authority       Record account authority keypair
 * @param dataLength      New record length to be stored in the account
 * @param fundAccount     If true, fund the account if needed
 * @param confirmOptions  Options for confirming the transaction
 *
 * @return Signature of the confirmed transaction
 */
export async function reallocateRecord(
    connection: Connection,
    payer: Signer,
    record: PublicKey,
    authority: Signer,
    dataLength: number,
    fundAccount: boolean,
    confirmOptions?: ConfirmOptions,
    programId = RECORD_PROGRAM_ID,
) {
    let transaction = new Transaction();
    if (fundAccount) {
        const currentLamports = await connection.getBalance(record);
        const newAccountSize = RECORD_META_DATA_SIZE + dataLength;
        const newAccountLamports = await connection.getMinimumBalanceForRentExemption(newAccountSize);

        if (currentLamports < newAccountLamports) {
            const neededLamports = newAccountLamports - currentLamports;
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: payer.publicKey,
                    toPubkey: record,
                    lamports: neededLamports,
                })
            );
        } else {
            console.log("no additional funds needed for space")
        }
    }
    transaction.add(
        createReallocateInstruction(
            record,
            authority.publicKey,
            dataLength,
            programId,
        )
    );
    return await sendAndConfirmTransaction(connection, transaction, [payer, authority], confirmOptions);
}
