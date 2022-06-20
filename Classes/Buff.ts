namespace Buff {

    export enum BUFFID {
        BLEEDING,
        POISON,
        HEAL,
        SLOW,
        IMMUNE,
        SCALEUP,
        SCALEDOWN,
        FURIOUS,
        EXHAUSTED
    }
    export abstract class Buff {
        duration: number;
        tickRate: number
        id: BUFFID;
        protected noDuration: number;
        protected coolDown: Ability.Cooldown;

        constructor(_id: BUFFID, _duration: number, _tickRate: number) {
            this.id = _id;
            this.duration = _duration;
            this.tickRate = _tickRate;
            this.noDuration = 0;
            if (_duration != undefined) {
                this.coolDown = new Ability.Cooldown(_duration);
            } else {
                this.coolDown = undefined;
            }
        }

        protected getParticleById(_id: BUFFID): UI.Particles {
            switch (_id) {
                case BUFFID.POISON:
                    return new UI.Particles(BUFFID.POISON, UI.poisonParticle, 6, 12);
                case BUFFID.IMMUNE:
                    return new UI.Particles(BUFFID.IMMUNE, UI.immuneParticle, 1, 6);
                case BUFFID.FURIOUS:
                    return new UI.Particles(BUFFID.FURIOUS, UI.furiousParticle, 8, 6);
                case BUFFID.EXHAUSTED:
                    return new UI.Particles(BUFFID.EXHAUSTED, UI.exhaustedParticle, 1, 6);
                default:
                    return null;
            }
        }

        public abstract clone(): Buff;

        protected applyBuff(_avatar: Entity.Entity) {
            if (Networking.client.id == Networking.client.idHost) {
                this.getBuffStatsById(this.id, _avatar, true);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * removes the buff from the buff list, removes the particle and sends the new list to the client
         * @param _avatar entity the buff should be removed
         */
        public removeBuff(_avatar: Entity.Entity) {
            _avatar.removeChild(_avatar.getChildren().find(child => (<UI.Particles>child).id == this.id));
            _avatar.buffs.splice(_avatar.buffs.indexOf(this), 1);
            if (Networking.client.idHost == Networking.client.id) {
                this.getBuffStatsById(this.id, _avatar, false);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * only use this function to add buffs to entities
         * @param _avatar entity it should be add to
         * @returns 
         */
        public addToEntity(_avatar: Entity.Entity) {
            if (_avatar.buffs.filter(buff => buff.id == this.id).length > 0) {
                return;
            }
            else {
                _avatar.buffs.push(this);
                this.addParticle(_avatar);
                if (this.coolDown != undefined) {
                    this.coolDown.startCooldown();
                }
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }

        /**
         * buff applies its buff stats to the entity and deletes itself when its duration is over
         * @param _avatar entity it should be add to
         */
        public doBuffStuff(_avatar: Entity.Entity) {

        }

        protected getBuffStatsById(_id: Buff.BUFFID, _avatar: Entity.Entity, _add: boolean) {

        }

        protected addParticle(_avatar: Entity.Entity) {
            if (_avatar.getChildren().find(child => (<UI.Particles>child).id == this.id) == undefined) {
                let particle = this.getParticleById(this.id);
                if (particle != undefined) {
                    _avatar.addChild(particle);
                    particle.mtxLocal.scale(new ƒ.Vector3(_avatar.mtxLocal.scaling.x, _avatar.mtxLocal.scaling.y, 1));
                    particle.mtxLocal.translation = new ƒ.Vector2(_avatar.offsetColliderX, _avatar.offsetColliderY).toVector3(0.1);
                    particle.activate(true);
                }
            }
        }
    }

    export class RarityBuff {
        id: Items.RARITY;
        constructor(_id: Items.RARITY) {
            this.id = _id;
        }

        public addToItem(_item: Items.Item) {
            this.addParticleToItem(_item);
        }

        private getParticleById(_id: Items.RARITY): UI.Particles {
            switch (_id) {
                case Items.RARITY.COMMON:
                    return new UI.Particles(_id, UI.commonParticle, 1, 12);
                case Items.RARITY.RARE:
                    return new UI.Particles(_id, UI.rareParticle, 1, 12);
                case Items.RARITY.EPIC:
                    return new UI.Particles(_id, UI.epicParticle, 1, 12);
                case Items.RARITY.LEGENDARY:
                    return new UI.Particles(_id, UI.legendaryParticle, 1, 12);
                default:
                    return new UI.Particles(_id, UI.commonParticle, 1, 12);
            }
        }

        private addParticleToItem(_item: Items.Item) {
            if (_item.getChildren().find(child => (<UI.Particles>child).id == this.id) == undefined) {
                let particle = this.getParticleById(this.id)
                if (particle != undefined) {
                    _item.addChild(particle);
                    particle.mtxLocal.scale(new ƒ.Vector3(_item.mtxLocal.scaling.x, _item.mtxLocal.scaling.y, 1));
                    particle.mtxLocal.translateZ(0.1);
                    particle.activate(true);
                }
            }
        }
    }
    /**
     * creates a new Buff that does Damage to an Entity;
     */
    export class DamageBuff extends Buff {
        value: number;
        constructor(_id: BUFFID, _duration: number, _tickRate: number, _value: number) {
            super(_id, _duration, _tickRate)
            this.value = _value;
        }

        public clone(): DamageBuff {
            return new DamageBuff(this.id, this.duration, this.tickRate, this.value);
        }

        public doBuffStuff(_avatar: Entity.Entity) {
            if (this.coolDown != undefined) {
                if (!this.coolDown.hasCooldown) {
                    this.removeBuff(_avatar);
                    return;
                }
                else if (this.coolDown.getCurrentCooldown % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
            }
            else {
                if (this.noDuration % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
                this.noDuration++;
            }
        }

        protected getBuffStatsById(_id: BUFFID, _avatar: Entity.Entity, _add: boolean) {
            if (_add) {
                switch (_id) {
                    case BUFFID.BLEEDING:
                        _avatar.getDamage(this.value);
                        break;
                    case BUFFID.POISON:
                        // only do damage to player until he has 20% health
                        if (_avatar instanceof Player.Player) {
                            if (_avatar.attributes.healthPoints > _avatar.attributes.maxHealthPoints * 0.2) {
                                _avatar.getDamage(this.value);
                            }
                        }
                        else {
                            _avatar.getDamage(this.value);
                        }
                        break;
                }
            }
            else { return; }
        }
    }
    /**
     * creates a new Buff that changes an attribute of an Entity for the duration of the buff
     */
    export class AttributesBuff extends Buff {
        private isBuffApplied: boolean;
        value: number;
        private difHealthPoints: number;
        private difMaxHealthPoints: number;
        private difArmor: number;
        private difSpeed: number;
        private difAttackPoints: number;
        private difCoolDownReduction: number;
        private difScale: number;
        private difAccurary: number;
        private difKnockback: number;
        constructor(_id: BUFFID, _duration: number, _tickRate: number, _value: number) {
            super(_id, _duration, _tickRate);
            this.isBuffApplied = false;
            this.value = _value;
        }
        public clone(): AttributesBuff {
            return new AttributesBuff(this.id, this.duration, this.tickRate, this.value);
        }
        public doBuffStuff(_avatar: Entity.Entity) {
            if (this.duration != undefined) {
                if (this.duration <= 0) {
                    this.removeBuff(_avatar);
                }
                else if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                this.duration--;
            }
            else {
                if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                this.addParticle(_avatar);
            }
        }

        protected getBuffStatsById(_id: BUFFID, _avatar: Entity.Entity, _add: boolean) {
            let payload: Interfaces.IAttributeValuePayload;
            switch (_id) {
                case BUFFID.SLOW:
                    if (_add) {
                        this.difSpeed = _avatar.attributes.speed - Calculation.subPercentageAmountToValue(_avatar.attributes.speed, this.value);
                        _avatar.attributes.speed -= this.difSpeed;
                    } else {
                        _avatar.attributes.speed += this.difSpeed;
                    }
                    break;
                case BUFFID.IMMUNE:
                    if (_add) {
                        _avatar.attributes.hitable = false;
                    } else {
                        _avatar.attributes.hitable = true;
                    }
                    payload = <Interfaces.IAttributeValuePayload>{ value: _avatar.attributes }
                    break;
                case BUFFID.SCALEUP:
                    if (_add) {
                        let currentMaxHealthPoints = _avatar.attributes.maxHealthPoints;
                        let currentHealthPoints = _avatar.attributes.healthPoints;
                        let currentAttackPoints = _avatar.attributes.attackPoints;
                        let currentSpeed = _avatar.attributes.speed;
                        let currentKnockbackForce = _avatar.attributes.knockbackForce;
                        this.difScale = Calculation.addPercentageAmountToValue(_avatar.attributes.getScale, this.value) - _avatar.attributes.getScale;
                        _avatar.updateScale(_avatar.attributes.getScale + this.difScale, _add);
                        this.difMaxHealthPoints = currentMaxHealthPoints - _avatar.attributes.maxHealthPoints;
                        this.difHealthPoints = currentHealthPoints - _avatar.attributes.healthPoints;
                        this.difAttackPoints = currentAttackPoints - _avatar.attributes.attackPoints;
                        this.difSpeed = currentSpeed - _avatar.attributes.speed;
                        this.difKnockback = currentKnockbackForce - _avatar.attributes.knockbackForce;
                    }
                    else {
                        _avatar.updateScale(_avatar.attributes.getScale - this.difScale, _add);
                        _avatar.attributes.maxHealthPoints += this.difMaxHealthPoints;
                        _avatar.attributes.healthPoints += this.difHealthPoints;
                        _avatar.attributes.attackPoints += this.difAttackPoints;
                        _avatar.attributes.speed += this.difSpeed;
                        _avatar.attributes.knockbackForce += this.difKnockback;

                    }
                    payload = <Interfaces.IAttributeValuePayload>{ value: _avatar.attributes };
                    break;
                case BUFFID.SCALEDOWN:
                    if (_add) {
                        let currentMaxHealthPoints = _avatar.attributes.maxHealthPoints;
                        let currentHealthPoints = _avatar.attributes.healthPoints;
                        let currentAttackPoints = _avatar.attributes.attackPoints;
                        let currentSpeed = _avatar.attributes.speed;
                        let currentKnockbackForce = _avatar.attributes.knockbackForce;
                        this.difScale = _avatar.attributes.getScale - Calculation.subPercentageAmountToValue(_avatar.attributes.getScale, this.value);
                        _avatar.updateScale(_avatar.attributes.getScale - this.difScale, _add);
                        this.difMaxHealthPoints = currentMaxHealthPoints - _avatar.attributes.maxHealthPoints;
                        this.difHealthPoints = currentHealthPoints - _avatar.attributes.healthPoints;
                        this.difAttackPoints = currentAttackPoints - _avatar.attributes.attackPoints;
                        this.difSpeed = currentSpeed - _avatar.attributes.speed;
                        this.difKnockback = currentKnockbackForce - _avatar.attributes.knockbackForce;
                    }
                    else {
                        _avatar.updateScale(_avatar.attributes.getScale + this.difScale, _add);
                        _avatar.attributes.maxHealthPoints += this.difMaxHealthPoints;
                        _avatar.attributes.healthPoints += this.difHealthPoints;
                        _avatar.attributes.attackPoints += this.difAttackPoints;
                        _avatar.attributes.speed += this.difSpeed;
                        _avatar.attributes.knockbackForce += this.difKnockback;
                    }
                    payload = <Interfaces.IAttributeValuePayload>{ value: _avatar.attributes };
                    break;
                case BUFFID.FURIOUS:
                    if (_add) {
                        this.difArmor = 95 - _avatar.attributes.armor;
                        this.difSpeed = _avatar.attributes.speed * 2 - _avatar.attributes.speed;
                        _avatar.attributes.armor += this.difArmor;
                        _avatar.attributes.speed += this.difSpeed;

                        _avatar.weapon.getCoolDown.setMaxCoolDown = _avatar.weapon.getCoolDown.getMaxCoolDown / 2;
                    }
                    else {
                        _avatar.attributes.armor -= this.difArmor;
                        _avatar.attributes.speed -= this.difSpeed;

                        _avatar.weapon.getCoolDown.setMaxCoolDown = _avatar.weapon.getCoolDown.getMaxCoolDown * 2;
                    }
                    break;
                case BUFFID.EXHAUSTED:
                    if (_add) {
                        this.difArmor = 0 - _avatar.attributes.armor;
                        _avatar.attributes.armor += this.difArmor;
                    }
                    else {
                        _avatar.attributes.armor -= this.difArmor;
                    }
                    break;
            }
            payload = <Interfaces.IAttributeValuePayload>{ value: _avatar.attributes };
            Networking.updateEntityAttributes(payload, _avatar.netId);
        }
    }

    export function getBuffById(_id: BUFFID): Buff {
        let ref: Buff = undefined;

        ref = <DamageBuff>Game.damageBuffJSON.find(buff => buff.id == _id);
        if (ref != undefined) {
            return new DamageBuff(_id, ref.duration, ref.tickRate, (<DamageBuff>ref).value);
        }

        ref = <AttributesBuff>Game.attributeBuffJSON.find(buff => buff.id == _id);
        if (ref != undefined) {
            return new AttributesBuff(_id, ref.duration, ref.tickRate, (<AttributesBuff>ref).value);
        }

        return null;
    }
}