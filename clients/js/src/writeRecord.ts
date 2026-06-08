import {
  Address,
  getLinearMessagePackerInstructionPlan,
  MessagePackerInstructionPlan,
  ReadonlyUint8Array,
  TransactionSigner,
} from '@solana/kit';

import { getWriteInstruction, SPL_RECORD_PROGRAM_ADDRESS } from './generated';

export interface WriteInstructionPlanInput {
  /** The record account to write to. */
  recordAccount: Address;
  /** The record account's authority. */
  authority: TransactionSigner;
  /** The data to write into the record account. */
  data: ReadonlyUint8Array;
  /**
   * The offset within the record payload at which to start writing.
   * @default 0
   */
  offset?: number;
  /** Override the Record program address. */
  recordProgram?: Address;
}

/**
 * Builds a plan that writes `data` into a record account, transparently
 * splitting it into as many `Write` instructions (and transactions) as needed to
 * fit `data` of any length. Each chunk is sized by the planner to fit within a
 * single transaction.
 *
 * Use the generated {@link getWriteInstruction} directly when a single write
 * that fits in one transaction is sufficient.
 */
export function getWriteInstructionPlan(
  input: WriteInstructionPlanInput,
): MessagePackerInstructionPlan {
  const baseOffset = input.offset ?? 0;
  const recordProgram = input.recordProgram ?? SPL_RECORD_PROGRAM_ADDRESS;

  return getLinearMessagePackerInstructionPlan({
    totalLength: input.data.length,
    getInstruction: (offset, length) =>
      getWriteInstruction(
        {
          recordAccount: input.recordAccount,
          authority: input.authority,
          offset: BigInt(baseOffset + offset),
          data: input.data.slice(offset, offset + length),
        },
        { programAddress: recordProgram },
      ),
  });
}
