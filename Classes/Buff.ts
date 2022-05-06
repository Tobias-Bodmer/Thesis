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

        constructor(_id: BUFFID, _duration: number, _tickRate: number) {
            this.id = _id;
            this.duration = _duration;
            this.tickRate = _tickRate;
            this.noDuration = 0;
        }

        protected getParticleById(_id: BUFFID): UI.Particles {
            switch (_id) {
                case BUFFID.POISON:
                    return new UI.Particles(BUFFID.POISON, UI.poisonParticle, 6, 12);
                default:
                    return null;
            }
        }

        public clone(): Buff {
            return this;
        }

        protected applyBuff(_avatar: Entity.Entity) {
            Networking.updateBuffList(_avatar.buffs, _avatar.netId);
        }

        protected removeBuff(_avatar: Entity.Entity) {
            if (Networking.client.idHost == Networking.client.id) {
                this.getBuffById(this.id, _avatar, false);
                _avatar.buffs.splice(_avatar.buffs.indexOf(this));
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        addToEntity(_avatar: Entity.Entity) {
            if (_avatar.buffs.filter(buff => buff.id == this.id).length > 0) {
                return;
            }
            else {
                _avatar.buffs.push(this);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        public doBuffStuff(_avatar: Entity.Entity): boolean {
            return null;
        }

        protected getBuffById(_id: Buff.BUFFID, _avatar: Entity.Entity, _add: boolean) {

        }

        protected addParticle(_avatar: Entity.Entity) {
            if (_avatar.getChildren().find(child => (<UI.Particles>child).id == this.id) == undefined) {
                let particle = this.getParticleById(this.id);
                if (particle != undefined) {
                    _avatar.addChild(particle);
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

        public doBuffStuff(_avatar: Entity.Entity): boolean {
            if (this.duration != undefined) {
                if (this.duration <= 0) {
                    _avatar.removeChild(_avatar.getChildren().find(child => (<UI.Particles>child).id == this.id));
                    return false;
                }
                else if (this.duration % this.tickRate == 0) {

                    this.applyBuff(_avatar);
                }
                if (_avatar.getChildren().find(child => (<UI.Particles>child).id == this.id) == undefined) {
                    let particle = this.getParticleById(this.id);
                    if (particle != undefined) {
                        _avatar.addChild(particle);
                        particle.activate(true);
                    }
                }
                this.duration--;
                return true;
            }
            else {
                if (this.noDuration % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
                this.addParticle(_avatar);
                this.noDuration++;
                return true;
            }
        }

        protected applyBuff(_avatar: Entity.Entity): void {
            if (Networking.client.id == Networking.client.idHost) {
                this.getBuffById(this.id, _avatar);
                super.applyBuff(_avatar);
            }
        }
     
        protected getBuffById(_id: BUFFID, _avatar: Entity.Entity) {
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
        public doBuffStuff(_avatar: Entity.Entity): boolean {
            if (this.duration != undefined) {
                if (this.duration <= 0) {
                    this.removeBuff(_avatar);
                    return false;
                }
                else if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                if (_avatar.getChildren().find(child => (<UI.Particles>child).id == this.id) == undefined) {
                    let particle = this.getParticleById(this.id);
                    if (particle != undefined) {
                        _avatar.addChild(particle);
                        particle.activate(true);
                    }
                }
                this.duration--;
                return true;
            }
            else {
                if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                if (_avatar.getChildren().find(child => (<UI.Particles>child).id == this.id) == undefined) {
                    let particle = this.getParticleById(this.id);
                    if (particle != undefined) {
                        _avatar.addChild(particle);
                        particle.activate(true);
                    }
                }
                this.noDuration++;
                return true;
            }
        }

        protected applyBuff(_avatar: Entity.Entity): void {
            if (Networking.client.idHost == Networking.client.id) {
                this.getBuffById(this.id, _avatar, true);
                super.applyBuff(_avatar);
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