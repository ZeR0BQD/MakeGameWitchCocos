import { _decorator, CCInteger, Input, input, KeyCode, Node } from 'cc';
import { SpawnAroundPlayer } from 'db://assets/Player/Skills/Script/SpawnAroundPlayer';
import { LightBulletCtrl } from './LightBulletCtrl';

const { ccclass, property } = _decorator;

@ccclass('SpawnLightBullet')
export class SpawnLightBullet extends SpawnAroundPlayer {
    @property({ type: CCInteger, override: true }) public numberOfObjects: number = 10;
    @property({ override: true }) public distanceSpawn: number = 50;

    // Cooldown & Stack Config
    @property({ tooltip: 'Thời gian hồi 1 stack (giây)' })
    public cooldownPerStack: number = 3.0;

    @property({ type: CCInteger, tooltip: 'Số stack tối đa' })
    public maxStacks: number = 3;

    @property({ tooltip: 'Delay giữa các lần nhấn phím (giây)' })
    public inputDelay: number = 0.75;

    // Internal state
    private _currentStacks: number = 0;
    private _cooldownTimer: number = 0;
    private _lastInputTime: number = 0;

    onLoad(): void {
        super.onLoad();
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        this._currentStacks = this.maxStacks;
    }

    onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    update(deltaTime: number): void {
        super.update(deltaTime);
        this.updateCooldown(deltaTime);
    }

    private updateCooldown(deltaTime: number): void {
        // Nếu chưa full stacks, giảm cooldown timer
        if (this._currentStacks < this.maxStacks) {
            this._cooldownTimer -= deltaTime;

            // Khi cooldown hết, hồi 1 stack
            if (this._cooldownTimer <= 0) {
                this._currentStacks++;
                console.log(`[LightBullet] Stack recharged: ${this._currentStacks}/${this.maxStacks}`);

                // Reset timer nếu vẫn chưa full
                if (this._currentStacks < this.maxStacks) {
                    this._cooldownTimer = this.cooldownPerStack;
                }
            }
        }
    }

    private onKeyDown(event: any): void {
        if (event.keyCode === KeyCode.KEY_Q) {
            this.tryActivate();
        }
    }

    /**
     * Thử activate skill với các điều kiện check
     */
    private tryActivate(): void {
        const currentTime = Date.now() / 1000; // Convert to seconds

        // Check input delay
        if (currentTime - this._lastInputTime < this.inputDelay) {
            console.log('[LightBullet] Input too fast! Wait...');
            return;
        }

        // Check stacks
        if (this._currentStacks <= 0) {
            console.log('[LightBullet] No stacks available! Cooldown remaining:', this._cooldownTimer.toFixed(1));
            return;
        }

        // Activate skill
        this.activate();
        this._currentStacks--;
        this._lastInputTime = currentTime;

        // Bắt đầu cooldown nếu không còn full stacks
        if (this._currentStacks < this.maxStacks && this._cooldownTimer <= 0) {
            this._cooldownTimer = this.cooldownPerStack;
        }

        console.log(`[LightBullet] Activated! Stacks: ${this._currentStacks}/${this.maxStacks}`);
    }

    /**
     * Public method để lấy số stacks hiện tại (cho UI)
     */
    public getCurrentStacks(): number {
        return this._currentStacks;
    }

    /**
     * Public method để lấy cooldown progress (0-1) (cho UI)
     */
    public getCooldownProgress(): number {
        if (this._currentStacks >= this.maxStacks) return 1;
        return 1 - (this._cooldownTimer / this.cooldownPerStack);
    }

    protected onSpawned(bullet: Node, angle: number, isRedistribute: boolean): void {
        const ctrl = bullet.getComponent(LightBulletCtrl);
        if (ctrl) {
            ctrl.setRotation(angle);
        }

        // Listen event return-to-pool để return bullet về pool ĐÚNG CÁCH
        bullet.off('return-to-pool'); // Remove old listener nếu có
        bullet.on('return-to-pool', () => {
            this._pool.returnObject(bullet);
            console.log('[SpawnLightBullet] Returned bullet to pool');
        }, this);
    }
}
