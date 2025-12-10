import { _decorator, Component } from 'cc';
import { UIManager } from '../../../UI/Script/UIManager';

const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ tooltip: 'HP hiện tại' })
    private _hp: number = 100;

    @property({ tooltip: 'HP tối đa', readonly: true })
    private _maxHP: number = 100;

    @property({ tooltip: 'EXP hiện tại' })
    private _exp: number = 0;

    @property({ tooltip: 'EXP cần để level up' })
    private _maxEXP: number = 100;

    @property({ tooltip: 'Level hiện tại' })
    private _level: number = 1;

    start() {
        this._publishHP();
        this._publishEXP();
    }

    public get hp(): number {
        return this._hp;
    }

    public set hp(value: number) {
        const oldHP = this._hp;
        this._hp = Math.max(0, Math.min(this._maxHP, value));

        if (oldHP !== this._hp) {
            this._publishHP();

            if (this._hp <= 0) {
                this._onDeath();
            }
        }
    }

    public get exp(): number {
        return this._exp;
    }

    public set exp(value: number) {
        const oldEXP = this._exp;
        this._exp = Math.max(0, value);

        while (this._exp >= this._maxEXP) {
            this._levelUp();
        }

        if (oldEXP !== this._exp) {
            this._publishEXP();
        }
    }

    public get level(): number {
        return this._level;
    }

    public get maxHP(): number {
        return this._maxHP;
    }

    public get maxEXP(): number {
        return this._maxEXP;
    }

    private _publishHP(): void {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.publish('HP_CHANGED', {
                hp: this._hp,
                maxHP: this._maxHP,
                percent: this._hp / this._maxHP
            });
        }
    }

    private _publishEXP(): void {
        const uiManager = UIManager.getInstance();
        if (uiManager) {
            uiManager.publish('EXP_CHANGED', {
                exp: this._exp,
                maxEXP: this._maxEXP,
                level: this._level,
                percent: this._exp / this._maxEXP
            });
        }
    }

    private _levelUp(): void {
        this._level++;
        this._exp -= this._maxEXP;
        this._maxEXP = Math.floor(this._maxEXP * 1.5);
        this._hp = this._maxHP;

        this._publishHP();
        this._publishEXP();
    }

    private _onDeath(): void {
    }
}

