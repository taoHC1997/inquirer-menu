"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuWorker = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
class MenuWorker {
    constructor(menu) {
        this.history = [];
        this.menuMap = this.menu2map(menu);
    }
    menu2map(menu, result = new Map(), deep = 0, flags = []) {
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
    historyChange(menuAction, menuId) {
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
    findChoices(id) {
        let length;
        const keys = [];
        const choices = [];
        if (!id) {
            length = 1;
            this.menuMap.forEach((val, key) => {
                if (key.split('-').length == length) {
                    keys.push(key);
                    choices.push(val.name);
                }
            });
        }
        else {
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
    tryAction(id) {
        var _a, _b;
        if ((_a = this.menuMap.get(id)) === null || _a === void 0 ? void 0 : _a.action) {
            (_b = this.menuMap.get(id)) === null || _b === void 0 ? void 0 : _b.action();
        }
    }
    loop(id) {
        const { choices, keys } = this.findChoices(id);
        const question = {
            type: 'list',
            name: 'next',
            message: 'next menu ? ',
        };
        if (id) {
            question.choices = [...choices, new inquirer_1.default.Separator(), 'BACK'];
        }
        else {
            question.choices = [...choices, new inquirer_1.default.Separator(), 'EXIT'];
        }
        inquirer_1.default
            .prompt(question)
            .then((answers) => {
            let nextId;
            if (answers.next === 'EXIT') {
                return;
            }
            else if (answers.next === 'BACK') {
                nextId = this.historyChange('POP');
            }
            else {
                nextId = keys[choices.indexOf(answers.next)];
                this.historyChange('PUSH', nextId);
                this.tryAction(nextId);
            }
            this.loop(nextId);
        })
            .catch((error) => {
            if (error.isTtyError) {
                console.log(error);
            }
            else {
                console.log(error);
            }
        });
    }
    start() {
        this.loop();
    }
}
exports.MenuWorker = MenuWorker;
//# sourceMappingURL=index.js.map