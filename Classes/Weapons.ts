namespace Weapons {
    export class Weapon {
        cooldownTime: number = 10;
        public currentCooldownTime: number = this.cooldownTime;
        attackCount: number = 1;
        public currentAttackCount: number = this.attackCount;
        bulletType: Bullets.BULLETTYPE = Bullets.BULLETTYPE.STANDARD;
        projectileAmount: number = 1;

        constructor(_cooldownTime: number, _attackCount: number, _bulletType: Bullets.BULLETTYPE, _projectileAmount: number) {
            this.cooldownTime = _cooldownTime;
            this.attackCount = _attackCount;
            this.bulletType = _bulletType;
            this.projectileAmount = _projectileAmount;
        }

        public shoot(_owner: Tag.TAG, _position: ƒ.Vector2, _direciton: ƒ.Vector3, _netId?: number, _sync?: boolean) {
            if (this.currentAttackCount > 0) {
                _direciton.normalize();
                let magazine: Bullets.Bullet[] = this.loadMagazine(_position, _direciton, this.bulletType, this.projectileAmount, _netId);
                this.setBulletDirection(magazine);
                this.fire(_owner, magazine, _sync);
                this.currentAttackCount--;
            }
        }

        fire(_owner: Tag.TAG, _magazine: Bullets.Bullet[], _sync?: boolean) {
            _magazine.forEach(bullet => {
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed)
                bullet.owner = _owner;
                Game.graph.addChild(bullet);
                if (_sync) {
                    Networking.spawnBullet(bullet.direction, bullet.netId);
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

        loadMagazine(_position: ƒ.Vector2, _direction: ƒ.Vector3, _bulletType: Bullets.BULLETTYPE, _amount: number, _netId?: number): Bullets.Bullet[] {
            let magazine: Bullets.Bullet[] = [];
            for (let i = 0; i < _amount; i++) {
                switch (_bulletType) {
                    case Bullets.BULLETTYPE.STANDARD:
                        const standardRef = Game.bulletsJSON.find(bullet => bullet.type == Bullets.BULLETTYPE.STANDARD);
                        magazine.push(new Bullets.Bullet(standardRef.name, standardRef.speed, standardRef.hitPointsScale, standardRef.lifetime, standardRef.knockbackForce, standardRef.killcount, _position, _direction, _netId))
                        break;
                    case Bullets.BULLETTYPE.SLOW:
                        const slowRef = Game.bulletsJSON.find(bullet => bullet.type == Bullets.BULLETTYPE.SLOW);
                        magazine.push(new Bullets.Bullet(slowRef.name, slowRef.speed, slowRef.hitPointsScale, slowRef.lifetime, slowRef.knockbackForce, slowRef.killcount, _position, _direction, _netId));
                        break;
                    case Bullets.BULLETTYPE.MELEE:
                        const meleeRef = Game.bulletsJSON.find(bullet => bullet.type == Bullets.BULLETTYPE.MELEE);
                        magazine.push(new Bullets.Bullet(meleeRef.name, meleeRef.speed, meleeRef.hitPointsScale, meleeRef.lifetime, meleeRef.knockbackForce, meleeRef.killcount, _position, _direction, _netId));
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
                } else {
                    // console.log(this.currentCooldownTime);

                    this.currentCooldownTime--;
                }
            }

        }
    }

}