import { describe, it } from 'vitest';
import { createTestWorld, spawnMothership, spawnAsteroid, spawnMiner, spawnRelayNode } from './helpers';
import { createMiningSystem } from '../miningSystem';
import { createTransportEmissionSystem } from '../transportEmissionSystem';
import { createTransportMovementSystem } from '../transportMovementSystem';
import { createTransportRelaySystem } from '../transportRelaySystem';
import { GameState } from '../../resources';
import { MinerData } from '../../components';
import { TRANSPORT_LINE_VELOCITY, TRANSPORT_PACKET_SIZE, MINER_BUFFER_MAX } from '../../constants';

function runAllSystems(world: ReturnType<typeof createTestWorld>, dt: number) {
  createMiningSystem()(world, dt);
  world.flush();
  createTransportEmissionSystem()(world, dt);
  world.flush();
  createTransportMovementSystem()(world, dt);
  world.flush();
  createTransportRelaySystem()(world, dt);
  world.flush();
}

function buildDirectMiners(world: ReturnType<typeof createTestWorld>, mothership: number, count: number, prefilled = true) {
  for (let i = 0; i < count; i++) {
    const ast = spawnAsteroid(world, 200 + i * 5, 0, 999999);
    const miner = spawnMiner(world, 100 + i * 5, 0, mothership, ast);
    if (prefilled) {
      const md = world.get(miner, MinerData)!;
      md.buffer = MINER_BUFFER_MAX;
    }
  }
}

function buildRelayChain(world: ReturnType<typeof createTestWorld>, mothership: number, depth: number): number {
  let parent = mothership;
  for (let i = 0; i < depth; i++) {
    const relay = spawnRelayNode(world, (i + 1) * 100, 0, parent);
    parent = relay;
  }
  return parent;
}

type PerfResult = {
  label: string;
  ticks: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  totalMs: number;
  oreDelivered: number;
};

function benchmark(label: string, world: ReturnType<typeof createTestWorld>, ticks: number): PerfResult {
  const state = world.getResource(GameState);
  const initialResources = state.resources;
  const times: number[] = [];
  const dt = 1 / 60;

  for (let t = 0; t < ticks; t++) {
    const start = performance.now();
    runAllSystems(world, dt);
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }

  const meanMs = times.reduce((a, b) => a + b, 0) / times.length;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);
  const totalMs = times.reduce((a, b) => a + b, 0);
  const oreDelivered = state.resources - initialResources;

  return { label, ticks, meanMs, minMs, maxMs, totalMs, oreDelivered };
}

function printReport(results: PerfResult[]) {
  const h = `${'SCENARIO'.padEnd(38)} | ${'TICKS'.padEnd(6)} | ${'MEAN(ms)'.padEnd(10)} | ${'MIN(ms)'.padEnd(9)} | ${'MAX(ms)'.padEnd(9)} | ${'TOTAL(s)'.padEnd(9)} | ${'ORE/s'.padEnd(10)} | ${'PKT/s'.padEnd(9)}`;
  const s = `${'-'.repeat(38)}-+-${'-'.repeat(6)}-+-${'-'.repeat(10)}-+-${'-'.repeat(9)}-+-${'-'.repeat(9)}-+-${'-'.repeat(9)}-+-${'-'.repeat(10)}-+-${'-'.repeat(9)}`;
  console.log('\n=== TRANSPORT PERFORMANCE REPORT ===\n');
  console.log(h);
  console.log(s);
  for (const r of results) {
    const totalSec = (r.totalMs / 1000).toFixed(3);
    const simSec = r.ticks * (1 / 60);
    const orePerSec = simSec > 0 ? (r.oreDelivered / simSec).toFixed(1) : '0.0';
    const pktPerSec = simSec > 0 ? ((r.oreDelivered / TRANSPORT_PACKET_SIZE) / simSec).toFixed(1) : '0.0';
    console.log(
      `${r.label.padEnd(38)} | ${String(r.ticks).padEnd(6)} | ${r.meanMs.toFixed(4).padEnd(10)} | ${r.minMs.toFixed(4).padEnd(9)} | ${r.maxMs.toFixed(4).padEnd(9)} | ${totalSec.padEnd(9)} | ${orePerSec.padEnd(10)} | ${pktPerSec.padEnd(9)}`,
    );
  }
  console.log(`\nConfig: velocity=${TRANSPORT_LINE_VELOCITY} u/s, packetSize=${TRANSPORT_PACKET_SIZE}, dt=1/60s`);
  console.log('=== END REPORT ===\n');
}

describe('transport performance', () => {
  const scenarios: Array<{ label: string; setup: (w: ReturnType<typeof createTestWorld>) => void; ticks: number }> = [
    {
      label: '1 miner direct (prefilled)',
      ticks: 2000,
      setup: (w) => {
        const ms = spawnMothership(w);
        const ast = spawnAsteroid(w, 200, 0, 999999);
        const miner = spawnMiner(w, 100, 0, ms, ast);
        w.get(miner, MinerData)!.buffer = MINER_BUFFER_MAX;
      },
    },
    {
      label: '10 miners direct (prefilled)',
      ticks: 2000,
      setup: (w) => buildDirectMiners(w, spawnMothership(w), 10, true),
    },
    {
      label: '50 miners direct (prefilled)',
      ticks: 1000,
      setup: (w) => buildDirectMiners(w, spawnMothership(w), 50, true),
    },
    {
      label: '100 miners direct (prefilled)',
      ticks: 500,
      setup: (w) => buildDirectMiners(w, spawnMothership(w), 100, true),
    },
    {
      label: '10 miners -> 1 relay each',
      ticks: 2000,
      setup: (w) => {
        const ms = spawnMothership(w);
        for (let i = 0; i < 10; i++) {
          const relay = spawnRelayNode(w, 100, i * 30, ms);
          const ast = spawnAsteroid(w, 200, i * 30, 999999);
          const miner = spawnMiner(w, 150, i * 30, relay, ast);
          w.get(miner, MinerData)!.buffer = MINER_BUFFER_MAX;
        }
      },
    },
    {
      label: 'deep chain 10 hops (prefilled)',
      ticks: 3000,
      setup: (w) => {
        const ms = spawnMothership(w);
        const last = buildRelayChain(w, ms, 10);
        const ast = spawnAsteroid(w, 1100, 0, 999999);
        const miner = spawnMiner(w, 1050, 0, last, ast);
        w.get(miner, MinerData)!.buffer = 999;
      },
    },
    {
      label: '50 mixed (30 relay + 20 direct)',
      ticks: 500,
      setup: (w) => {
        const ms = spawnMothership(w);
        for (let i = 0; i < 30; i++) {
          const relay = spawnRelayNode(w, 100, i * 30, ms);
          const ast = spawnAsteroid(w, 200, i * 30, 999999);
          const miner = spawnMiner(w, 150, i * 30, relay, ast);
          w.get(miner, MinerData)!.buffer = 999;
        }
        for (let i = 30; i < 50; i++) {
          const ast = spawnAsteroid(w, 100, i * 30, 999999);
          const miner = spawnMiner(w, 50, i * 30, ms, ast);
          w.get(miner, MinerData)!.buffer = 999;
        }
      },
    },
  ];

  const results: PerfResult[] = [];

  for (const sc of scenarios) {
    it(`perf: ${sc.label}`, () => {
      const world = createTestWorld();
      sc.setup(world);
      const result = benchmark(sc.label, world, sc.ticks);
      results.push(result);
      if (results.length === scenarios.length) {
        printReport(results);
      }
    });
  }
});
