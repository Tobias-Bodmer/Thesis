namespace Weapons {
    export class Weapon {
        cooldownTime: number = 10;
        public currentCooldownTime: number = this.cooldownTime;
        attackCount: number = 1;
        public currentAttackCount: number = this.attackCount;
        bulletType: BULLETS = BULLETS.NORMAL;
        projectileAmount: number = 2;

        constructor(_cooldownTime: number, _attackCount: number) {
            this.cooldownTime = _cooldownTime;
            this.attackCount = _attackCount;
        }

        public shoot(_position: ƒ.Vector2, _direciton: ƒ.Vector3, _netId?: number, _sync?: boolean) {
            if (this.currentAttackCount > 0) {
                _direciton.normalize();
                let magazine: Bullets.Bullet[] = this.loadMagazine(_position, _direciton, this.bulletType, this.projectileAmount, _netId);
                this.setBulletDirection(magazine);
                this.fire(magazine, _sync);
                this.currentAttackCount--;
            }
        }

        fire(_magazine: Bullets.Bullet[], _sync?: boolean) {
            _magazine.forEach(bullet => {
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed)
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
                default:
                    return _magazine;
            }
        }

        loadMagazine(_position: ƒ.Vector2, _direction: ƒ.Vector3, _bulletType: BULLETS, _amount: number, _netId?: number): Bullets.Bullet[] {
            let magazine: Bullets.Bullet[] = [];
            for (let i = 0; i < _amount; i++) {
                switch (_bulletType) {
                    case BULLETS.NORMAL:
                        magazine.push(new Bullets.Bullet(_position, _direction, _netId))
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

    enum BULLETS {
        NORMAL,
        HIGHSPEED,
        HOMING
    }
}