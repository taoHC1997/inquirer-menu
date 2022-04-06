import inquirer, { QuestionCollection } from 'inquirer';
import { Subject, Observable, Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import { Menu, MenuWorker } from './menu';

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
            resolve(result.answer);
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

