interface _MenuBase {
  name: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action?: any;
  children?: Menu[];
  _id?: string;
}
export type Menu = _MenuBase;

export function menu2map(
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
      menu2map(value.children, result, deep + 1, flags);
    }
    flag++;
  }
  return result;
}

export class MenuWorker {
  private menuMap: Map<string, Menu>;
  private history: string[] = [];
  private nowId?: string;

  constructor(menu: Menu[]) {
    this.menuMap = menu2map(menu);
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

  private async tryAction(id: string): Promise<void> {
    if (this.menuMap.get(id)?.action) {
      await this.menuMap.get(id)?.action();
    }
  }

  public async next(answerId?: string) {
    const { choices, keys } = this.findChoices(this.nowId);
    if (answerId === 'EXIT') {
      // NOTE: handle in InquirerWorker
    } else if (answerId === 'BACK') {
      this.nowId = this.historyChange('POP');
    } else if (answerId) {
      this.nowId = keys[choices.indexOf(answerId)];
      this.historyChange('PUSH', this.nowId);
      // try to do action
      await this.tryAction(this.nowId);
    } else {
      this.nowId = undefined;
    }

  }

  public getNextQuestion() {
    if (this.nowId && !this.canableNext(this.nowId)) {
      this.nowId = this.historyChange('POP');
    }
    const { choices } = this.findChoices(this.nowId);
    let nextQuestion: string[]
    if (this.nowId) {
      nextQuestion = [...choices, 'BACK'];
    } else {
      nextQuestion = [...choices, 'EXIT'];
    }
    return nextQuestion;
  }
}
