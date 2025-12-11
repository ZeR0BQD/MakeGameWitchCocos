import { Component } from 'cc';

export abstract class IDamageable extends Component {
    public abstract takeDamage(amount: number): void;
    public abstract getCurrentHealth(): number;
    public abstract isAlive(): boolean;
}