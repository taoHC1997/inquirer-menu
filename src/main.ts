import inquirer, { QuestionCollection } from 'inquirer';
import { Subject, Observable } from "rxjs";
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
  private menuWorker?: MenuWorker;

  public answerList: Array<JSON> = [];

  static defaultTransformInputValue: TransformValueFunction = (v) => v;

  private constructor() {
    this._prompts = new Subject();
    this.stream = inquirer.prompt(this._prompts as QuestionCollection).ui.process;
    this.init();
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

  private init() {
    // For menuQuestion
    this.stream.pipe(filter((result) => {
      return result.name.startsWith('_menu');
    })).
      subscribe({
        next: (result) => {
          this._index++;
          if (result.answer === 'EXIT') {
            this.complete();
          } else {
            // will do menu action
            this.menuWorker?.next(result.answer)
            this.nextMenu();
          }
        },
        error: (error) => {
          console.error(error);
        },
        complete: () => {
          // console.log('complete menu');
        },
      });
    // For loopQuestion
    this.stream.pipe(filter((result) => {
      return result.name.startsWith('_loop');
    })).
      subscribe({
        next: (result) => {
          let answer = result.answer;
          if (answer.toLowerCase() === 'n') {
            this.nextMenu();
          } else {
            this._index++;
            if (answer) {
              this.answerList.push(answer);
              this.nextMenu();
            } else {
              this.nextMenu();
            }
          }
        },
        error: (error) => {
          console.error(error);
        },
        complete: () => {
          // console.log('complete loop');
        },
      });
  }

  private nextMenu() {
    this._prompts.next(this.menuQuestion());
  }

  private nextQuestion() {
    this._prompts.next(this.loopQuestion());
  }

  private complete() {
    this._prompts.complete();
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

  private loopQuestion = () => {
    return {
      type: 'input',
      name: `_loop-${this._index}`,
      message: 'next ?(N to BACK)',
    };
  };

  public startWithMenu(menu: Menu[]) {
    this.menuWorker = new MenuWorker(menu);
    this.menuWorker.next();
    this.nextMenu();
  }
}

