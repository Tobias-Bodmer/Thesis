namespace Items {
    export enum ITEMID {
        COOLDOWN,
        DMGUP,
        SPEEDUP,
        PROJECTILESUP
    }

    export let txtIceBucket: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtDmgUp: ƒ.TextureImage = new ƒ.TextureImage();



    export abstract class Item extends Game.ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.ITEM;
        id: ITEMID;
        public netId: number = Networking.idGenerator();
        public description: string;
        public imgSrc: string;
        public collider: Collider.Collider;

        constructor(_id: ITEMID, _position: ƒ.Vector2, _netId?: number) {
            super(getInternalItemById(_id).name);
            this.id = _id;
            const item = getInternalItemById(this.id);

            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            this.description = item.description;
            this.imgSrc = item.imgSrc;

            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad()));
            let material: ƒ.Material = new ƒ.Material("white", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.addComponent(new ƒ.ComponentMaterial(material));

            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = _position.toVector3();
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }

        async loadTexture(_texture: ƒ.TextureImage): Promise<void> {
            let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
            newTxt = _texture;
            let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
            newCoat.texture = newTxt;
            let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);

            this.getComponent(Game.ƒ.ComponentMaterial).material = newMtr;
        }

        setPosition(_position: ƒ.Vector2) {
            this.mtxLocal.translation = _position.toVector3();
        }

        public despawn(): void {
            Networking.popID(this.netId);
            Networking.removeItem(this.netId);
            Game.graph.removeChild(this);
        }

        doYourThing(_avatar: Player.Player) {

        }
    }



    export class InternalItem extends Item {
        value: number;
        constructor(_id: ITEMID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);
            this.value = getInternalItemById(_id).value;
            this.setTextureById(_id);
            Networking.spawnInternalItem(this.id, _position, this.netId);
        }

        doYourThing(_avatar: Player.Player) {
            this.setAttributesById(this.id, _avatar.attributes);
            Networking.updateAvatarAttributes(_avatar.attributes);
            this.despawn();
        }

        setAttributesById(_id: ITEMID, _attributes: Entity.Attributes) {
            switch (_id) {
                case ITEMID.COOLDOWN:
                    _attributes.coolDownReduction = _attributes.coolDownReduction * (100 / (100 + this.value));
                    break;
                case ITEMID.DMGUP:
                    _attributes.attackPoints += this.value;
            }
        }

        setTextureById(_id: ITEMID) {
            switch (_id) {
                case ITEMID.COOLDOWN:
                    this.loadTexture(txtIceBucket);
                    break;
                case ITEMID.DMGUP:
                    this.loadTexture(txtIceBucket)
            }
        }
    }


    function getInternalItemById(_id: ITEMID): Items.InternalItem {
        return Game.internalItemJSON.find(item => item.id == _id);
    }

}