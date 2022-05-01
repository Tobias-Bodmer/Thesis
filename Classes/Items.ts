namespace Items {
    export enum ITEMID {
        ICEBUCKETCHALLENGE,
        DMGUP,
        SPEEDUP,
        PROJECTILESUP,
        HEALTHUP,
        SCALEUP,
        SCALEDOWN,
        ARMORUP,
        HOMECOMING,
        TOXICRELATIONSHIP,
        VAMPY,
        SLOWYSLOW

    }

    export let txtIceBucket: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtDmgUp: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtHealthUp: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtToxicRelationship: ƒ.TextureImage = new ƒ.TextureImage();


    export abstract class Item extends Game.ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.ITEM;
        id: ITEMID;
        public netId: number = Networking.idGenerator();
        public description: string;
        public imgSrc: string;
        public collider: Collider.Collider;
        transform: ƒ.ComponentTransform = new ƒ.ComponentTransform();
        position: ƒ.Vector2
        buff: Buff.Buff[] = [];

        constructor(_id: ITEMID, _position: ƒ.Vector2, _netId?: number) {
            super("item");
            this.id = _id;
            this.position = _position;
            this.transform.mtxLocal.translation = _position.toVector3();
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }


            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad()));
            let material: ƒ.Material = new ƒ.Material("white", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.addComponent(new ƒ.ComponentMaterial(material));

            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = _position.toVector3();
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2, this.netId);
            this.buff.push(this.getBuffById());
            this.setTextureById();
        }

        getBuffById(): Buff.Buff {
            let temp: Items.BuffItem = getBuffItemById(this.id);
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    return new Buff.DamageBuff(Buff.BUFFID.POISON, temp.duration, temp.tickRate, temp.value);
                case ITEMID.VAMPY:
                    return new Buff.DamageBuff(Buff.BUFFID.BLEEDING, temp.duration, temp.tickRate, temp.value);
                case ITEMID.SLOWYSLOW:
                    return new Buff.AttributesBuff(Buff.BUFFID.SLOW, temp.duration, temp.tickRate, temp.value);
                default:
                    return null;
            }
        }

        async loadTexture(_texture: ƒ.TextureImage): Promise<void> {
            let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
            newTxt = _texture;
            let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
            newCoat.texture = newTxt;
            let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);

            this.getComponent(Game.ƒ.ComponentMaterial).material = newMtr;
        }
        setTextureById() {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
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
                case ITEMID.ARMORUP:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.HOMECOMING:
                    break;
                case ITEMID.TOXICRELATIONSHIP:
                    this.loadTexture(txtToxicRelationship);
                    break;
                case ITEMID.VAMPY:
                    this.loadTexture(txtIceBucket);
                    break;
            }
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
            const item = getInternalItemById(this.id);
            if (item != undefined) {
                this.name = item.name;
                this.value = item.value;
                this.description = item.description;
                this.imgSrc = item.imgSrc;
            }
            Networking.spawnItem(this, this.id, _position, this.netId);
        }

        doYourThing(_avatar: Player.Player) {
            this.setAttributesById(_avatar);
            this.despawn();
        }

        setAttributesById(_avatar: Player.Player) {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    _avatar.attributes.coolDownReduction = Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
                case ITEMID.DMGUP:
                    _avatar.attributes.attackPoints += this.value;
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
                case ITEMID.SPEEDUP:
                    _avatar.attributes.speed = Calculation.subPercentageAmountToValue(_avatar.attributes.speed, this.value);
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
                case ITEMID.PROJECTILESUP:
                    _avatar.weapon.projectileAmount += this.value;
                    Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    break;
                case ITEMID.HEALTHUP:
                    _avatar.attributes.maxHealthPoints = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value);
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
                case ITEMID.SCALEUP:
                    _avatar.attributes.scale = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    _avatar.attributes.updateScaleDependencies();
                    _avatar.mtxLocal.scale(new ƒ.Vector3(_avatar.attributes.scale, _avatar.attributes.scale, _avatar.attributes.scale));
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    //TODO: set new collider and sync over network
                    break;
                case ITEMID.SCALEDOWN:
                    _avatar.attributes.scale = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    _avatar.attributes.updateScaleDependencies();
                    _avatar.mtxLocal.scale(new ƒ.Vector3(_avatar.attributes.scale, _avatar.attributes.scale, _avatar.attributes.scale));
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    //TODO: set new collider and sync over network
                    break;
                case ITEMID.ARMORUP:
                    _avatar.attributes.armor += this.value;
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
                case ITEMID.HOMECOMING:
                    if (_avatar instanceof Player.Ranged) {
                        _avatar.weapon.aimType = Weapons.AIM.HOMING;
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    //TODO: talk with tobi
                    break;
            }
        }
    }

    export class BuffItem extends Item {
        value: number;
        tickRate: number;
        duration: number;

        constructor(_id: ITEMID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);
            let temp = getBuffItemById(this.id);
            this.name = temp.name;
            this.value = temp.value;
            this.tickRate = temp.tickRate;
            this.duration = temp.duration;
            this.imgSrc = temp.imgSrc;
            Networking.spawnItem(this, this.id, this.mtxLocal.translation.toVector2(), this.netId);
        }

        doYourThing(_avatar: Player.Player): void {
            this.setBuffById(_avatar);
            this.despawn();
        }

        setBuffById(_avatar: Entity.Entity) {
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    let newBuff = this.buff.find(buff => buff.id == Buff.BUFFID.POISON).clone();
                    newBuff.duration = undefined;
                    (<Buff.DamageBuff>newBuff).value = 0.5;
                    _avatar.buffs.push(newBuff);
                    Networking.updateBuffList(_avatar.buffs, _avatar.netId);
                    break;
            }
        }
    }
    export function getInternalItemById(_id: ITEMID): Items.InternalItem {
        return Game.internalItemJSON.find(item => item.id == _id);
    }

    export function getBuffItemById(_id: ITEMID): Items.BuffItem {
        return Game.buffItemJSON.find(item => item.id == _id);
    }
}