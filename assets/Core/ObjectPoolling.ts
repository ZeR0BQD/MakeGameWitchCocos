import { _decorator, Component, Vec3, Node, instantiate, Prefab, CCInteger } from 'cc';
import { Squid } from '../Enemy/Script/Squid';
const { ccclass, property } = _decorator;

@ccclass('ObjectPoolling')
export class ObjectPoolling extends Component {
    _prefab: Prefab;
    @property({ type: CCInteger }) public poolSize: number;
    protected _pool: Node[] = [];
    onLoad() {
        this.instanObject();
    }

    public init(prefab: Prefab) {
        this._prefab = prefab;
    }
    protected instanObject() {
        for (let i = 0; i < this.poolSize; i++) {
            let obj = instantiate(this._prefab);
            obj.parent = this.node;
            obj.getComponent(Squid).init(this);
            obj.active = false;
            this._pool.push(obj);
        }
    }

    public getObject() {
        let obj: Node;
        if (this._pool.length > 0) {
            obj = this._pool.pop();
        } else {
            return;
        }
        obj.active = true;
        return obj;
    }

    public returnObject(obj: Node) {
        obj.active = false;
        this._pool.push(obj);
    }
}
