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
        GETWEAKO,
        ZIPZAP,
        AOETEST,
    }

    export let txtIceBucket: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtDmgUp: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtSpeedUp: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtProjectilesUp: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtHealthUp: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtScaleUp: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtScaleDown: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtHomeComing: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtThorsHammer: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtToxicRelationship: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtGetStronko: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtGetWeako: ƒ.TextureImage = new ƒ.TextureImage();

    export abstract class Item extends Game.ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.ITEM;
        id: ITEMID;
        public rarity: RARITY;
        public netId: number;
        public description: string;
        public imgSrc: string;
        public collider: Collider.Collider;
        transform: ƒ.ComponentTransform = new ƒ.ComponentTransform();
        private position: ƒ.Vector2; get getPosition(): ƒ.Vector2 { return this.position }
        buff: Buff.Buff[] = [];
        protected changedValue: number;

        constructor(_id: ITEMID, _netId?: number) {
            super(ITEMID[_id]);
            this.id = _id;
            this.netId = Networking.IdManager(_netId);

            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad()));
            let material: ƒ.Material = new ƒ.Material("white", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
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

        protected getBuffById(): Buff.Buff {
            let temp: Items.BuffItem = getBuffItemById(this.id);
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    return Buff.getBuffById(Buff.BUFFID.POISON);
                case ITEMID.VAMPY:
                    return Buff.getBuffById(Buff.BUFFID.BLEEDING);
                case ITEMID.SLOWYSLOW:
                    return Buff.getBuffById(Buff.BUFFID.SLOW);
                case ITEMID.GETSTRONKO:
                    return Buff.getBuffById(Buff.BUFFID.SCALEUP);
                case ITEMID.GETWEAKO:
                    return Buff.getBuffById(Buff.BUFFID.SCALEDOWN);
                default:
                    return null;
            }
        }

        protected loadTexture(_texture: ƒ.TextureImage): void {
            let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
            newTxt = _texture;
            let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
            newCoat.texture = newTxt;
            let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderLitTextured, newCoat);

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
                    break;
                case ITEMID.PROJECTILESUP:
                    this.loadTexture(txtProjectilesUp);
                    break;
                case ITEMID.HEALTHUP:
                    this.loadTexture(txtHealthUp);
                    break;
                case ITEMID.SCALEUP:
                    this.loadTexture(txtScaleUp);
                    break;
                case ITEMID.SCALEDOWN:
                    this.loadTexture(txtScaleDown);
                    break;
                case ITEMID.ARMORUP:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.HOMECOMING:
                    this.loadTexture(txtHomeComing);
                    break;
                case ITEMID.TOXICRELATIONSHIP:
                    this.loadTexture(txtToxicRelationship);
                    break;
                case ITEMID.VAMPY:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.SLOWYSLOW:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.THORSHAMMER:
                    this.loadTexture(txtThorsHammer);
                    break;
                case ITEMID.GETSTRONKO:
                    this.loadTexture(txtGetStronko);
                    break;
                case ITEMID.GETWEAKO:
                    this.loadTexture(txtGetWeako);
                    break;
                case ITEMID.ZIPZAP:
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
            if (Networking.client.id == Networking.client.idHost) {
                Networking.popID(this.netId);
                Networking.removeItem(this.netId);
                Game.graph.removeChild(this);
            }
        }

        public addItemToEntity(_avatar: Player.Player) {
            _avatar.items.push(this);
        }

        public removeItemFromEntity(_avatar: Player.Player) {

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

        public setChoosenOneNetId(_netId: number) {
            this.choosenOneNetId = _netId;
        }

        public addItemToEntity(_avatar: Player.Player) {
            super.addItemToEntity(_avatar);
            this.setAttributesById(_avatar, true);
            this.despawn();
        }

        public removeItemFromEntity(_avatar: Player.Player): void {
            this.setAttributesById(_avatar, false);
            _avatar.items.splice(_avatar.items.indexOf(_avatar.items.find(item => item.id == this.id)), 1);
        }

        public clone(): Item {
            return new InternalItem(this.id);
        }

        protected setAttributesById(_avatar: Player.Player, _addBuff: boolean) {
            let host: boolean = Networking.client.id == Networking.client.idHost;
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    if (host) {
                        if (_addBuff) {
                            this.changedValue = _avatar.attributes.coolDownReduction - Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                            _avatar.attributes.coolDownReduction = Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                        }
                        else {
                            _avatar.attributes.coolDownReduction += this.changedValue;
                        }
                        Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.DMGUP:
                    if (host) {
                        if (_addBuff) {
                            _avatar.attributes.attackPoints += this.value;
                        } else {
                            _avatar.attributes.attackPoints -= this.value;
                        }
                        Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.SPEEDUP:
                    if (host) {
                        if (_addBuff) {
                            this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.speed, this.value) - _avatar.attributes.speed;
                            _avatar.attributes.speed = Calculation.addPercentageAmountToValue(_avatar.attributes.speed, this.value);
                        } else {
                            _avatar.attributes.speed -= this.changedValue;
                        }
                        Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.PROJECTILESUP:
                    function rotateBullets() {
                        let magazin = (<Weapons.RangedWeapon>_avatar.weapon).getMagazin;
                        switch (magazin.length) {
                            case 2:
                            case 3:
                                console.log("rotating");
                                magazin[0].mtxLocal.rotateZ(45 / 2);
                                magazin[1].mtxLocal.rotateZ(45 / 2 * -1);
                                (<Weapons.RangedWeapon>_avatar.weapon).magazin = magazin;
                                break;
                            default:
                                break;
                        }
                    }
                    if (host) {
                        if (_addBuff) {
                            _avatar.weapon.projectileAmount += this.value;
                            (<Weapons.RangedWeapon>_avatar.weapon).addFunction(rotateBullets);
                        } else {
                            _avatar.weapon.projectileAmount -= this.value;
                            (<Weapons.RangedWeapon>_avatar.weapon).deleteFunction(rotateBullets);

                        }
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    } else {
                        if (_addBuff) {
                            (<Weapons.RangedWeapon>_avatar.weapon).addFunction(rotateBullets);
                        } else {
                            (<Weapons.RangedWeapon>_avatar.weapon).deleteFunction(rotateBullets);

                        }
                    }
                    break;
                case ITEMID.HEALTHUP:
                    if (host) {
                        if (_addBuff) {
                            this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value) - _avatar.attributes.maxHealthPoints;
                            let currentMaxPoints = _avatar.attributes.maxHealthPoints;
                            _avatar.attributes.maxHealthPoints = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value);
                            let amount = _avatar.attributes.maxHealthPoints - currentMaxPoints;
                            _avatar.attributes.healthPoints += amount;
                        } else {
                            let currentMaxPoints = _avatar.attributes.maxHealthPoints;
                            _avatar.attributes.maxHealthPoints -= this.changedValue;
                            let amount = currentMaxPoints - _avatar.attributes.maxHealthPoints;
                            _avatar.attributes.healthPoints -= amount;
                        }
                        Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.SCALEUP:
                    if (host) {
                        if (_addBuff) {
                            this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.getScale, this.value) - _avatar.attributes.getScale;
                            _avatar.updateScale(_avatar.attributes.getScale + this.changedValue, _addBuff);
                        } else {
                            _avatar.updateScale(_avatar.attributes.getScale - this.changedValue, _addBuff);

                        }
                        Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.SCALEDOWN:
                    if (host) {
                        if (_addBuff) {
                            this.changedValue = _avatar.attributes.getScale - Calculation.subPercentageAmountToValue(_avatar.attributes.getScale, this.value);
                            _avatar.updateScale(_avatar.attributes.getScale - this.changedValue, _addBuff);

                        } else {
                            _avatar.updateScale(_avatar.attributes.getScale + this.changedValue, _addBuff);

                        }
                        Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.ARMORUP:
                    if (host) {
                        if (_addBuff) {
                            _avatar.attributes.armor += this.value;
                        } else {
                            _avatar.attributes.armor -= this.value;
                        }
                        Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: _avatar.attributes }, _avatar.netId);
                    }
                    break;
                case ITEMID.HOMECOMING:
                    if (host) {
                        if (_avatar instanceof Player.Ranged) {
                            if (_addBuff) {
                                _avatar.weapon.aimType = Weapons.AIM.HOMING;
                            } else {
                                _avatar.weapon.aimType = Weapons.AIM.NORMAL;
                            }
                            Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                        }
                    }
                    break;
                case ITEMID.THORSHAMMER:
                    if (host) {
                        if (_avatar.weapon instanceof Weapons.ThorsHammer) {
                            return;
                        }
                        _avatar.weapon = new Weapons.ThorsHammer(1, Bullets.BULLETTYPE.THORSHAMMER, 1, _avatar.netId);
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    break;
                case ITEMID.ZIPZAP:
                    if (host) {
                        if (_addBuff) {
                            let newItem: Bullets.ZipZapObject = new Bullets.ZipZapObject(_avatar.netId, null);
                            newItem.spawn();
                        } else {
                            let zipzap = <Bullets.ZipZapObject>Game.graph.getChildren().find(item => (<Bullets.ZipZapObject>item).type == Bullets.BULLETTYPE.ZIPZAP);
                            zipzap.despawn();
                        }
                    }
                    break;
                case ITEMID.AOETEST:
                    if (host) {
                        if (_addBuff) {
                            new Ability.AreaOfEffect(Ability.AOETYPE.HEALTHUP, null).addToEntity(_avatar);
                        } else {
                            (<Ability.AreaOfEffect>_avatar.getChildren().find(child => (<Ability.AreaOfEffect>child).id == Ability.AOETYPE.HEALTHUP)).despawn();
                        }
                    }
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
            this.description = temp.description;
            this.rarity = temp.rarity;

            this.addRarityBuff();
        }

        addItemToEntity(_avatar: Player.Player): void {
            super.addItemToEntity(_avatar);
            this.setBuffById(_avatar);
            this.despawn();
        }

        public clone(): BuffItem {
            return new BuffItem(this.id);
        }

        setBuffById(_avatar: Entity.Entity) {
            let host: boolean = Networking.client.id == Networking.client.idHost;

            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    if (host) {
                        let buffref = Game.damageBuffJSON.find(buff => buff.id == Buff.BUFFID.POISON);
                        let newBuff = new Buff.DamageBuff(buffref.id, null, buffref.tickRate, 0.5);
                        newBuff.addToEntity(_avatar);
                    }
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
                    return this.itemPool.filter(item => item.rarity == RARITY.RARE);
                case RARITY.EPIC:
                    return this.itemPool.filter(item => item.rarity == RARITY.EPIC);
                case RARITY.LEGENDARY:
                    return this.itemPool.filter(item => item.rarity == RARITY.LEGENDARY);
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