import { _decorator, Component, Vec3, Node, instantiate, Prefab, CCInteger, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ObjectPoolling')
export class ObjectPoolling extends Component {
    protected _prefab: Prefab;
    @property({ type: CCInteger }) public poolSize: number;
    protected _pool: Node[] = [];
    private _initialized: boolean = false;
    private _poolContainer: Node = null;
    public init(prefab: Prefab) {
        this._prefab = prefab;
        this._poolContainer = this.getOrCreatePoolContainer();
        this.instanObject();
        this._initialized = true;
    }

    private getOrCreatePoolContainer(): Node {
        const scene = director.getScene();

        let trunkNode = scene.getChildByName("GameLoop").getChildByName("Trunk");
        if (!trunkNode) {
            trunkNode = new Node("Trunk");
            trunkNode.parent = scene;
        }


        const containerName = `Trunk_${this.node.name}`;
        let poolContainer = trunkNode.getChildByName(containerName);
        if (!poolContainer) {
            poolContainer = new Node(containerName);
            poolContainer.parent = trunkNode;
            console.log(`Đã tạo pool container: ${containerName}`);
        }

        return poolContainer;
    }

    protected instanObject() {
        for (let i = 0; i < this.poolSize; i++) {
            const obj = instantiate(this._prefab);
            obj.parent = this._poolContainer;
            obj.active = false;
            this._pool.push(obj);
        }
    }

    public getObject(): Node {
        let obj: Node;

        if (this._pool.length > 0) {
            obj = this._pool.pop();
        } else {
            console.warn(`[ObjectPoolling] Pool "${this.node.name}" hết! Tạo thêm object mới.`);
            obj = instantiate(this._prefab);
            obj.parent = this._poolContainer;
        }

        obj.active = true;
        return obj;
    }

    public returnObject(obj: Node) {
        obj.active = false;
        this._pool.push(obj);
    }
}
