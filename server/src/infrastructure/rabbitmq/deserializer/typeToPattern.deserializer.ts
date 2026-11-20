import { ConsumerDeserializer, IncomingEvent } from '@nestjs/microservices';

export class TypeToPatternDeserializer implements ConsumerDeserializer {
  deserialize(value: any): IncomingEvent {
    if (value?.pattern !== undefined) return value;            // ClientProxy.emit
    return { pattern: value?.type, data: value?.data };        // RabbitMQService.publish
  }
}