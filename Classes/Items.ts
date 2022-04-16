namespace Items {
    export enum ITEMID {
        COOLDOWN,
        DMGUP,
        SPEEDUP,
        PROJECTILESUP,
        HEALTHUP,
        SCALEUP,
        SCALEDOWN
    }

    export let txtIceBucket: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtDmgUp: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtHealthUp: ƒ.TextureImage = new ƒ.TextureImage();




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
            this.setAttributesById(this.id, _avatar);
            this.despawn();
        }

        setAttributesById(_id: ITEMID, _avatar: Player.Player) {
            switch (_id) {
                case ITEMID.COOLDOWN:
                    _avatar.attributes.coolDownReduction = Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                    console.log(this.description + ": " + _avatar.attributes.coolDownReduction);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    break;
                case ITEMID.DMGUP:
                    _avatar.attributes.attackPoints += this.value;
                    console.log(this.description + ": " + _avatar.attributes.attackPoints);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    break;
                case ITEMID.SPEEDUP:
                    _avatar.attributes.speed = Calculation.subPercentageAmountToValue(_avatar.attributes.speed, this.value);
                    console.log(this.description + ": " + _avatar.attributes.speed);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    break;
                case ITEMID.PROJECTILESUP:
                    //TODO: implement weapon sync over network
                    break;
                case ITEMID.HEALTHUP:
                    _avatar.attributes.healthPoints = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value);
                    console.log(this.description + ": " + _avatar.attributes.maxHealthPoints);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    break;
                case ITEMID.SCALEUP:
                    _avatar.attributes.scale = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    console.log(this.description + ": " + _avatar.attributes.scale);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    //TODO: set new collider and sync over network
                    break;
                case ITEMID.SCALEDOWN:
                    _avatar.attributes.scale = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    console.log(this.description + ": " + _avatar.attributes.scale);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    //TODO: set new collider and sync over network
                    break;
            }
        }

        setTextureById(_id: ITEMID) {
            switch (_id) {
                case ITEMID.COOLDOWN:
                    this.loadTexture(txtIceBucket);
                    break;
                case ITEMID.DMGUP:
                    this.loadTexture(txtIceBucket); //TODO: add correct texture and change in JSON

                    break;
                case ITEMID.SPEEDUP:
                    //TODO: add correct texture and change in JSON

                    break;
                case ITEMID.PROJECTILESUP:
                    //TODO: add correct texture and change in JSON

                    break;
                case ITEMID.HEALTHUP:
                    this.loadTexture(txtHealthUp);
                    //TODO: add correct texture and change in JSON

                    break;
                case ITEMID.SCALEUP:
                    //TODO: add correct texture and change in JSON

                    break;
                case ITEMID.SCALEDOWN:
                    //TODO: add correct texture and change in JSON
                    break;
            }
        }
    }


    function getInternalItemById(_id: ITEMID): Items.InternalItem {
        return Game.internalItemJSON.find(item => item.id == _id);
    }

}