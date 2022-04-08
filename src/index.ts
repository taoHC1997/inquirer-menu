import inquirer, { QuestionCollection } from 'inquirer';
import { Subject, Observable, Subscription } from "rxjs";
import { filter } from "rxjs/operators";

/**
 * Transform inquirer answer
 */
export type TransformValueFunction = (v: string) => string | number | boolean | null;

export class InquirerWorker {

  private static instance: InquirerWorker;

  private _index = 0;
  private _prompts: Subject<any>;
  private stream: Observable<{ name: string, answer: any; }>;
  private loop$?: Subscription;
  private once$?: Subscription;
  private menuWorker?: MenuWorker;
  private answerList: Array<JSON> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ui: any;

  static defaultTransformInputValue: TransformValueFunction = (v) => v;

  private constructor() {
    this.ui = new inquirer.ui.BottomBar();
    this._prompts = new Subject();
    this.stream = inquirer.prompt(this._prompts as QuestionCollection).ui.process;
  }

  /**
   * Get InquirerWorker
   * @param menu Must be set for the first time and then not work
   * @returns InquirerWorker
   */
  public static getInquirerWorker() {
    if (!this.instance) {
      this.instance = new InquirerWorker();
    }
    return this.instance;
  }

  private write(val: string) {
    this.ui.log.write(val);
  }

  private complete() {
    this._prompts.complete();
  }

  private nextMenu() {
    this._prompts.next(this.menuQuestion());
  }

  private menuQuestion = () => {
    let choices: any = this.menuWorker?.getNextQuestion();
    choices?.splice(-1, 0, new inquirer.Separator())
    const question: QuestionCollection = {
      type: 'list',
      name: `_menu-${this._index}`,
      message: 'next menu ? ',
      choices: choices
    }
    return question;
  };

  /**
   * set menu and then start inquirer
   * @param menu
   */
  public startWithMenu(menu: Menu[]) {
    this.menuWorker = new MenuWorker(menu);
    this.menuWorker.next();
    this.stream.pipe(filter((result) => {
      return result.name.startsWith('_menu');
    })).
      subscribe({
        next: async (result) => {
          this._index++;
          if (result.answer === 'EXIT') {
            this.complete();
          } else {
            // will do menu action
            await this.menuWorker?.next(result.answer)
            this.nextMenu();
          }
        },
        error: (error) => {
          console.error(error);
        },
        complete: () => {
          // complete menu
        },
      });
    this.nextMenu();
  }

  private nextLoopQuestion() {
    this._prompts.next(this.loopQuestion());
  }

  private loopQuestion = () => {
    return {
      type: 'input',
      name: `_loop-${this._index}`,
      message: 'next ?(N to BACK)',
    };
  };

  /**
   * get a series of values of the same type
   * @param doForInputFunction
   */
  public loop2List(doForInputFunction: TransformValueFunction = InquirerWorker.defaultTransformInputValue) {
    this.answerList = [];
    return new Promise((resolve) => {
      // For loopQuestion
      this.loop$ = this.stream.pipe(
        filter((result) => {
          return result.name.startsWith('_loop');
        })
      ).subscribe({
        next: (result) => {
          let answer = result.answer;
          if (answer.toLowerCase() === 'n') {
            this.loop$?.unsubscribe();
            // end for loop
            resolve(this.answerList);
          } else {
            this._index++;
            answer = doForInputFunction(answer);
            if (answer) {
              this.answerList.push(answer);
              this.nextLoopQuestion();
            } else {
              this.write('nothing happened');
              this.nextLoopQuestion();
            }
          }
        },
        error: (error) => {
          console.error(error);
        },
        complete: () => {
          // complete loop
        },
      });
      this.nextLoopQuestion();
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onceQuestion(question: any) {
    question.name = `_once-${this._index}`;
    this._prompts.next(question);
  }

  /**
   * ask one question
   * @param doForInputFunction
   */
  public ask(question: QuestionCollection, doForInputFunction: TransformValueFunction = InquirerWorker.defaultTransformInputValue) {
    return new Promise((resolve) => {
      // For onceQuestion
      this.once$ = this.stream.pipe(
        filter((result) => {
          return result.name.startsWith('_once');
        })
      ).subscribe({
        next: (result) => {
          let answer = result.answer;
          this._index++;
          answer = doForInputFunction(answer);
          if (answer) {
            this.once$?.unsubscribe();
            // end for once
            resolve(answer);
          } else {
            this.write('nothing happened and once again');
            this.onceQuestion(question);
          }
        },
        error: (error) => {
          console.error(error);
        },
        complete: () => {
          // complete once question
        },
      });
      this.onceQuestion(question);
    })
  }
}

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
