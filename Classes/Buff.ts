namespace Buff {

    export enum BUFFID {
        BLEEDING,
        POISON,
        HEAL,
        SLOW,
        IMMUNE
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
                default:
                    return null;
            }
        }

        public clone(): Buff {
            return this;
        }

        protected applyBuff(_avatar: Entity.Entity) {
            if (Networking.client.id = Networking.client.idHost) {
                this.getBuffById(this.id, _avatar, true);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * removes the buff from the buff list, removes the particle and sends the new list to the client
         * @param _avatar entity the buff should be removed
         */
        public removeBuff(_avatar: Entity.Entity) {
            _avatar.removeChild(_avatar.getChildren().find(child => (<UI.Particles>child).id == this.id));
            _avatar.buffs.splice(_avatar.buffs.indexOf(this));
            if (Networking.client.idHost == Networking.client.id) {
                this.getBuffById(this.id, _avatar, false);
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
                    this.coolDown.startCoolDown();
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

        protected getBuffById(_id: Buff.BUFFID, _avatar: Entity.Entity, _add: boolean) {

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
                if (!this.coolDown.hasCoolDown) {
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

        protected getBuffById(_id: BUFFID, _avatar: Entity.Entity, _add: boolean) {
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

    export class AttributesBuff extends Buff {
        isBuffApplied: boolean;
        value: number;
        removedValue: number;
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

        protected getBuffById(_id: BUFFID, _avatar: Entity.Entity, _add: boolean) {
            switch (_id) {
                case BUFFID.SLOW:
                    if (_add) {
                        this.removedValue = Calculation.subPercentageAmountToValue(_avatar.attributes.speed, 50);
                        _avatar.attributes.speed -= this.removedValue;
                    } else {
                        _avatar.attributes.speed += this.removedValue;
                    }
                    break;
                case BUFFID.IMMUNE:
                    if (_add) {
                        _avatar.attributes.hitable = false;
                    } else {
                        _avatar.attributes.hitable = false;
                    }
                    let payload: Interfaces.IAttributeValuePayload = <Interfaces.IAttributeValuePayload>{ value: _avatar.attributes.hitable, type: Entity.ATTRIBUTETYPE.HITABLE }
                    Networking.updateEntityAttributes(payload, _avatar.netId);
                    break;
            }
        }
    }
}