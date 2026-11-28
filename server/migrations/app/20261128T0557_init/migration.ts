#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0f5896e5c306393d8f5aadc75d11d67ff55b15074972f163881df2ec8da11dcd/contract';
import endContract from '../../snapshots/0f5896e5c306393d8f5aadc75d11d67ff55b15074972f163881df2ec8da11dcd/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/2e5a4a0a7606e94ed69b5a4cfc33225f4cc760da524667dd8aadd624f93be233/contract';
import startContract from '../../snapshots/2e5a4a0a7606e94ed69b5a4cfc33225f4cc760da524667dd8aadd624f93be233/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createIndex({
        schema: 'public',
        table: 'vehicles',
        index: 'vehicles_plate_number_active_6979c4d1',
        columns: ['plate_number'],
        extras: { where: '(deleted_at IS NULL)', unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
