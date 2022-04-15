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
    }

    export abstract class InternalItem extends Item {
        value: number;
        constructor(_id: ITEMID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);
            this.value = getInternalValueById(_id);
            Networking.spawnInternalItem(this.id, _position, this.netId);
        }

        setValues(_attributes: Entity.Attributes) {
        }


    }

    export class CooldDownDown extends InternalItem {

        setValues(_attributes: Entity.Attributes) {
            _attributes.coolDownReduction = _attributes.coolDownReduction * (100 / (100 + this.value));
            Networking.updateAvatarAttributes(_attributes);
            this.despawn();
        }
    }

    export function getItemById(_id: ITEMID): Items.Item {
        return Game.itemsJSON.find(item => item.id == _id);
    }

    function getInternalValueById(_id: ITEMID): number {
        return Game.internalItemStatsJSON.find(item => item.id == _id).value;
    }

}