import { Injectable } from '@nestjs/common';
import { performance } from 'node:perf_hooks';

@Injectable()
export class MetricsService {

    start(name: string) {
        const start = performance.now();

        return {
            end: (metadata?: Record<string, unknown>) => {
                const duration = performance.now() - start;

                console.log({
                    metric: name,
                    duration: `${duration.toFixed(2)}ms`,
                    metadata,
                });

                return duration;
            },
        };
    }
}