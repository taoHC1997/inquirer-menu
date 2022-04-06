import { InquirerWorker } from '../src/main';
import { myMenu } from './config';

function main(): void {
  const inquirerWorker = InquirerWorker.getInquirerWorker();
  inquirerWorker.startWithMenu(myMenu);
}

main();
