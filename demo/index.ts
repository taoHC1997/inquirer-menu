import { MenuWorker } from '../src/index';
import { myMenu } from './config';

function main(): void {
  new MenuWorker(myMenu).start();
}

main();
