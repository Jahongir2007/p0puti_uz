import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';

type Handler = (data: any, message: ConsumeMessage) => Promise<void>;
type ConsumerDef = { queue: string; handler: Handler; prefetch: number };

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private connection!: ChannelModel;
    private channel!: Channel;
    private consumers: ConsumerDef[] = [];
    private shuttingDown = false;
    private reconnecting = false;

    async onModuleInit() {
        await this.connect();   // fails fast at boot if the broker is down
    }

    private async connect() {
        this.connection = await amqp.connect(
            process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
        );

        this.connection.on('error', (e) => console.error('RabbitMQ connection error:', e));
        this.connection.on('close', () => {
            console.error('RabbitMQ connection closed');
            if (!this.shuttingDown) void this.reconnect();
        });

        this.channel = await this.connection.createChannel();
        this.channel.on('error', (e) => console.error('RabbitMQ channel error:', e));

        // await this.channel.assertQueue('ads', { durable: true });
        for (const q of ['ads', 'telegram_events', 'users']) {
            await this.channel.assertQueue(q, { durable: true });
        }

        // re-attach consumers after a reconnect (empty on first boot)
        for (const c of this.consumers) await this.startConsumer(c);

        console.log('RabbitMQ connected');
    }

    private async reconnect() {
        if (this.reconnecting) return;
        this.reconnecting = true;
        for (let attempt = 1; !this.shuttingDown; attempt++) {
            try {
                await this.connect();
                break;
            } catch {
                const delay = Math.min(1000 * 2 ** attempt, 30_000);
                console.error(`RabbitMQ reconnect failed, retrying in ${delay}ms`);
                await new Promise((r) => setTimeout(r, delay));
            }
        }
        this.reconnecting = false;
    }

    async publish(queue: string, data: unknown) {
        this.channel.sendToQueue(
            queue,
            Buffer.from(JSON.stringify(data)),
            { persistent: true },
        );
        console.log('Job message published');
    }

    async consume(
        queue: string,
        handler: Handler,
        options: { prefetch?: number } = {},
    ) {
        const def: ConsumerDef = { queue, handler, prefetch: options.prefetch ?? 10 };
        this.consumers.push(def);        // remembered, so reconnect() can re-attach it
        await this.startConsumer(def);
    }

    private async startConsumer({ queue, handler, prefetch }: ConsumerDef) {
        const channel = this.channel;    // capture: ack/nack must use the channel the message came from
        await channel.assertQueue(queue, { durable: true });
        await channel.prefetch(prefetch);   // before consume()

        await channel.consume(queue, async (message) => {
            if (!message) return;
            try {
                const data = JSON.parse(message.content.toString());
                await handler(data, message);
                channel.ack(message);
            } catch (error) {
                console.error(error);
                try {
                    channel.nack(message, false, false);   // don't requeue poison messages
                } catch { /* channel already closed; broker will redeliver */ }
            }
        });
    }

    getChannel(): Channel {
        return this.channel;
    }

    async onModuleDestroy() {
        this.shuttingDown = true;
        await this.channel?.close().catch(() => {});
        await this.connection?.close().catch(() => {});
    }
}