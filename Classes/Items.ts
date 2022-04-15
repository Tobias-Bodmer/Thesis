namespace Items {
    export enum ITEMID {
        COOLDOWN
    }
    export abstract class Item extends Game.ƒAid.NodeSprite {
        public tag: Tag.TAG = Tag.TAG.ITEM;
        id: ITEMID;
        public netId: number = Networking.idGenerator();
        public description: string;
        public imgSrc: string;
        public collider: Collider.Collider;

        constructor(_id: ITEMID, _position: ƒ.Vector2, _netId?: number) {
            super(getItemById(_id).name);
            this.id = _id;
            const item = getItemById(this.id);

            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            console.log("old: " + this.netId);
            this.description = item.description;
            this.imgSrc = item.imgSrc;
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = _position.toVector3();
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }

        setPosition(_position: ƒ.Vector2) {
            this.mtxLocal.translation = _position.toVector3();
        }

        public despawn(): void {
            Networking.popID(this.netId);
            Networking.removeItem(this.netId);
            Game.graph.removeChild(this);
        }

        // async collisionDetection() {
        //     let colliders: any[] = Game.graph.getChildren().filter(element => (<Entity.Entity>element).tag == Tag.TAG.PLAYER);
        //     colliders.forEach((element) => {
        //         if (this.collider.collides(element.collider) && element.properties != undefined) {
        //             // (<Player.Player>element).properties.attributes.addAttribuesByItem(this);
        //             // console.log((<Enemy.Enemy>element).properties.attributes.healthPoints);
        //             this.lifetime = 0;
        //         }
        //     })
        // }
    }

    export class InternalItem extends Item {
        value: number;
        constructor(_id: ITEMID, _value: number, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);
            this.value = _value;
            Networking.spawnInternalItem(_id, _value, _position, this.netId);
        }

        setValues(_attributes: Entity.Attributes) {
            if (Networking.client.idHost != Networking.client.id) {
                Networking.requestAvatarAttributes(_attributes, this.value, this.id)
            }
            else {
                Networking.updateAvatarAttributes(_attributes, this.value, this.id)
            }
            this.despawn();
        }


    }

    export class CooldDownDown extends InternalItem {

        setValues(_attributes: Entity.Attributes) {
            _attributes.coolDownReduction -= this.value;
            console.log(_attributes.coolDownReduction);
            super.setValues(_attributes);
        }
    }

    export function getItemById(_id: ITEMID): Items.Item {
        return Game.itemsJSON.find(item => item.id == _id);
    }

}