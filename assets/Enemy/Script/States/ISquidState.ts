import { SquidStateMachine } from '../SquidStateMachine';

export interface ISquidState {
    enter(squid: SquidStateMachine): void;

    execute(squid: SquidStateMachine, deltaTime: number): void;

    exit(squid: SquidStateMachine): void;
}
