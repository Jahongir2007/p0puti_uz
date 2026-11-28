import { RabbitMQService } from './rabbitmq.service.js';

// A fake amqplib channel that records what the service does with it
function fakeChannel() {
    const consumers: Record<string, (msg: unknown) => Promise<void>> = {};
    return {
        consumers,
        assertQueue: vi.fn(async () => ({})),
        prefetch: vi.fn(async () => {}),
        consume: vi.fn(async (queue: string, onMessage: (msg: unknown) => Promise<void>) => { consumers[queue] = onMessage; }),
        sendToQueue: vi.fn(() => true),
        ack: vi.fn(),
        nack: vi.fn(),
    };
}

function serviceWith(channel: ReturnType<typeof fakeChannel>) {
    const service = new RabbitMQService();
    (service as any).channel = channel; // skip the real connection
    return service;
}

const message = (body: string) => ({ content: Buffer.from(body) });

describe('RabbitMQService.publish', () => {
    it('sends JSON that survives a broker restart (persistent)', async () => {
        const channel = fakeChannel();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        await serviceWith(channel).publish('ads', { type: 'POST_AD', data: { a: 1 } });
        expect(channel.sendToQueue).toHaveBeenCalledWith('ads', Buffer.from('{"type":"POST_AD","data":{"a":1}}'), { persistent: true });
    });

    it('rejects when the channel is closed, so callers can catch it', async () => {
        const channel = fakeChannel();
        channel.sendToQueue.mockImplementation(() => { throw new Error('Channel closed'); });
        await expect(serviceWith(channel).publish('ads', {})).rejects.toThrow('Channel closed');
    });
});

describe('RabbitMQService.consume', () => {
    it('declares the queue, limits unacknowledged messages, then listens', async () => {
        const channel = fakeChannel();
        await serviceWith(channel).consume('users', async () => {}, { prefetch: 5 });
        expect(channel.assertQueue).toHaveBeenCalledWith('users', { durable: true });
        expect(channel.prefetch).toHaveBeenCalledWith(5);
        expect(channel.consumers.users).toEqual(expect.any(Function));
    });

    it('acknowledges a message after the handler finished', async () => {
        const channel = fakeChannel();
        const handler = vi.fn(async () => {});
        await serviceWith(channel).consume('ads', handler);
        const msg = message('{"type":"POST_AD"}');
        await channel.consumers.ads(msg);
        expect(handler).toHaveBeenCalledWith({ type: 'POST_AD' }, msg);
        expect(channel.ack).toHaveBeenCalledWith(msg);
    });

    it('rejects without requeueing when the handler fails, so one bad message can\'t loop forever', async () => {
        const channel = fakeChannel();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await serviceWith(channel).consume('ads', async () => { throw new Error('boom'); });
        const msg = message('{}');
        await channel.consumers.ads(msg);
        expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
        expect(channel.ack).not.toHaveBeenCalled();
    });

    it('rejects a message that is not JSON without calling the handler', async () => {
        const channel = fakeChannel();
        const handler = vi.fn();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await serviceWith(channel).consume('ads', handler);
        await channel.consumers.ads(message('not json'));
        expect(handler).not.toHaveBeenCalled();
        expect(channel.nack).toHaveBeenCalled();
    });
});
