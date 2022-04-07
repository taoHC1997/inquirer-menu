import { InquirerWorker } from '../src/index';
import { myMenu } from './config';

function main(): void {
  const inquirerWorker = InquirerWorker.getInquirerWorker();
  inquirerWorker.startWithMenu(myMenu);
}

main();
