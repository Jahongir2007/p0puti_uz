import { vi } from 'vitest';

// Stand-in for the ORM's chainable query builder (db.orm.public.X.where(...).where(...).first()).
// Builder methods return the same object; the final calls resolve to what the test wants.
// Every method is a vi.fn, so tests can check what was asked, e.g. chain.where.mock.calls.
export function queryChain(result: { first?: unknown; all?: unknown; update?: unknown; create?: unknown } = {}) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const m of ['where', 'select', 'orderBy', 'include', 'limit', 'cursor']) {
        chain[m] = vi.fn(() => chain);
    }
    chain.first = vi.fn(async () => result.first ?? null);
    chain.all = vi.fn(async () => result.all ?? []);
    chain.update = vi.fn(async () => result.update ?? null);
    chain.create = vi.fn(async () => result.create ?? null);
    return chain;
}

// MetricsService that records nothing
export const fakeMetrics = () => ({ start: () => ({ end: () => 0 }) });

// RabbitMQService that remembers what was published and which handler consumes which queue
export function fakeRabbit() {
    const handlers: Record<string, (data: any) => Promise<void>> = {};
    return {
        published: [] as { queue: string; data: any }[],
        handlers,
        publish: vi.fn(async function (this: any, queue: string, data: unknown) {
            this.published.push({ queue, data });
        }),
        consume: vi.fn(async (queue: string, handler: (data: any) => Promise<void>) => {
            handlers[queue] = handler;
        }),
    };
}
