import { Menu } from '../src/index';

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
        name: 'worker-2-1',
      },
      {
        name: 'worker-2-2',
      },
    ],
  },
];
