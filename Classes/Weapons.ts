namespace Weapons {
    export class Weapon {
        ownerNetId: number; get owner(): Entity.Entity { return Game.entities.find(elem => elem.netId == this.ownerNetId) };
        protected cooldown: Ability.Cooldown; get getCoolDown() { return this.cooldown };
        protected attackCount: number; get getAttackCount() { return this.attackCount };
        public currentAttackCount: number;
        aimType: AIM;
        bulletType: Bullets.BULLETTYPE = Bullets.BULLETTYPE.STANDARD;
        projectileAmount: number = 1;

        constructor(_cooldownTime: number, _attackCount: number, _bulletType: Bullets.BULLETTYPE, _projectileAmount: number, _ownerNetId: number, _aimType: AIM) {
            this.attackCount = _attackCount;
            this.currentAttackCount = _attackCount;
            this.bulletType = _bulletType;
            this.projectileAmount = _projectileAmount;
            this.ownerNetId = _ownerNetId;
            this.aimType = _aimType;

            this.cooldown = new Ability.Cooldown(_cooldownTime);
        }

        public shoot(_position: ƒ.Vector2, _direciton: ƒ.Vector3, _bulletNetId?: number, _sync?: boolean) {
            if (_sync) {
                if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                    this.currentAttackCount = this.attackCount;
                }
                if (this.currentAttackCount > 0 && !this.cooldown.hasCoolDown) {

                    if (this.owner.attributes.accuracy < 100) {
                        this.inaccuracy(_direciton);
                    }

                    _direciton.normalize();

                    let magazine: Bullets.Bullet[] = this.loadMagazine(_position, _direciton, this.bulletType, _bulletNetId);
                    this.setBulletDirection(magazine);
                    this.fire(magazine, _sync);
                    this.currentAttackCount--;
                    if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                        this.cooldown.setMaxCoolDown = this.cooldown.getMaxCoolDown * this.owner.attributes.coolDownReduction;
                        this.cooldown.startCoolDown();
                    }
                }
            }
            else {
                _direciton.normalize();
                let magazine: Bullets.Bullet[] = this.loadMagazine(_position, _direciton, this.bulletType, _bulletNetId);
                this.setBulletDirection(magazine);
                this.fire(magazine, _sync);
            }
        }

        inaccuracy(_direciton: ƒ.Vector3) {
            _direciton.x = _direciton.x + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
            _direciton.y = _direciton.y + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
        }

        fire(_magazine: Bullets.Bullet[], _sync?: boolean) {
            _magazine.forEach(bullet => {
                Game.graph.addChild(bullet);
                if (_sync) {
                    if (bullet instanceof Bullets.HomingBullet) {
                        Networking.spawnBullet(this.aimType, bullet.direction, bullet.netId, this.ownerNetId, (<Bullets.HomingBullet>bullet).target);

                    } else {
                        Networking.spawnBullet(this.aimType, bullet.direction, bullet.netId, this.ownerNetId);
                    }
                }
            })
        }

        setBulletDirection(_magazine: Bullets.Bullet[]) {
            switch (_magazine.length) {
                case 1:
                    return _magazine;
                case 2:
                    _magazine[0].mtxLocal.rotateZ(45 / 2);
                    _magazine[1].mtxLocal.rotateZ(45 / 2 * -1);
                    return _magazine;
                case 3:
                    _magazine[0].mtxLocal.rotateZ(45 / 2);
                    _magazine[1].mtxLocal.rotateZ(45 / 2 * -1);
                default:
                    return _magazine;
            }
        }

        loadMagazine(_position: ƒ.Vector2, _direction: ƒ.Vector3, _bulletType: Bullets.BULLETTYPE, _netId?: number): Bullets.Bullet[] {
            let magazine: Bullets.Bullet[] = [];
            for (let i = 0; i < this.projectileAmount; i++) {
                switch (this.aimType) {
                    case AIM.NORMAL:
                        magazine.push(new Bullets.Bullet(this.bulletType, _position, _direction, this.ownerNetId, _netId))
                        break;
                    case AIM.HOMING:
                        magazine.push(new Bullets.HomingBullet(this.bulletType, _position, _direction, this.ownerNetId, null, _netId));
                        break;
                }
            }
            return magazine;
        }
    }

    export enum AIM {
        NORMAL,
        HOMING
    }

}