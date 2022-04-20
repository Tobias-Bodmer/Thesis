namespace Buff {

    export enum BUFFID {
        BLEEDING
    }
    export abstract class Buff {
        duration: number;
        tickRate: number
        id: BUFFID;

        constructor(_id: BUFFID, _duration: number, _tickRate: number) {
            this.id = _id;
            this.duration = _duration;
            this.tickRate = _tickRate;
        }

        applyBuff(_avatar: Entity.Entity) {

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
        doBuffStuff(_avatar: Entity.Entity): boolean {
            if (this.duration <= 0) {
                return false;
            }
            else if (this.duration % this.tickRate == 0) {
                this.applyBuff(_avatar);
            }
            this.duration--;
            return true;
        }
    }

    export class DamageBuff extends Buff {
        value: number = -1;
        constructor(_id: BUFFID, _duration: number, _tickRate: number) {
            super(_id, _duration, _tickRate)
        }

        applyBuff(_avatar: Entity.Entity): void {
            this.getBuffDamgeById(this.id, _avatar);
        }

        getBuffDamgeById(_id: BUFFID, _avatar: Entity.Entity) {
            switch (_id) {
                case BUFFID.BLEEDING:
                    _avatar.getDamage(this.value);
                    break;
            }
        }
    }
}