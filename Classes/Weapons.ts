namespace Weapons {
    export class Weapon {
        owner: number; get _owner(): Entity.Entity { return Game.entities.find(elem => elem.netId == this.owner) };
        cooldownTime: number = 10;
        public currentCooldownTime: number = this.cooldownTime;
        attackCount: number = 1;
        public currentAttackCount: number = this.attackCount;
        aimType: AIM;
        bulletType: Bullets.BULLETTYPE = Bullets.BULLETTYPE.STANDARD;
        projectileAmount: number = 1;

        constructor(_cooldownTime: number, _attackCount: number, _bulletType: Bullets.BULLETTYPE, _projectileAmount: number, _ownerNetId: number, _aimType: AIM) {
            this.cooldownTime = _cooldownTime;
            this.attackCount = _attackCount;
            this.bulletType = _bulletType;
            this.projectileAmount = _projectileAmount;
            this.owner = _ownerNetId;
            this.aimType = _aimType;
            // console.log(this.owner);
        }

        public shoot(_position: ƒ.Vector2, _direciton: ƒ.Vector3, _bulletNetId?: number, _sync?: boolean) {
            if (this.currentAttackCount > 0) {
                _direciton.normalize();
                let magazine: Bullets.Bullet[] = this.loadMagazine(_position, _direciton, this.bulletType, _bulletNetId);
                this.setBulletDirection(magazine);
                this.fire(magazine, _sync);
                this.currentAttackCount--;
            }
        }

        fire(_magazine: Bullets.Bullet[], _sync?: boolean) {
            _magazine.forEach(bullet => {
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed)
                bullet.owner = this.owner;
                Game.graph.addChild(bullet);
                if (_sync && Game.entities.find(enti => enti.netId == this.owner).tag == Tag.TAG.PLAYER) {
                    Networking.spawnBullet(bullet.direction, bullet.netId);
                }
                else if (_sync) {
                    Networking.spawnBulletAtEnemy(bullet.direction, bullet.netId, this.owner);
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
                const ref = Game.bulletsJSON.find(bullet => bullet.type == _bulletType);
                switch (this.aimType) {
                    case AIM.NORMAL:
                        magazine.push(new Bullets.Bullet(ref.name, ref.speed, ref.hitPointsScale, ref.lifetime, ref.knockbackForce, ref.killcount, _position, _direction, _netId))
                        break;
                    case AIM.HOMING:
                        magazine.push(new Bullets.HomingBullet(ref.name, ref.speed, ref.hitPointsScale, ref.lifetime, ref.knockbackForce, ref.killcount, _position, _direction, null, _netId));
                        break;
                }
            }
            return magazine;
        }


        public cooldown(_faktor: number) {
            let specificCoolDownTime = this.cooldownTime * _faktor;
            if (this.currentAttackCount <= 0) {
                if (this.currentCooldownTime <= 0) {
                    this.currentCooldownTime = specificCoolDownTime;
                    this.currentAttackCount = this.attackCount;

                    if (Game.entities.find(ent => ent.netId == this.owner).tag == Tag.TAG.ENEMY && Networking.client.idHost == Networking.client.id) {
                        Networking.updateAvatarWeapon(this, this.owner);
                    }
                } else {
                                  this.currentCooldownTime--;
                }
            }

        }
    }

    export enum AIM {
        NORMAL,
        HOMING
    }

}