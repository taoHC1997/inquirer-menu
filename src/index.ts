import inquirer, { QuestionCollection } from 'inquirer';

interface _MenuBase {
  name: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action?: any;
  children?: Menu[];
  _id?: string;
}
export type Menu = _MenuBase;

export class MenuWorker {
  private menuMap: Map<string, Menu>;
  private history: string[] = [];

  constructor(menu: Menu[]) {
    this.menuMap = this.menu2map(menu);
  }

  private menu2map(
    menu: Menu[],
    result: Map<string, Menu> = new Map(),
    deep = 0,
    flags: number[] = [],
  ): Map<string, Menu> {
    if (deep !== 0) {
      flags = flags.slice(0, deep);
    }
    let flag = 0;
    for (const value of menu) {
      flags[deep] = flag;
      const id = flags.join('-');
      value._id = id;
      result.set(id, value);
      if (value.children) {
        this.menu2map(value.children, result, deep + 1, flags);
      }
      flag++;
    }
    return result;
  }

  private historyChange(menuAction: 'PUSH' | 'POP', menuId?: string): string {
    let nextId = '';
    if (menuAction === 'POP') {
      this.history.pop();
      nextId = this.history[this.history.length - 1];
    }
    if (menuAction === 'PUSH' && menuId) {
      this.history.push(menuId);
    }
    return nextId;
  }

  private canableNext(id: string): boolean {
    return this.menuMap.get(id)?.children ? true : false;
  }

  private findChoices(id?: string) {
    let length: number;
    const keys: string[] = [];
    const choices: string[] = [];
    if (!id) {
      length = 1;
      this.menuMap.forEach((val, key) => {
        if (key.split('-').length == length) {
          keys.push(key);
          choices.push(val.name);
        }
      });
    } else {
      length = id.split('-').length + 1;
      this.menuMap.forEach((val, key) => {
        if (key.startsWith(id) && key.split('-').length == length) {
          keys.push(key);
          choices.push(val.name);
        }
      });
    }
    return { choices, keys };
  }

  private tryAction(id: string): void {
    if (this.menuMap.get(id)?.action) {
      this.menuMap.get(id)?.action();
    }
  }

  private loop(id?: string) {
    const { choices, keys } = this.findChoices(id);
    const question: QuestionCollection = {
      type: 'list',
      name: 'next',
      message: 'next menu ? ',
    };
    if (id) {
      question.choices = [...choices, new inquirer.Separator(), 'BACK'];
    } else {
      question.choices = [...choices, new inquirer.Separator(), 'EXIT'];
    }
    inquirer
      .prompt(question)
      .then((answers) => {
        let nextId: string;
        if (answers.next === 'EXIT') {
          // end for loop
          return;
        } else if (answers.next === 'BACK') {
          nextId = this.historyChange('POP');
        } else {
          nextId = keys[choices.indexOf(answers.next)];
          this.historyChange('PUSH', nextId);
          // try to do action
          this.tryAction(nextId);
        }
        // Add processing without next step
        if (!this.canableNext(nextId)) {
          nextId = this.historyChange('POP');
        }
        this.loop(nextId);
      })
      .catch((error) => {
        if (error.isTtyError) {
          console.log(error);
        } else {
          console.log(error);
        }
      });
  }

  public start() {
    this.loop();
  }
}
