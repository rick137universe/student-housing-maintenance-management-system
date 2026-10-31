import '../lib/env';
import { runWorker } from '../../src/services/server/jobs';
await runWorker(process.argv.includes('--once'));
