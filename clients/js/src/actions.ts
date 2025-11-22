import {
  Address,
  generateKeyPairSigner,
  GetBalanceApi,
  GetMinimumBalanceForRentExemptionApi,
  Instruction,
  KeyPairSigner,
  Rpc,
  TransactionSigner,
} from '@solana/kit';
import {
  getCreateAccountInstruction,
  getTransferSolInstruction,
} from '@solana-program/system';
import {
  getCloseAccountInstruction,
  getInitializeInstruction,
  getReallocateInstruction,
  getSetAuthorityInstruction,
  getWriteInstruction,
  SPL_RECORD_PROGRAM_ADDRESS,
} from './generated';
import { RECORD_META_DATA_SIZE } from './constants';

export interface CreateRecordArgs {
  rpc: Rpc<GetMinimumBalanceForRentExemptionApi>;
  payer: KeyPairSigner;
  authority: Address;
  dataLength: number | bigint;
  programId?: Address;
  /** Optional: Provide your own keypair for the record account. If not provided, one is generated. */
  recordKeypair?: KeyPairSigner;
}

export interface CreateRecordResult {
  recordKeypair: KeyPairSigner;
  ixs: Instruction[];
}

/**
 * High-level function to create and initialize a Record Account.
 * Handles rent calculation and system account creation.
 */
export async function createRecord({
  rpc,
  payer,
  authority,
  dataLength,
  programId = SPL_RECORD_PROGRAM_ADDRESS,
  recordKeypair,
}: CreateRecordArgs): Promise<CreateRecordResult> {
  const recordSigner = recordKeypair ?? (await generateKeyPairSigner());
  const space = RECORD_META_DATA_SIZE + BigInt(dataLength);
  const lamports = await rpc.getMinimumBalanceForRentExemption(space).send();

  const createAccountIx = getCreateAccountInstruction({
    payer: payer,
    newAccount: recordSigner,
    lamports,
    space,
    programAddress: programId,
  });

  const initializeIx = getInitializeInstruction(
    {
      recordAccount: recordSigner.address,
      authority,
    },
    { programAddress: programId }
  );

  return {
    recordKeypair: recordSigner,
    ixs: [createAccountIx, initializeIx],
  };
}

export interface WriteRecordArgs {
  recordAccount: Address;
  authority: TransactionSigner;
  offset: number | bigint;
  data: Uint8Array;
  programId?: Address;
}

/**
 * Creates a Write instruction.
 * Note: For large data, you should manually chunk this or use a loop helper.
 */
export function createWriteInstruction(args: WriteRecordArgs): Instruction {
  return getWriteInstruction(
    {
      recordAccount: args.recordAccount,
      authority: args.authority,
      offset: BigInt(args.offset),
      data: args.data,
    },
    { programAddress: args.programId }
  );
}

export interface ReallocateRecordArgs {
  rpc: Rpc<GetBalanceApi & GetMinimumBalanceForRentExemptionApi>;
  payer: KeyPairSigner;
  recordAccount: Address;
  authority: TransactionSigner;
  newDataLength: number | bigint;
  programId?: Address;
}

/**
 * High-level function to reallocate a Record Account.
 * Checks if additional lamports are needed for the new size and adds a transfer instruction if so.
 */
export async function reallocateRecord({
  rpc,
  payer,
  recordAccount,
  authority,
  newDataLength,
  programId = SPL_RECORD_PROGRAM_ADDRESS,
}: ReallocateRecordArgs): Promise<Instruction[]> {
  const ixs: Instruction[] = [];
  const newSpace = RECORD_META_DATA_SIZE + BigInt(newDataLength);
  const requiredRent = await rpc
    .getMinimumBalanceForRentExemption(newSpace)
    .send();
  const currentBalance = await rpc.getBalance(recordAccount).send();

  if (requiredRent > currentBalance.value) {
    const lamportsNeeded = requiredRent - currentBalance.value;
    ixs.push(
      getTransferSolInstruction({
        source: payer,
        destination: recordAccount,
        amount: lamportsNeeded,
      })
    );
  }

  ixs.push(
    getReallocateInstruction(
      {
        recordAccount,
        authority,
        dataLength: BigInt(newDataLength),
      },
      { programAddress: programId }
    )
  );

  return ixs;
}

export interface SetAuthorityArgs {
  recordAccount: Address;
  authority: TransactionSigner;
  newAuthority: Address;
  programId?: Address;
}

export function createSetAuthorityInstruction(
  args: SetAuthorityArgs
): Instruction {
  return getSetAuthorityInstruction(
    {
      recordAccount: args.recordAccount,
      authority: args.authority,
      newAuthority: args.newAuthority,
    },
    { programAddress: args.programId }
  );
}

export interface CloseRecordArgs {
  recordAccount: Address;
  authority: TransactionSigner;
  receiver: Address;
  programId?: Address;
}

export function createCloseRecordInstruction(
  args: CloseRecordArgs
): Instruction {
  return getCloseAccountInstruction(
    {
      recordAccount: args.recordAccount,
      authority: args.authority,
      receiver: args.receiver,
    },
    { programAddress: args.programId }
  );
}
