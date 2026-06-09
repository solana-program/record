import {
  ClientWithGetMinimumBalance,
  ClientWithPayer,
  ClientWithRpc,
  GetBalanceApi,
  pipe,
} from '@solana/kit';
import {
  addSelfPlanAndSendFunctions,
  SelfPlanAndSendFunctions,
} from '@solana/kit/program-client-core';

import {
  getCreateRecordInstructionPlan,
  getCreateRecordWithSeedInstructionPlan,
} from './createRecord';
import {
  recordProgram as generatedRecordProgram,
  RecordPlugin as GeneratedRecordPlugin,
  RecordPluginInstructions as GeneratedRecordPluginInstructions,
  RecordPluginRequirements as GeneratedRecordPluginRequirements,
} from './generated';
import { getReallocateRecordInstructionPlan } from './reallocateRecord';

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type PluginInstructionInput<TFn extends (client: never, input: never, config?: never) => unknown> =
  MakeOptional<Parameters<TFn>[1], 'payer'>;

type PluginInstructionConfig<TFn extends (client: never, input: never, config?: never) => unknown> =
  Parameters<TFn>[2];

type PluginInstructionReturn<TFn extends (client: never, input: never, config?: never) => unknown> =
  ReturnType<TFn> & SelfPlanAndSendFunctions;

export type RecordPluginRequirements = GeneratedRecordPluginRequirements &
  ClientWithGetMinimumBalance &
  ClientWithPayer &
  ClientWithRpc<GetBalanceApi>;

export type RecordPlugin = Omit<GeneratedRecordPlugin, 'instructions'> & {
  instructions: RecordPluginInstructions;
};

export type RecordPluginInstructions = GeneratedRecordPluginInstructions & {
  /** Create and initialize a brand new record account owned by a fresh keypair. */
  createRecord: (
    input: PluginInstructionInput<typeof getCreateRecordInstructionPlan>,
    config?: PluginInstructionConfig<typeof getCreateRecordInstructionPlan>,
  ) => PluginInstructionReturn<typeof getCreateRecordInstructionPlan>;
  /** Create and initialize a record account at a seed-derived address. */
  createRecordWithSeed: (
    input: PluginInstructionInput<typeof getCreateRecordWithSeedInstructionPlan>,
    config?: PluginInstructionConfig<typeof getCreateRecordWithSeedInstructionPlan>,
  ) => PluginInstructionReturn<typeof getCreateRecordWithSeedInstructionPlan>;
  /** Reallocate a record account, topping up rent when growing it. */
  reallocateRecord: (
    input: PluginInstructionInput<typeof getReallocateRecordInstructionPlan>,
    config?: PluginInstructionConfig<typeof getReallocateRecordInstructionPlan>,
  ) => PluginInstructionReturn<typeof getReallocateRecordInstructionPlan>;
};

export function recordProgram() {
  return <T extends RecordPluginRequirements>(client: T) => {
    const withPayer = <TInput extends { payer?: RecordPluginRequirements['payer'] }>(
      input: TInput,
    ) =>
      ({ ...input, payer: input.payer ?? client.payer }) as TInput & {
        payer: RecordPluginRequirements['payer'];
      };

    return pipe(client, generatedRecordProgram(), c => {
      const instructions: RecordPluginInstructions = {
        ...c.record.instructions,
        createRecord: (input, config) =>
          addSelfPlanAndSendFunctions(
            client,
            getCreateRecordInstructionPlan(client, withPayer(input), config),
          ),
        createRecordWithSeed: (input, config) =>
          addSelfPlanAndSendFunctions(
            client,
            getCreateRecordWithSeedInstructionPlan(client, withPayer(input), config),
          ),
        reallocateRecord: (input, config) =>
          addSelfPlanAndSendFunctions(
            client,
            getReallocateRecordInstructionPlan(client, withPayer(input), config),
          ),
      };

      return { ...c, record: { ...c.record, instructions } };
    });
  };
}
