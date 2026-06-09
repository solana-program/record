import {
  getCreateAccountInstruction,
  getCreateAccountWithSeedInstruction,
} from '@solana-program/system';
import {
  Address,
  ClientWithGetMinimumBalance,
  createAddressWithSeed,
  getUtf8Decoder,
  InstructionPlan,
  Lamports,
  ReadonlyUint8Array,
  sequentialInstructionPlan,
  TransactionSigner,
} from '@solana/kit';

import { getRecordSize } from './constants';
import { getInitializeInstruction, RECORD_PROGRAM_ADDRESS } from './generated';

export interface CreateRecordInstructionPlanInput {
  /** Funding account that pays for the new record account's rent. */
  payer: TransactionSigner;
  /** New record account to create. Must be a fresh, unused keypair. */
  newRecord: TransactionSigner;
  /** The authority that will own the created record account. */
  authority: Address;
  /** The number of bytes of record payload to allocate (excluding the header). */
  dataLength: number | bigint;
  /**
   * Optional override for the amount of Lamports to fund the record account with.
   * @default enough to make the account rent-exempt for the given `dataLength`
   */
  recordAccountLamports?: Lamports;
}

export interface CreateRecordInstructionPlanConfig {
  /** Override the System program address. */
  systemProgram?: Address;
  /** Override the Record program address. */
  recordProgram?: Address;
}

/**
 * Builds a plan that creates and initializes a brand new record account owned by
 * a fresh keypair. The account is created via the System program's
 * `CreateAccount` instruction and then initialized with `input.authority` as its
 * record authority.
 *
 * Use {@link getCreateRecordWithSeedInstructionPlan} to create a record account
 * at a seed-derived address instead.
 */
export async function getCreateRecordInstructionPlan(
  client: ClientWithGetMinimumBalance,
  input: CreateRecordInstructionPlanInput,
  config?: CreateRecordInstructionPlanConfig,
): Promise<InstructionPlan> {
  const recordProgram = config?.recordProgram ?? RECORD_PROGRAM_ADDRESS;
  const space = getRecordSize(input.dataLength);
  const lamports = input.recordAccountLamports ?? (await client.getMinimumBalance(Number(space)));

  return sequentialInstructionPlan([
    getCreateAccountInstruction(
      {
        payer: input.payer,
        newAccount: input.newRecord,
        lamports,
        space,
        programAddress: recordProgram,
      },
      { programAddress: config?.systemProgram },
    ),
    getInitializeInstruction(
      { recordAccount: input.newRecord.address, authority: input.authority },
      { programAddress: recordProgram },
    ),
  ]);
}

export interface CreateRecordWithSeedInstructionPlanInput {
  /** Funding account that pays for the new record account's rent. */
  payer: TransactionSigner;
  /** The authority that will own the created record account. */
  authority: Address;
  /** The number of bytes of record payload to allocate (excluding the header). */
  dataLength: number | bigint;
  /** The seed used to derive the record account address. */
  seed: ReadonlyUint8Array | string;
  /**
   * The base signer used to derive the record account address.
   * @default the `payer`
   */
  baseAccount?: TransactionSigner;
  /**
   * Optional override for the amount of Lamports to fund the record account with.
   * @default enough to make the account rent-exempt for the given `dataLength`
   */
  recordAccountLamports?: Lamports;
}

/**
 * Builds a plan that creates and initializes a record account at a seed-derived
 * address. The account is created via the System program's
 * `CreateAccountWithSeed` instruction and then initialized with
 * `input.authority` as its record authority.
 *
 * The derived address can be computed independently with
 * {@link getRecordAddressWithSeed}.
 */
export async function getCreateRecordWithSeedInstructionPlan(
  client: ClientWithGetMinimumBalance,
  input: CreateRecordWithSeedInstructionPlanInput,
  config?: CreateRecordInstructionPlanConfig,
): Promise<InstructionPlan> {
  const recordProgram = config?.recordProgram ?? RECORD_PROGRAM_ADDRESS;
  const baseAccount = input.baseAccount ?? input.payer;
  // Normalize the seed to a string once so that the off-chain address derivation
  // and the on-chain `CreateAccountWithSeed` derivation agree on the exact seed.
  const seed = normalizeSeed(input.seed);
  const space = getRecordSize(input.dataLength);
  const lamports = input.recordAccountLamports ?? (await client.getMinimumBalance(Number(space)));
  const recordAccount = await getRecordAddressWithSeed({
    baseAddress: baseAccount.address,
    seed,
    recordProgram,
  });

  return sequentialInstructionPlan([
    getCreateAccountWithSeedInstruction(
      {
        payer: input.payer,
        newAccount: recordAccount,
        baseAccount,
        base: baseAccount.address,
        seed,
        amount: lamports,
        space,
        programAddress: recordProgram,
      },
      { programAddress: config?.systemProgram },
    ),
    getInitializeInstruction(
      { recordAccount, authority: input.authority },
      { programAddress: recordProgram },
    ),
  ]);
}

/**
 * Derives the address of a seed-based record account, mirroring the derivation
 * performed by {@link getCreateRecordWithSeedInstructionPlan}. A `Uint8Array`
 * seed is normalized to its UTF-8 string form so the result matches the address
 * the on-chain program derives from the seed string.
 */
export async function getRecordAddressWithSeed(input: {
  baseAddress: Address;
  seed: ReadonlyUint8Array | string;
  recordProgram?: Address;
}): Promise<Address> {
  return createAddressWithSeed({
    baseAddress: input.baseAddress,
    seed: normalizeSeed(input.seed),
    programAddress: input.recordProgram ?? RECORD_PROGRAM_ADDRESS,
  });
}

function normalizeSeed(seed: ReadonlyUint8Array | string): string {
  return typeof seed === 'string' ? seed : getUtf8Decoder().decode(seed);
}
