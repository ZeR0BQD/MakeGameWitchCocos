import {
  _decorator,
  EventTarget,
  Component,
  Node,
  EventTouch,
  Vec3,
  UITransform,
} from "cc";
const { ccclass, property } = _decorator;

/**
 * Global event instance để giao tiếp với Movement
 */
export const joystickEvents = new EventTarget();

/**
 * Joystick component - FIXED mode đơn giản
 */
@ccclass("Joystick")
export class Joystick extends Component {
  @property({
    type: Node,
    tooltip: "Node chấm tròn ở giữa (di chuyển theo ngón tay)",
  })
  dot: Node | null = null;

  @property({
    type: Node,
    tooltip: "Node vòng tròn ngoài (background)",
  })
  ring: Node | null = null;

  @property({
    tooltip: "Bán kính vòng tròn (pixels)",
  })
  radius: number = 80;

  @property({
    type: Node,
    tooltip: "Vùng giới hạn touch (optional, nếu null thì không giới hạn)",
  })
  touchArea: Node | null = null;

  private _isDragging: boolean = false;

  onLoad() {
    if (!this.dot || !this.ring) {
      console.error("[Joystick] Chưa assign Dot hoặc Ring!");
      return;
    }

    const targetNode = this.touchArea || this.node;

    targetNode.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
    targetNode.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
    targetNode.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
    targetNode.on(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
  }

  onDestroy() {
    const targetNode = this.touchArea || this.node;

    targetNode.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
    targetNode.off(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
    targetNode.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
    targetNode.off(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
  }

  /**
   * Set joystick direction từ code (dùng cho keyboard input)
   * @param direction Normalized direction vector
   */
  public setDirection(direction: Vec3) {
    if (!this.dot) return;

    // Tính position trong radius
    const distance = direction.length();
    if (distance > 0) {
      const localPos = direction.clone().normalize().multiplyScalar(Math.min(distance, 1) * this.radius);
      this.dot.setPosition(localPos);
    } else {
      this.dot.setPosition(Vec3.ZERO);
    }
  }

  private _onTouchStart(event: EventTouch) {
    this._isDragging = true;
    this._updateJoystick(event);
  }

  private _onTouchMove(event: EventTouch) {
    if (!this._isDragging) return;
    this._updateJoystick(event);
  }

  private _onTouchEnd(event: EventTouch) {
    this._isDragging = false;

    // Reset dot về tâm
    if (this.dot) {
      this.dot.setPosition(Vec3.ZERO);
    }

    // Emit event STOP
    joystickEvents.emit("joystick-move", Vec3.ZERO);
  }

  private _updateJoystick(event: EventTouch) {
    if (!this.dot || !this.ring) return;

    // Lấy touch position trong UI space
    const uiLocation = event.getUILocation();
    const worldPos = new Vec3(uiLocation.x, uiLocation.y, 0);

    const ringTransform = this.ring.getComponent(UITransform);
    if (!ringTransform) return;

    const localPos = ringTransform.convertToNodeSpaceAR(worldPos);
    const distance = localPos.length();

    // Giới hạn trong vòng tròn
    if (distance > this.radius) {
      localPos.normalize().multiplyScalar(this.radius);
    }

    this.dot.setPosition(localPos);

    const direction = localPos.clone().normalize();
    joystickEvents.emit("joystick-move", direction);
  }
}

