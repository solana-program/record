# record

The SPL Record program and its clients. The record program provides a simple
instruction for writing immutable data on-chain.

## Deployment

The record program v0.3.0 is deployed on all the Solana clusters including
Mainnet Beta with the program ID `recr1L3PCGKLbckBqMNcJhuuyU1zgo8nBhfLVsJNwr5`.

## Building and Testing

### Program

1. **Build the Program:**

```bash
make build-sbf-program
```

2. **Run Tests:**

```bash
make test-program
```

### JS Client

1. **Build Package:**

```bash
cd clients/js-legacy
pnpm i
pnpm build
```

2. **Run Tests:**

```bash
make test-js-clients-js-legacy
```
