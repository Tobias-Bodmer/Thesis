namespace Items {
    export enum ITEMTYPE {
        ADD,
        SUBSTRACT,
        PROCENTUAL
    }
    export abstract class Item extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        public tag: Tag.TAG = Tag.TAG.ITEM;
        public netId: number = Networking.idGenerator();
        public description: string;
        public imgSrc: string;
        public collider: Game.ƒ.Rectangle;
        lifetime: number;

        constructor(_name: string, _description: string, _position: ƒ.Vector3, _imgSrc?: string, _lifetime?: number, _netId?: number) {
            super(_name);

            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }

            this.description = _description;
            this.imgSrc = _imgSrc;
            this.lifetime = _lifetime;
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.translate(_position);

            this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }

        public despawn(): void {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Game.graph.removeChild(this);
                    Networking.popID(this.netId);
                    Networking.removeItem(this.netId);
                }
            }
        }

        async collisionDetection() {
            let colliders: any[] = Game.graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.TAG.PLAYER);
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined) {
                    // (<Player.Player>element).properties.attributes.addAttribuesByItem(this);
                    // console.log((<Enemy.Enemy>element).properties.attributes.healthPoints);
                    this.lifetime = 0;
                }
            })
        }
    }

    export class InternalItem extends Item {
        public attributes: Entity.Attributes;
        public type: ITEMTYPE;
        /**
         * Creates an item that can change Attributes of the player
         * @param _name name of the Item
         * @param _description Descirption of the item
         * @param _position Position where to spawn
         * @param _lifetime optional: how long is the item visible
         * @param _attributes define which attributes will change, compare with {@link Player.Attributes}
         */
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _attributes: Entity.Attributes, _type: ITEMTYPE, _imgSrc?: string, _lifetime?: number, _netId?: number) {
            super(_name, _description, _position, _imgSrc, _lifetime, _netId);
            this.attributes = _attributes;
            this.type = _type;

            Networking.spawnItem(this.name, this.description, _position, this.imgSrc, this.lifetime, this.netId, this.attributes, this.type);
        }

        async collisionDetection(): Promise<void> {
            let colliders: any[] = Game.graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.TAG.PLAYER);
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined && (this.lifetime > 0 || this.lifetime == undefined)) {
                    (<Player.Player>element).attributes.addAttribuesByItem(this.attributes, this.type);
                    Networking.updateAvatarAttributes(this.attributes, this.type);
                    // console.log((<Enemy.Enemy>element).properties.attributes.healthPoints);
                    this.lifetime = 0;
                }
            })
        }
    }
}