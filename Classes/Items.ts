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
        SLOWYSLOW,
        THORSHAMMER,
        GETSTRONKO,
        GETWEAKO
    }

    export let txtIceBucket: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtDmgUp: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtHealthUp: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtToxicRelationship: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtSpeedUp: ƒ.TextureImage = new ƒ.TextureImage();


    export abstract class Item extends Game.ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.ITEM;
        id: ITEMID;
        public rarity: RARITY;
        public netId: number = Networking.idGenerator();
        public description: string;
        public imgSrc: string;
        public collider: Collider.Collider;
        transform: ƒ.ComponentTransform = new ƒ.ComponentTransform();
        private position: ƒ.Vector2; get getPosition(): ƒ.Vector2 { return this.position }
        buff: Buff.Buff[] = [];

        constructor(_id: ITEMID, _netId?: number) {
            super(ITEMID[_id]);
            this.id = _id;
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }

            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad()));
            let material: ƒ.Material = new ƒ.Material("white", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.addComponent(new ƒ.ComponentMaterial(material));

            this.addComponent(new ƒ.ComponentTransform());
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2, this.netId);
            this.buff.push(this.getBuffById());
            this.setTextureById();
        }

        public clone(): Item {
            return null
        }

        protected addRarityBuff() {
            let buff = new Buff.RarityBuff(this.rarity);
            buff.addToItem(this);
        }

        public getBuffById(): Buff.Buff {
            let temp: Items.BuffItem = getBuffItemById(this.id);
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    return new Buff.DamageBuff(Buff.BUFFID.POISON, temp.duration, temp.tickRate, temp.value);
                case ITEMID.VAMPY:
                    return new Buff.DamageBuff(Buff.BUFFID.BLEEDING, temp.duration, temp.tickRate, temp.value);
                case ITEMID.SLOWYSLOW:
                    return new Buff.AttributesBuff(Buff.BUFFID.SLOW, temp.duration, temp.tickRate, temp.value);
                case ITEMID.GETSTRONKO:
                    return new Buff.AttributesBuff(Buff.BUFFID.SCALEUP, temp.duration, temp.tickRate, temp.value);
                case ITEMID.GETWEAKO:
                    return new Buff.AttributesBuff(Buff.BUFFID.SCALEDOWN, temp.duration, temp.tickRate, temp.value);
                default:
                    return null;
            }
        }

        protected loadTexture(_texture: ƒ.TextureImage): void {
            let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
            newTxt = _texture;
            let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
            newCoat.texture = newTxt;
            let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);

            this.getComponent(Game.ƒ.ComponentMaterial).material = newMtr;
        }
        protected setTextureById() {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    this.loadTexture(txtIceBucket);
                    break;
                case ITEMID.DMGUP:
                    this.loadTexture(txtDmgUp);
                    break;
                case ITEMID.SPEEDUP:
                    this.loadTexture(txtSpeedUp);
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
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.THORSHAMMER:
                    //TODO: add correct texture and change in JSON
                    break;
            }
        }

        public setPosition(_position: ƒ.Vector2) {
            this.position = _position;
            this.mtxLocal.translation = _position.toVector3(0.01);
            this.collider.setPosition(_position);
        }
        public spawn(): void {
            Game.graph.addChild(this);
            Networking.spawnItem(this.id, this.position, this.netId);
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
        choosenOneNetId: number;
        constructor(_id: ITEMID, _netId?: number) {
            super(_id, _netId);
            const item = getInternalItemById(this.id);
            if (item != undefined) {
                this.name = item.name;
                this.value = item.value;
                this.description = item.description;
                this.imgSrc = item.imgSrc;
                this.rarity = item.rarity;
            }

            this.addRarityBuff();
        }

        setChoosenOneNetId(_netId: number) {
            this.choosenOneNetId = _netId;
        }

        doYourThing(_avatar: Player.Player) {
            this.setAttributesById(_avatar);
            this.despawn();
        }

        public clone(): Item {
            return new InternalItem(this.id);
        }

        setAttributesById(_avatar: Player.Player) {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    _avatar.attributes.coolDownReduction = Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                    Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes.coolDownReduction, type: Entity.ATTRIBUTETYPE.COOLDOWNREDUCTION }, _avatar.netId);
                    break;
                case ITEMID.DMGUP:
                    _avatar.attributes.attackPoints += this.value;
                    Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes.attackPoints, type: Entity.ATTRIBUTETYPE.ATTACKPOINTS }, _avatar.netId);
                    break;
                case ITEMID.SPEEDUP:
                    _avatar.attributes.speed = Calculation.addPercentageAmountToValue(_avatar.attributes.speed, this.value);
                    Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes.speed, type: Entity.ATTRIBUTETYPE.SPEED }, _avatar.netId);
                    break;
                case ITEMID.PROJECTILESUP:
                    _avatar.weapon.projectileAmount += this.value;
                    Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    break;
                case ITEMID.HEALTHUP:
                    let currentMaxPoints = _avatar.attributes.maxHealthPoints;
                    _avatar.attributes.maxHealthPoints = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value);
                    let amount = _avatar.attributes.maxHealthPoints - currentMaxPoints;
                    _avatar.attributes.healthPoints += amount;
                    Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes.maxHealthPoints, type: Entity.ATTRIBUTETYPE.MAXHEALTHPOINTS }, _avatar.netId);
                    break;
                case ITEMID.SCALEUP:
                    _avatar.attributes.scale = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    _avatar.updateScale();
                    Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE }, _avatar.netId);
                    break;
                case ITEMID.SCALEDOWN:
                    _avatar.attributes.scale = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    _avatar.updateScale();
                    Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE }, _avatar.netId);
                    break;
                case ITEMID.ARMORUP:
                    _avatar.attributes.armor += this.value;
                    Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes.armor, type: Entity.ATTRIBUTETYPE.ARMOR }, _avatar.netId);
                    break;
                case ITEMID.HOMECOMING:
                    if (_avatar instanceof Player.Ranged) {
                        _avatar.weapon.aimType = Weapons.AIM.HOMING;
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    //TODO: talk with tobi
                    break;
                case ITEMID.THORSHAMMER:
                    if (_avatar instanceof Player.Ranged) {
                        localStorage.setItem("cooldownTime", _avatar.weapon.getCoolDown.getMaxCoolDown.toString());
                        localStorage.setItem("aimType", Weapons.AIM[_avatar.weapon.aimType]);
                        localStorage.setItem("bulletType", Bullets.BULLETTYPE[_avatar.weapon.bulletType]);
                        localStorage.setItem("projectileAmount", _avatar.weapon.projectileAmount.toString());

                        _avatar.weapon.getCoolDown.setMaxCoolDown = 100 * 60;
                        _avatar.weapon.aimType = Weapons.AIM.NORMAL;
                        _avatar.weapon.bulletType = Bullets.BULLETTYPE.THORSHAMMER;
                        _avatar.weapon.projectileAmount = 1;

                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    break;
            }
        }
    }

    export class BuffItem extends Item {
        value: number;
        tickRate: number;
        duration: number;

        constructor(_id: ITEMID, _netId?: number) {
            super(_id, _netId);
            let temp = getBuffItemById(this.id);
            this.name = temp.name;
            this.value = temp.value;
            this.tickRate = temp.tickRate;
            this.duration = temp.duration;
            this.imgSrc = temp.imgSrc;
            this.rarity = temp.rarity;

            this.addRarityBuff();
        }

        doYourThing(_avatar: Player.Player): void {
            this.setBuffById(_avatar);
            this.despawn();
        }

        public clone(): BuffItem {
            return new BuffItem(this.id);
        }

        setBuffById(_avatar: Entity.Entity) {
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    let newBuff = this.buff.find(buff => buff.id == Buff.BUFFID.POISON).clone();
                    newBuff.duration = undefined;
                    (<Buff.DamageBuff>newBuff).value = 0.5;
                    newBuff.addToEntity(_avatar);
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


    export abstract class ItemGenerator {
        private static itemPool: Items.Item[] = [];


        public static fillPool() {
            Game.internalItemJSON.forEach(item => {
                this.itemPool.push(new Items.InternalItem(item.id))
            });
            Game.buffItemJSON.forEach(item => {
                this.itemPool.push(new BuffItem(item.id));
            });
        }

        public static getRandomItem(): Items.Item {
            let possibleItems: Items.Item[] = [];
            possibleItems = this.getPossibleItems();
            let randomIndex = Math.round(Math.random() * (possibleItems.length - 1));
            let returnItem = possibleItems[randomIndex];
            // this.itemPool.splice(this.itemPool.indexOf(returnItem));
            return returnItem.clone();
        }

        public static getRandomItemByRarity(_rarity: RARITY): Items.Item {
            let possibleItems = this.itemPool.filter(item => item.rarity == _rarity);
            let randomIndex = Math.round(Math.random() * (possibleItems.length - 1));
            let returnItem = possibleItems[randomIndex];
            return returnItem.clone();
        }

        private static getPossibleItems(): Items.Item[] {
            let chosenRarity: RARITY = this.getRarity();
            switch (chosenRarity) {
                case RARITY.COMMON:
                    return this.itemPool.filter(item => item.rarity == RARITY.COMMON);
                case RARITY.RARE:
                    return this.itemPool.filter(item => item.rarity == RARITY.RARE)
                case RARITY.EPIC:
                    return this.itemPool.filter(item => item.rarity == RARITY.EPIC)
                case RARITY.LEGENDARY:
                    return this.itemPool.filter(item => item.rarity == RARITY.LEGENDARY)
                default:
                    return this.itemPool.filter(item => item.rarity = RARITY.COMMON);
            }
        }

        private static getRarity(): RARITY {
            let rarityNumber = Math.round(Math.random() * 100);
            if (rarityNumber >= 50) {
                return RARITY.COMMON;
            }
            if (rarityNumber >= 20 && rarityNumber < 50) {
                return RARITY.RARE;
            }
            if (rarityNumber >= 5 && rarityNumber < 20) {
                return RARITY.EPIC;
            }
            if (rarityNumber < 5) {
                return RARITY.LEGENDARY;
            }
            return RARITY.COMMON;
        }
    }

    export enum RARITY {
        COMMON,
        RARE,
        EPIC,
        LEGENDARY
    }
}