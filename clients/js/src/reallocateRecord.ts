import { getTransferSolInstruction } from '@solana-program/system';
import {
    Address,
    ClientWithGetMinimumBalance,
    ClientWithRpc,
    GetBalanceApi,
    HasAddress,
    InstructionPlan,
    sequentialInstructionPlan,
    TransactionSigner,
} from '@solana/kit';

import { getRecordSize } from './constants';
import { getReallocateInstruction, RECORD_PROGRAM_ADDRESS } from './generated';

export interface ReallocateRecordInstructionPlanInput {
    /** Funding account that tops up the record account's rent when growing it. */
    payer: TransactionSigner;
    /** The record account to reallocate. */
    recordAccount: Address | HasAddress;
    /** The record account's current authority. */
    authority: TransactionSigner;
    /** The new record payload length in bytes (excluding the header). */
    newDataLength: number | bigint;
}

export interface ReallocateRecordInstructionPlanConfig {
    /** Override the System program address. */
    systemProgram?: Address | HasAddress;
    /** Override the Record program address. */
    recordProgram?: Address | HasAddress;
}

/**
 * Builds a plan that reallocates a record account to a new payload length. When
 * the new size requires more rent than the account currently holds, a System
 * `TransferSol` instruction is prepended to top up the difference so the account
 * stays rent-exempt.
 */
export async function getReallocateRecordInstructionPlan(
    client: ClientWithGetMinimumBalance & ClientWithRpc<GetBalanceApi>,
    input: ReallocateRecordInstructionPlanInput,
    config?: ReallocateRecordInstructionPlanConfig,
): Promise<InstructionPlan> {
    const recordProgram = config?.recordProgram ?? RECORD_PROGRAM_ADDRESS;
    const recordAccount = typeof input.recordAccount === 'string' ? input.recordAccount : input.recordAccount.address;
    const newSpace = getRecordSize(input.newDataLength);

    const requiredRent = await client.getMinimumBalance(Number(newSpace));
    const currentBalance = (await client.rpc.getBalance(recordAccount).send()).value;

    return sequentialInstructionPlan([
        ...(requiredRent > currentBalance
            ? [
                  getTransferSolInstruction(
                      {
                          source: input.payer,
                          destination: recordAccount,
                          amount: requiredRent - currentBalance,
                      },
                      { programAddress: config?.systemProgram },
                  ),
              ]
            : []),
        getReallocateInstruction(
            {
                recordAccount,
                authority: input.authority,
                dataLength: BigInt(input.newDataLength),
            },
            { programAddress: recordProgram },
        ),
    ]);
}
