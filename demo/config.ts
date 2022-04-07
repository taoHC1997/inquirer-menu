import { InquirerWorker, Menu } from '../src/index';

export const myMenu: Menu[] = [
  {
    name: 'worker-1',
    description: 'some worker for something',
    children: [
      {
        name: 'worker-1-1 running',
        description: 'some worker running',
        action: function () {
          console.log('I am running !!!');
        },
      },
      {
        name: 'worker-1-2',
        children: [
          {
            name: 'worker-1-2-1',
          },
          {
            name: 'worker-1-2-1',
          },
        ],
      },
    ],
  },
  {
    name: 'worker-2',
    description: 'some worker for something else',
    children: [
      {
        name: 'worker-2-1 inputs to number array',
        action: async function () {
          const inquirerWorker = InquirerWorker.getInquirerWorker();
          // Note: must use `await`
          await inquirerWorker.loop2List(parseInt).then(arr => {
            console.log(arr);
          });
        },
      },
      {
        name: 'worker-2-2 ask name',
        action: async function () {
          const inquirerWorker = InquirerWorker.getInquirerWorker();
          const firstNmae = await inquirerWorker.ask(
            {
              type: "input",
              // Note: `name` will be rewrite in InquirerWorker
              // name: "first_name",
              message: "What's your first name",
            })
          const lastNmae = await inquirerWorker.ask(
            {
              type: "input",
              message: "What's your last name",
            })
          console.log(`Hello ${firstNmae} ${lastNmae}`);
        },
      },
    ],
  },
];
