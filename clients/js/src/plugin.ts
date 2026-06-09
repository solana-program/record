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
  splRecordProgram as generatedSplRecordProgram,
  SplRecordPlugin as GeneratedSplRecordPlugin,
  SplRecordPluginInstructions as GeneratedSplRecordPluginInstructions,
  SplRecordPluginRequirements as GeneratedSplRecordPluginRequirements,
} from './generated';
import { getReallocateRecordInstructionPlan } from './reallocateRecord';

type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type PluginInstructionInput<TFn extends (client: never, input: never, config?: never) => unknown> =
  MakeOptional<Parameters<TFn>[1], 'payer'>;

type PluginInstructionConfig<TFn extends (client: never, input: never, config?: never) => unknown> =
  Parameters<TFn>[2];

type PluginInstructionReturn<TFn extends (client: never, input: never, config?: never) => unknown> =
  ReturnType<TFn> & SelfPlanAndSendFunctions;

export type SplRecordPluginRequirements = GeneratedSplRecordPluginRequirements &
  ClientWithGetMinimumBalance &
  ClientWithPayer &
  ClientWithRpc<GetBalanceApi>;

export type SplRecordPlugin = Omit<GeneratedSplRecordPlugin, 'instructions'> & {
  instructions: SplRecordPluginInstructions;
};

export type SplRecordPluginInstructions = GeneratedSplRecordPluginInstructions & {
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

export function splRecordProgram() {
  return <T extends SplRecordPluginRequirements>(client: T) => {
    const withPayer = <TInput extends { payer?: SplRecordPluginRequirements['payer'] }>(
      input: TInput,
    ) =>
      ({ ...input, payer: input.payer ?? client.payer }) as TInput & {
        payer: SplRecordPluginRequirements['payer'];
      };

    return pipe(client, generatedSplRecordProgram(), c => {
      const instructions: SplRecordPluginInstructions = {
        ...c.splRecord.instructions,
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

      return { ...c, splRecord: { ...c.splRecord, instructions } };
    });
  };
}
