import './env';
import { runWorker } from '../src/server/jobs';
await runWorker(process.argv.includes('--once'));
